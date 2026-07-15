import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchEvents } from "@/lib/db";
import { updateEvent, deleteEvent, createEvent } from "@/lib/founders-data";
import { discoverEvents } from "@/lib/event-discovery.functions";
import { fetchAllTeamCalendarEvents } from "@/lib/google-calendar";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Edit2, Trash2, Plus, ExternalLink, UserPlus, CheckCircle2 } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddContactDialog } from "@/routes/contacts.index";
import { useAuth } from "@/lib/auth";
import { checkEventBookedInCalendar } from "@/lib/calendar-sync.functions";
import { format } from "date-fns";

export const Route = createFileRoute("/events")({ component: () => <AppShell><Events /></AppShell> });

const OPPORTUNITY_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  High: { bg: "bg-green-100", text: "text-green-800" },
  Medium: { bg: "bg-amber-100", text: "text-amber-800" },
  Low: { bg: "bg-gray-100", text: "text-gray-700" },
};

function monthKey(dateStr: string) {
  const d = new Date(dateStr);
  return { key: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") };
}

function Events() {
  const q = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const teamCalendar = useQuery({ queryKey: ["team-calendar-events"], queryFn: fetchAllTeamCalendarEvents });
  const qc = useQueryClient();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [region, setRegion] = useState<"SA" | "Global">("SA");
  const [captureEventId, setCaptureEventId] = useState<string | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const handleCapture = (event: any) => { setCaptureEventId(event.id); setShowAddContact(true); };
  const { user } = useAuth();

  const bookMut = useMutation({
    mutationFn: (event: any) => updateEvent(event.id, {
      booked: !event.booked,
      booked_by: !event.booked ? (user?.email ?? "Unknown") : null,
      booked_at: !event.booked ? new Date().toISOString() : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Booking status updated");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update booking status"),
  });

  const checkCalendarFn = useServerFn(checkEventBookedInCalendar);
  const checkCalendarMut = useMutation({
    mutationFn: (event: any) => checkCalendarFn({ data: { eventId: event.id, eventName: event.name, startDate: event.start_date, endDate: event.end_date } }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["events"] });
      if (result.booked) toast.success(`Found "${result.matchedTitle}" on your calendar — marked booked`);
      else if (result.reason === "not_connected") toast.error("Connect your Google account on the Calendar page first");
      else toast("No matching calendar event found yet");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to check calendar"),
  });

  const discover = useServerFn(discoverEvents);

  const updateMut = useMutation({
    mutationFn: (data: any) => (data.id ? updateEvent(data.id, data) : createEvent(data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      setShowEditModal(false);
      setEditingEvent(null);
      toast.success("Event saved");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event deleted");
    },
  });

  const discoverMut = useMutation({
    mutationFn: async () => {
      const { sa, global } = await discover();
      const all = [...sa, ...global];
      for (const conf of all) {
        await createEvent({
          name: conf.name,
          city: conf.city,
          country: conf.country,
          description: conf.description,
          start_date: conf.start_date,
          end_date: conf.end_date,
          cost: conf.cost,
          who_you_meet: conf.who_you_meet,
          website: conf.website,
          is_new: true,
          status: "Medium",
          region: conf.region,
        } as any);
      }
      return all.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["events"] });
      if (count > 0) toast.success(`Discovered ${count} new conference${count === 1 ? "" : "s"}`);
    },
    onError: (e: any) => toast.error(`Discovery failed: ${e?.message ?? ""}`),
  });

  // Run discovery automatically every time this screen is opened, instead of requiring a manual button click.
  const ranDiscoveryRef = useRef(false);
  useEffect(() => {
    if (ranDiscoveryRef.current) return;
    ranDiscoveryRef.current = true;
    discoverMut.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Automatically match unbooked events against every team member's synced Google Calendar
  // (title + date-range match), marking them booked without needing a manual per-row click.
  const checkedTeamCalendarRef = useRef(false);
  useEffect(() => {
    if (checkedTeamCalendarRef.current) return;
    if (!q.data || !teamCalendar.data) return;
    checkedTeamCalendarRef.current = true;

    const unbooked = q.data.filter((e: any) => !e.booked && e.start_date);
    if (!unbooked.length || !teamCalendar.data.length) return;

    (async () => {
      let matchedCount = 0;
      for (const e of unbooked) {
        const start = new Date(e.start_date + "T00:00:00Z");
        start.setUTCDate(start.getUTCDate() - 1);
        const end = new Date((e.end_date || e.start_date) + "T23:59:59Z");
        end.setUTCDate(end.getUTCDate() + 1);
        const nameWords: string[] = e.name.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);

        const match = teamCalendar.data.find((ev) => {
          const evStart = new Date(ev.start_time);
          if (evStart < start || evStart > end) return false;
          const title = (ev.title ?? "").toLowerCase();
          return nameWords.some((w) => title.includes(w));
        });

        if (match) {
          matchedCount++;
          await updateEvent(e.id, { booked: true, booked_by: match.user_email, booked_at: new Date().toISOString() });
        }
      }
      if (matchedCount > 0) {
        qc.invalidateQueries({ queryKey: ["events"] });
        toast.success(`Found ${matchedCount} event${matchedCount === 1 ? "" : "s"} already on a team calendar — marked booked`);
      }
    })();
  }, [q.data, teamCalendar.data, qc]);

  const futureEvents = useMemo(() => {
    const all = (q.data ?? []).filter((e: any) => new Date(e.end_date || e.start_date) >= new Date());
    if (statusFilter === "all") return all;
    return all.filter((e: any) => e.status === statusFilter);
  }, [q.data, statusFilter]);

  const saEvents = futureEvents.filter((e: any) => e.region === "SA" || (!e.region && e.country?.toLowerCase().includes("south africa")));
  const globalEvents = futureEvents.filter((e: any) => e.region === "Global" || (!e.region && !e.country?.toLowerCase().includes("south africa")));

  const formatDate = (date: string) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatCurrency = (amount: number | string) => {
    const numeric = typeof amount === 'string' ? Number(amount.replace(/[^0-9.-]/g, '')) : amount;
    return `R${(numeric || 0).toLocaleString('en-ZA')}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Discovery"
        title="Current Events"
        description="AI-curated conferences worth attending — sector-specific SA and global events on Mining Indaba calibre."
        actions={
          <div className="flex items-center gap-3">
            {discoverMut.isPending && <span className="text-xs text-muted-foreground">Checking for new events…</span>}
            <Button variant="outline" onClick={() => { setEditingEvent({}); setShowEditModal(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add event
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
        <div className="flex gap-4 items-end">
          <div>
            <label className="text-sm font-medium block mb-1">Opportunity</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All levels" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={region} onValueChange={(v) => setRegion(v as "SA" | "Global")}>
          <TabsList>
            <TabsTrigger value="SA">South Africa ({saEvents.length})</TabsTrigger>
            <TabsTrigger value="Global">Global ({globalEvents.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="SA" className="mt-4">
            {saEvents.length === 0 ? <EmptyState /> : (
              <EventsByMonth
                events={saEvents}
                onEdit={(e) => { setEditingEvent(e); setShowEditModal(true); }}
                onDelete={(id) => deleteMut.mutate(id)}
                onCapture={handleCapture}
                onToggleBooked={(e) => bookMut.mutate(e)}
                onCheckCalendar={(e) => checkCalendarMut.mutate(e)}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
              />
            )}
          </TabsContent>

          <TabsContent value="Global" className="mt-4">
            {globalEvents.length === 0 ? <EmptyState /> : (
              <EventsByMonth
                events={globalEvents}
                onEdit={(e) => { setEditingEvent(e); setShowEditModal(true); }}
                onDelete={(id) => deleteMut.mutate(id)}
                onCapture={handleCapture}
                onToggleBooked={(e) => bookMut.mutate(e)}
                onCheckCalendar={(e) => checkCalendarMut.mutate(e)}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingEvent?.id ? "Edit Event" : "Add Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
            <div>
              <label className="text-sm font-medium">Event Name</label>
              <Input value={editingEvent?.name ?? ""} onChange={e => setEditingEvent((s: any) => ({ ...s, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input type="date" value={editingEvent?.start_date ?? ""} onChange={e => setEditingEvent((s: any) => ({ ...s, start_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input type="date" value={editingEvent?.end_date ?? ""} onChange={e => setEditingEvent((s: any) => ({ ...s, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">City</label>
                <Input value={editingEvent?.city ?? ""} onChange={e => setEditingEvent((s: any) => ({ ...s, city: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Country</label>
                <Input value={editingEvent?.country ?? ""} onChange={e => setEditingEvent((s: any) => ({ ...s, country: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Who Will Attend</label>
              <Input value={editingEvent?.who_you_meet ?? ""} onChange={e => setEditingEvent((s: any) => ({ ...s, who_you_meet: e.target.value }))} placeholder="Key attendees, speakers, target audience" />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input value={editingEvent?.description ?? ""} onChange={e => setEditingEvent((s: any) => ({ ...s, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Cost (R)</label>
                <Input type="number" value={editingEvent?.cost ?? 0} onChange={e => setEditingEvent((s: any) => ({ ...s, cost: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Region</label>
                <Select value={editingEvent?.region ?? "SA"} onValueChange={v => setEditingEvent((s: any) => ({ ...s, region: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SA">South Africa</SelectItem>
                    <SelectItem value="Global">Global</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Website / Booking URL</label>
              <Input value={editingEvent?.website ?? ""} onChange={e => setEditingEvent((s: any) => ({ ...s, website: e.target.value }))} placeholder="https://" />
            </div>
            <div>
              <label className="text-sm font-medium">Opportunity</label>
              <Select value={editingEvent?.status ?? "Medium"} onValueChange={v => setEditingEvent((s: any) => ({ ...s, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={() => updateMut.mutate(editingEvent)} disabled={updateMut.isPending}>
              {editingEvent?.id ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddContactDialog
        open={showAddContact}
        onClose={() => setShowAddContact(false)}
        defaultEventId={captureEventId ?? undefined}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border p-12 text-center bg-card">
      <Sparkles className="h-8 w-8 mx-auto text-primary" />
      <h3 className="font-serif text-2xl mt-3">No upcoming events</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">Event discovery runs automatically whenever you open this screen.</p>
    </div>
  );
}

interface EventsByMonthProps {
  events: any[];
  onEdit: (event: any) => void;
  onDelete: (id: string) => void;
  onCapture: (event: any) => void;
  onToggleBooked: (event: any) => void;
  onCheckCalendar: (event: any) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
}

function EventsByMonth({ events, ...rowProps }: EventsByMonthProps) {
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; events: any[] }>();
    for (const e of events) {
      const { key, label } = monthKey(e.start_date || e.end_date);
      if (!map.has(key)) map.set(key, { label, events: [] });
      map.get(key)!.events.push(e);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, g]) => ({ key, ...g }));
  }, [events]);

  return (
    <Accordion type="multiple" className="rounded-lg border border-border bg-card px-3">
      {groups.map((g) => (
        <AccordionItem key={g.key} value={g.key}>
          <AccordionTrigger className="text-sm">
            <span className="flex items-center gap-2">
              <span className="font-serif text-base">{g.label}</span>
              <Badge variant="outline" className="text-[10px]">{g.events.length}</Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              {g.events.map((e) => <EventRow key={e.id} e={e} {...rowProps} />)}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function EventRow({ e, onEdit, onDelete, onCapture, onToggleBooked, onCheckCalendar, formatCurrency, formatDate }: {
  e: any;
} & Omit<EventsByMonthProps, "events">) {
  return (
    <div className="rounded-md border border-border p-4 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          {e.is_new && <span className="text-lg" title="Newly discovered">⭐</span>}
          <div className="min-w-0">
            <div className="font-medium">{e.name}</div>
            <div className="text-xs text-muted-foreground">{[e.city, e.country].filter(Boolean).join(", ")}</div>
            {e.description && <div className="text-xs text-muted-foreground line-clamp-2 mt-1 max-w-xl">{e.description}</div>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
          <span>{formatDate(e.start_date)} – {formatDate(e.end_date)}</span>
          <span className="font-medium text-foreground">{formatCurrency(e.cost || 0)}</span>
          {e.who_you_meet && <span className="max-w-xs truncate" title={e.who_you_meet}>Meet: {e.who_you_meet}</span>}
          {e.status && (
            <Badge className={`${OPPORTUNITY_BADGE_COLORS[e.status]?.bg || 'bg-gray-100'} ${OPPORTUNITY_BADGE_COLORS[e.status]?.text || 'text-gray-800'} border-0`}>
              {e.status}
            </Badge>
          )}
          {e.booked && (
            <Badge className="bg-green-600 text-white border-0 gap-1">
              <CheckCircle2 className="h-3 w-3" /> Booked{e.booked_by ? ` · ${e.booked_by}` : ""}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 shrink-0">
        <div className="flex flex-col gap-1.5">
          {e.website && (
            <Button size="sm" variant="default" className="h-8 text-xs" onClick={() => window.open(e.website, '_blank')}>
              <ExternalLink className="h-3 w-3 mr-1" /> Book
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8 text-xs" title={`Add a contact from ${e.name}`} onClick={() => onCapture(e)}>
            <UserPlus className="h-3 w-3 mr-1" /> Add contact
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          <Button
            size="sm"
            variant={e.booked ? "default" : "outline"}
            className={`h-8 text-xs ${e.booked ? "bg-green-600 hover:bg-green-700" : ""}`}
            title={e.booked ? `Booked by ${e.booked_by ?? "a team member"}` : "Mark as booked manually"}
            onClick={() => onToggleBooked(e)}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" /> {e.booked ? "Booked" : "Mark booked"}
          </Button>
          {!e.booked && (
            <Button size="sm" variant="outline" className="h-8 text-xs" title="Check your connected Google Calendar for a matching event" onClick={() => onCheckCalendar(e)}>
              Check calendar
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(e)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onDelete(e.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
