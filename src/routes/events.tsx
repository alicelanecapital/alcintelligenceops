import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchEvents } from "@/lib/db";
import { updateEvent, deleteEvent, createEvent } from "@/lib/founders-data";
import { discoverEvents } from "@/lib/event-discovery.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Edit2, Trash2, Plus, ExternalLink } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/events")({ component: () => <AppShell><Events /></AppShell> });

const STATUS_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  opportunistic: { bg: "bg-blue-100", text: "text-blue-800" },
  priority: { bg: "bg-purple-100", text: "text-purple-800" },
  attend: { bg: "bg-green-100", text: "text-green-800" },
  selective: { bg: "bg-amber-100", text: "text-amber-800" },
};

function Events() {
  const q = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const qc = useQueryClient();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [region, setRegion] = useState<"SA" | "Global">("SA");

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
          status: "opportunistic",
          region: conf.region,
        } as any);
      }
      return all.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success(`Discovered ${count} conferences`);
    },
    onError: (e: any) => toast.error(`Discovery failed: ${e?.message ?? ""}`),
  });

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

  const formatCurrency = (amount: number) => `R${(amount ?? 0).toLocaleString("en-ZA")}`;

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Discovery"
        title="Current Events"
        description="AI-curated conferences worth attending — sector-specific SA and global events on Mining Indaba calibre."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setEditingEvent({}); setShowEditModal(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add event
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => discoverMut.mutate()}
              disabled={discoverMut.isPending}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {discoverMut.isPending ? "Discovering..." : "Run discovery"}
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
        <div className="flex gap-4 items-end">
          <div>
            <label className="text-sm font-medium block mb-1">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="opportunistic">Opportunistic</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="attend">Attend</SelectItem>
                <SelectItem value="selective">Selective</SelectItem>
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
              <div className="rounded-lg border border-border bg-card">
                <EventsTable events={saEvents} onEdit={(e) => { setEditingEvent(e); setShowEditModal(true); }} onDelete={(id) => deleteMut.mutate(id)} formatCurrency={formatCurrency} formatDate={formatDate} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="Global" className="mt-4">
            {globalEvents.length === 0 ? <EmptyState /> : (
              <div className="rounded-lg border border-border bg-card">
                <EventsTable events={globalEvents} onEdit={(e) => { setEditingEvent(e); setShowEditModal(true); }} onDelete={(id) => deleteMut.mutate(id)} formatCurrency={formatCurrency} formatDate={formatDate} />
              </div>
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
              <label className="text-sm font-medium">Status</label>
              <Select value={editingEvent?.status ?? "opportunistic"} onValueChange={v => setEditingEvent((s: any) => ({ ...s, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="opportunistic">Opportunistic</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="attend">Attend</SelectItem>
                  <SelectItem value="selective">Selective</SelectItem>
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
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border p-12 text-center bg-card">
      <Sparkles className="h-8 w-8 mx-auto text-primary" />
      <h3 className="font-serif text-2xl mt-3">No upcoming events</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">Trigger the AI event-discovery run to scan SA and international conferences.</p>
    </div>
  );
}

interface EventsTableProps {
  events: any[];
  onEdit: (event: any) => void;
  onDelete: (id: string) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
}

function EventsTable({ events, onEdit, onDelete, formatCurrency, formatDate }: EventsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Event</TableHead>
          <TableHead>Start</TableHead>
          <TableHead>End</TableHead>
          <TableHead>Who Will Attend</TableHead>
          <TableHead>Cost</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((e: any) => (
          <TableRow key={e.id}>
            <TableCell className="font-medium max-w-xs">
              <div className="flex items-start gap-2">
                {e.is_new && <span className="text-lg" title="Newly discovered">⭐</span>}
                <div>
                  <div className="font-medium">{e.name}</div>
                  <div className="text-xs text-muted-foreground">{[e.city, e.country].filter(Boolean).join(", ")}</div>
                  {e.description && <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{e.description}</div>}
                </div>
              </div>
            </TableCell>
            <TableCell className="text-sm whitespace-nowrap">{formatDate(e.start_date)}</TableCell>
            <TableCell className="text-sm whitespace-nowrap">{formatDate(e.end_date)}</TableCell>
            <TableCell className="text-xs max-w-xs" title={e.who_you_meet || ""}>
              <div className="line-clamp-3">{e.who_you_meet || "—"}</div>
            </TableCell>
            <TableCell className="font-medium whitespace-nowrap">{formatCurrency(e.cost || 0)}</TableCell>
            <TableCell>
              {e.status && (
                <Badge className={`${STATUS_BADGE_COLORS[e.status]?.bg || 'bg-gray-100'} ${STATUS_BADGE_COLORS[e.status]?.text || 'text-gray-800'} border-0`}>
                  {e.status}
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex gap-1 justify-end">
                {e.website && (
                  <Button size="sm" variant="default" className="h-8 text-xs" onClick={() => window.open(e.website, '_blank')}>
                    <ExternalLink className="h-3 w-3 mr-1" /> Book
                  </Button>
                )}
                <Button size="icon" variant="ghost" onClick={() => onEdit(e)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onDelete(e.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
