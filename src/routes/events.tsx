import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchEvents } from "@/lib/db";
import { updateEvent, deleteEvent, createEvent } from "@/lib/founders-data";
import { discoverEvents } from "@/lib/event-discovery.functions";
import { generateEventIntel, type EventIntel } from "@/lib/event-intel.functions";
import { fetchAllTeamCalendarEvents } from "@/lib/google-calendar";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Edit2, Plus, ExternalLink, UserPlus, CheckCircle2, Search, Ban, Loader2 } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddContactDialog } from "@/routes/contacts.index";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useAuth } from "@/lib/auth";
import { format, addYears } from "date-fns";

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

const formatZAR = (amount: number | string | null | undefined) => {
  const numeric = typeof amount === "string" ? Number(amount.replace(/[^0-9.-]/g, "")) : (amount ?? 0);
  return `R${(numeric || 0).toLocaleString("en-ZA")}`;
};

function bookingTotal(e: any): number {
  if (e?.total_cost != null) return Number(e.total_cost) || 0;
  const qty = Number(e?.attendees_count ?? 1) || 1;
  return (Number(e?.cost) || 0) * qty;
}

function Events() {
  const q = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const teamCalendar = useQuery({ queryKey: ["team-calendar-events"], queryFn: fetchAllTeamCalendarEvents });
  const qc = useQueryClient();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [region, setRegion] = useState<"SA" | "Global">("SA");
  const [search, setSearch] = useState("");
  const [captureEventId, setCaptureEventId] = useState<string | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [rejectingEvent, setRejectingEvent] = useState<any | null>(null);
  const [intelFor, setIntelFor] = useState<any | null>(null);
  const handleCapture = (event: any) => { setCaptureEventId(event.id); setShowAddContact(true); };
  const { user } = useAuth();

  const bookMut = useMutation({
    mutationFn: ({ event, qty }: { event: any; qty: number }) => updateEvent(event.id, {
      booked: true,
      attendees_count: qty,
      total_cost: (Number(event.cost) || 0) * qty,
      booked_by: user?.email ?? "Unknown",
      booked_at: new Date().toISOString(),
    } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Booking recorded");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to record booking"),
  });

  const unbookMut = useMutation({
    mutationFn: (event: any) => updateEvent(event.id, {
      booked: false,
      attendees_count: null,
      total_cost: null,
      booked_by: null,
      booked_at: null,
    } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Booking cleared");
    },
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

  const rejectMut = useMutation({
    mutationFn: (id: string) => updateEvent(id, { rejected: true } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      setRejectingEvent(null);
      toast.success("Event rejected — removed from your list");
    },
    onError: async (err: any, id) => {
      // Fall back to hard delete if the rejected column somehow isn't present yet
      console.warn("reject soft-flag failed, falling back to delete", err);
      await deleteEvent(id);
      qc.invalidateQueries({ queryKey: ["events"] });
      setRejectingEvent(null);
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
      // Only toast when the discovered count changes since the user last saw it —
      // avoids "Discovered 30 new events" repeating every visit for the same batch.
      if (count > 0) {
        try {
          const lastShown = Number(localStorage.getItem("events:last-toast-count") || 0);
          if (count !== lastShown) {
            toast.success(`Discovered ${count} new event${count === 1 ? "" : "s"}`, { id: "events-discovered" });
            localStorage.setItem("events:last-toast-count", String(count));
          }
        } catch {
          toast.success(`Discovered ${count} new event${count === 1 ? "" : "s"}`, { id: "events-discovered" });
        }
      }
    },
    onError: (e: any) => toast.error(`Discovery failed: ${e?.message ?? ""}`, { id: "events-discovered" }),

  });

  const ranDiscoveryRef = useRef(false);
  useEffect(() => {
    if (ranDiscoveryRef.current) return;
    ranDiscoveryRef.current = true;
    // Throttle: don't auto-run discovery more than once per 24h. Users can still
    // trigger it manually with the "Discover events" button.
    try {
      const last = Number(localStorage.getItem("events:last-discovery") || 0);
      if (Date.now() - last < 24 * 60 * 60 * 1000) return;
      localStorage.setItem("events:last-discovery", String(Date.now()));
    } catch { /* localStorage unavailable — fall through */ }
    discoverMut.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkedTeamCalendarRef = useRef(false);
  useEffect(() => {
    if (checkedTeamCalendarRef.current) return;
    if (!q.data || !teamCalendar.data) return;
    checkedTeamCalendarRef.current = true;

    const unbooked = q.data.filter((e: any) => !e.booked && e.start_date && !e.rejected);
    if (!unbooked.length || !teamCalendar.data.length) return;

    (async () => {
      let matchedCount = 0;
      for (const e of unbooked) {
        const start = new Date(e.start_date + "T00:00:00Z");
        start.setUTCDate(start.getUTCDate() - 1);
        const end = new Date((e.end_date || e.start_date) + "T23:59:59Z");
        end.setUTCDate(end.getUTCDate() + 1);
        // Require the event's full normalized name (year & punctuation stripped) to appear
        // as a substring of the calendar entry title. A single shared word like "mining"
        // or "summit" is not enough — that produced false "Booked" flags from unrelated
        // internal meetings. Also require the calendar entry to be reasonably long
        // (avoids matching a 1:1 titled just "Mining Indaba prep").
        const normalize = (s: string) =>
          s.toLowerCase().replace(/\b(19|20)\d{2}\b/g, " ").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
        const needle = normalize(e.name);
        if (needle.length < 6) continue;

        const match = teamCalendar.data.find((ev) => {
          const evStart = new Date(ev.start_time);
          if (evStart < start || evStart > end) return false;
          const title = normalize(ev.title ?? "");
          return title.includes(needle);
        });

        if (match) {
          matchedCount++;
          await updateEvent(e.id, { booked: true, booked_by: match.user_email, booked_at: new Date().toISOString() } as any);
        }
      }
      if (matchedCount > 0) {
        qc.invalidateQueries({ queryKey: ["events"] });
        toast.success(`Found ${matchedCount} event${matchedCount === 1 ? "" : "s"} already on a team calendar — marked booked`);
      }
    })();
  }, [q.data, teamCalendar.data, qc]);

  const clearedNewRef = useRef(false);
  useEffect(() => {
    if (clearedNewRef.current) return;
    if (!q.data) return;
    const newOnes = q.data.filter((e: any) => e.is_new);
    if (!newOnes.length) return;
    clearedNewRef.current = true;
    (async () => {
      for (const e of newOnes) {
        await updateEvent(e.id, { is_new: false });
      }
    })();
  }, [q.data]);

  const futureEvents = useMemo(() => {
    let all = (q.data ?? []).filter((e: any) => !e.rejected && new Date(e.end_date || e.start_date) >= new Date());

    const seen = new Set<string>();
    all = all.filter((e: any) => {
      const key = `${(e.name ?? "").trim().toLowerCase()}|${e.start_date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (statusFilter !== "all") all = all.filter((e: any) => e.status === statusFilter);

    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      all = all.filter((e: any) =>
        (e.name ?? "").toLowerCase().includes(needle) ||
        (e.city ?? "").toLowerCase().includes(needle) ||
        (e.country ?? "").toLowerCase().includes(needle) ||
        (e.description ?? "").toLowerCase().includes(needle)
      );
    }

    return all;
  }, [q.data, statusFilter, search]);

  const saEvents = futureEvents.filter((e: any) => e.region === "SA" || (!e.region && e.country?.toLowerCase().includes("south africa")));
  const globalEvents = futureEvents.filter((e: any) => e.region === "Global" || (!e.region && !e.country?.toLowerCase().includes("south africa")));

  const currentYear = new Date().getFullYear();
  const yearTotal = useMemo(() => {
    return (q.data ?? [])
      .filter((e: any) => e.booked && !e.rejected)
      .filter((e: any) => {
        const d = new Date(e.start_date || e.end_date);
        return d.getFullYear() === currentYear;
      })
      .reduce((sum: number, e: any) => sum + bookingTotal(e), 0);
  }, [q.data, currentYear]);

  const formatDate = (date: string) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Discovery"
        title="Current Events"
        description={
          <>
            AI-curated conferences and flagship events worth attending — sector conferences plus bank, tech, and forum events on Mining Indaba calibre.
            {discoverMut.isPending && <span className="block text-xs mt-1">Checking for new events…</span>}
          </>
        }
        actions={
          <Button onClick={() => { setEditingEvent({}); setShowEditModal(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add event
          </Button>
        }
      />

      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="text-xs text-muted-foreground max-w-xs">
            Running total of booked events for the year — updates automatically as you book events below.
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{currentYear} bookings total</div>
            <div className="font-serif text-3xl mt-1">{formatZAR(yearTotal)}</div>
          </div>
        </CardContent>
      </Card>

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
          <div className="flex-1 max-w-sm">
            <label className="text-sm font-medium block mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events by name, city, country…"
                className="pl-8"
              />
            </div>
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
                onReject={(e) => setRejectingEvent(e)}
                onCapture={handleCapture}
                onBook={(event, qty) => bookMut.mutate({ event, qty })}
                onUnbook={(e) => unbookMut.mutate(e)}
                onIntel={(e) => setIntelFor(e)}
                formatDate={formatDate}
              />
            )}
          </TabsContent>

          <TabsContent value="Global" className="mt-4">
            {globalEvents.length === 0 ? <EmptyState /> : (
              <EventsByMonth
                events={globalEvents}
                onEdit={(e) => { setEditingEvent(e); setShowEditModal(true); }}
                onReject={(e) => setRejectingEvent(e)}
                onCapture={handleCapture}
                onBook={(event, qty) => bookMut.mutate({ event, qty })}
                onUnbook={(e) => unbookMut.mutate(e)}
                onIntel={(e) => setIntelFor(e)}
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
                <label className="text-sm font-medium">Start Time</label>
                <Input type="time" value={editingEvent?.start_time ?? ""} onChange={e => setEditingEvent((s: any) => ({ ...s, start_time: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">End Time</label>
                <Input type="time" value={editingEvent?.end_time ?? ""} onChange={e => setEditingEvent((s: any) => ({ ...s, end_time: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Venue</label>
              <Input value={editingEvent?.venue ?? ""} onChange={e => setEditingEvent((s: any) => ({ ...s, venue: e.target.value }))} placeholder="Hotel, conference centre, address" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">City</label>
                <Input value={editingEvent?.city ?? ""} onChange={e => setEditingEvent((s: any) => ({ ...s, city: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Country</label>
                <Input value={editingEvent?.country ?? ""} onChange={e => setEditingEvent((s: any) => ({ ...s, country: e.target.value, region: (e.target.value ?? "").toLowerCase().includes("south africa") ? "SA" : "Global" }))} />
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
            <div>
              <label className="text-sm font-medium">Cost per person (R)</label>
              <Input type="number" value={editingEvent?.cost ?? 0} onChange={e => setEditingEvent((s: any) => ({ ...s, cost: Number(e.target.value) }))} />
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

      <ConfirmDeleteDialog
        open={!!rejectingEvent}
        onClose={() => setRejectingEvent(null)}
        onConfirm={() => rejectingEvent && rejectMut.mutate(rejectingEvent.id)}
        title="Reject event?"
        name={rejectingEvent?.name}
        confirmLabel="Reject"
        description={<>This will remove <strong>{rejectingEvent?.name}</strong> from your Current Events list. The record is kept for audit but hidden from view.</>}
        pending={rejectMut.isPending}
      />

      <EventIntelDialog event={intelFor} onClose={() => setIntelFor(null)} />
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
  onReject: (event: any) => void;
  onCapture: (event: any) => void;
  onBook: (event: any, qty: number) => void;
  onUnbook: (event: any) => void;
  onIntel: (event: any) => void;
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
    <Accordion type="multiple" className="rounded-lg bg-card px-3">
      {groups.map((g) => {
        const monthTotal = g.events.filter((e: any) => e.booked).reduce((s: number, e: any) => s + bookingTotal(e), 0);
        return (
          <AccordionItem key={g.key} value={g.key}>
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2 flex-1">
                <span className="text-sm font-semibold">{g.label}</span>
                <Badge variant="outline" className="text-[10px]">{g.events.length}</Badge>
                {monthTotal > 0 && (
                  <span className="ml-auto mr-2 text-xs text-muted-foreground">
                    Month total: <span className="font-medium text-foreground">{formatZAR(monthTotal)}</span>
                  </span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                {g.events.map((e) => <EventRow key={e.id} e={e} {...rowProps} />)}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

function EventRow({ e, onEdit, onReject, onCapture, onBook, onUnbook, onIntel, formatDate }: {
  e: any;
} & Omit<EventsByMonthProps, "events">) {
  const withinNextYear = (() => {
    const d = new Date(e.start_date || e.end_date);
    return d <= addYears(new Date(), 1);
  })();

  const [bookOpen, setBookOpen] = useState(false);
  const [qty, setQty] = useState<number>(1);
  const costPer = Number(e.cost) || 0;

  const confirmBooking = () => {
    const n = Math.max(1, Math.floor(qty || 1));
    setBookOpen(false);
    if (e.website) window.open(e.website, "_blank", "noopener,noreferrer");
    onBook(e, n);
  };

  return (
    <div className={`rounded-md bg-white text-foreground border border-border p-4 flex flex-wrap items-start justify-between gap-4 ${withinNextYear ? "ring-1 ring-orange-400/50" : ""}`}>
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
          <span className="font-medium text-foreground">{formatZAR(costPer)} <span className="text-muted-foreground font-normal">/ person</span></span>
          {e.who_you_meet && <span className="max-w-xs truncate" title={e.who_you_meet}>Meet: {e.who_you_meet}</span>}
          {e.status && (
            <Badge className={`${OPPORTUNITY_BADGE_COLORS[e.status]?.bg || 'bg-gray-100'} ${OPPORTUNITY_BADGE_COLORS[e.status]?.text || 'text-gray-800'} border-0`}>
              {e.status}
            </Badge>
          )}
          {e.booked && (
            <button
              onClick={() => onUnbook(e)}
              title="Click to clear this booking"
              className="inline-flex items-center gap-1 rounded-full bg-green-600 hover:bg-green-700 text-white text-xs px-2.5 py-0.5 transition-colors"
            >
              <CheckCircle2 className="h-3 w-3" /> Booked{e.attendees_count ? ` · ${e.attendees_count} pax` : ""}{e.booked_by ? ` · ${e.booked_by}` : ""}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 shrink-0">
        <div className="flex flex-col gap-1.5 items-end">
          <div className="flex gap-1.5">
            {!e.booked ? (
              <Popover open={bookOpen} onOpenChange={setBookOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="default" className="h-8 text-xs" disabled={!e.website && costPer === 0}>
                    <ExternalLink className="h-3 w-3 mr-1" /> Book
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium">Book {e.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatZAR(costPer)} per person
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium">How many people attending?</label>
                      <Input
                        type="number"
                        min={1}
                        value={qty}
                        onChange={(ev) => setQty(Number(ev.target.value))}
                        className="mt-1 h-9"
                        autoFocus
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm border-t border-border pt-2">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-semibold">{formatZAR(costPer * (Number(qty) || 0))}</span>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => setBookOpen(false)}>Cancel</Button>
                      <Button size="sm" onClick={confirmBooking} disabled={!qty || qty < 1}>
                        {e.website ? "Continue to booking" : "Confirm"}
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ) : null}
            {e.booked ? (
              <Button size="sm" className="h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white" title={`Add a contact from ${e.name}`} onClick={() => onCapture(e)}>
                <UserPlus className="h-3 w-3 mr-1" /> Add contact
              </Button>
            ) : null}
          </div>
          {e.booked && (
            <div className="text-xs text-muted-foreground mt-1">
              Your booking: <span className="font-semibold text-foreground">{formatZAR(bookingTotal(e))}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" title="AI intelligence" onClick={() => onIntel(e)}>
            <Sparkles className="h-4 w-4 text-primary" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit" onClick={() => onEdit(e)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title="Reject event" onClick={() => onReject(e)}>
            <Ban className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function EventIntelDialog({ event, onClose }: { event: any | null; onClose: () => void }) {
  const intelFn = useServerFn(generateEventIntel);
  const [intel, setIntel] = useState<EventIntel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, EventIntel>>(new Map());

  useEffect(() => {
    if (!event) { setIntel(null); setError(null); return; }
    const cached = cacheRef.current.get(event.id);
    if (cached) { setIntel(cached); return; }
    setLoading(true);
    setError(null);
    setIntel(null);
    intelFn({ data: { event: {
      name: event.name,
      city: event.city,
      country: event.country,
      start_date: event.start_date,
      end_date: event.end_date,
      description: event.description,
      website: event.website,
    } } })
      .then((res) => { cacheRef.current.set(event.id, res); setIntel(res); })
      .catch((e: any) => setError(e?.message ?? "Failed to generate intel"))
      .finally(() => setLoading(false));
  }, [event, intelFn]);

  return (
    <Dialog open={!!event} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI Intelligence — {event?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto space-y-4 pr-1">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Generating brief…
            </div>
          )}
          {error && <div className="text-sm text-destructive">{error}</div>}
          {intel && (
            <>
              <Section label="Overview">{intel.overview}</Section>
              <Section label="Who typically attends">{intel.attendees}</Section>
              <Section label="Agenda themes">
                <ul className="list-disc list-inside space-y-0.5 text-sm">
                  {intel.themes.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </Section>
              <Section label="Notable speakers / organisations">
                <ul className="list-disc list-inside space-y-0.5 text-sm">
                  {intel.notable_speakers.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </Section>
              <Section label="Deal-flow potential">{intel.deal_flow}</Section>
              <Section label="Conversation starters">
                <ul className="list-disc list-inside space-y-0.5 text-sm">
                  {intel.conversation_starters.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </Section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}
