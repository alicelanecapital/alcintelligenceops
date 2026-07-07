import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchEvents } from "@/lib/db";
import { updateEvent, deleteEvent, createEvent } from "@/lib/founders-data";
import { discoverConferences } from "@/lib/event-discovery";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Edit2, Trash2, Plus, ChevronDown, ExternalLink } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/events")({ component: () => <AppShell><Events /></AppShell> });

const SCORING_CATEGORIES = [
  "Cost", "Deal Flow", "Investor Access", "Strategic Partnerships",
  "Government Access", "Market Intelligence", "Industry Insights",
  "Brand Visibility", "Learning & Development", "Long-Term Opportunity"
];

const STATUS_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  "opportunistic": { bg: "bg-blue-100", text: "text-blue-800" },
  "priority": { bg: "bg-purple-100", text: "text-purple-800" },
  "attend": { bg: "bg-green-100", text: "text-green-800" },
  "selective": { bg: "bg-amber-100", text: "text-amber-800" },
};

function Events() {
  const q = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const qc = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [showScoringModal, setShowScoringModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [region, setRegion] = useState<"SA" | "Global">("SA");

  const updateMut = useMutation({
    mutationFn: (data: any) => updateEvent(data.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      setShowScoringModal(false);
      setShowEditModal(false);
      setSelectedEvent(null);
      setEditingEvent(null);
      toast.success("Event updated");
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
      const conferences = await discoverConferences();
      if (conferences.length > 0) {
        for (const conf of conferences.slice(0, 5)) {
          await createEvent({
            name: conf.name,
            city: conf.location?.split(",")[0],
            country: conf.location?.split(",")[1],
            description: conf.description,
            start_date: conf.start_date,
            end_date: conf.end_date,
            cost: conf.cost,
            who_you_meet: conf.who_you_meet,
            website: conf.website,
            is_new: true,
            status: "opportunistic",
            total_score: 0,
          });
        }
      }
      return conferences;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success(`Discovered ${data.length} conferences`);
    },
    onError: () => toast.error("Discovery failed"),
  });

  const futureEvents = useMemo(() => {
    const all = (q.data ?? []).filter((e: any) => new Date(e.end_date || e.start_date) >= new Date());

    // Filter by status
    let filtered = all;
    if (statusFilter !== "all") {
      filtered = filtered.filter((e: any) => e.status === statusFilter);
    }

    // Filter by region
    filtered = filtered.filter((e: any) => e.region === region || !e.region);

    return filtered;
  }, [q.data, statusFilter, region]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-ZA", { day: "short", month: "short", year: "2-digit" });
  };

  const formatCurrency = (amount: number) => {
    return `R${amount?.toLocaleString("en-ZA") || "0"}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Discovery"
        title="Current Events"
        description="AI-curated events worth attending — ranked by strategic fit for your origination thesis."
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

      {futureEvents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center bg-card">
          <Sparkles className="h-8 w-8 mx-auto text-primary" />
          <h3 className="font-serif text-2xl mt-3">No upcoming events</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">Trigger the AI event-discovery run to scan SA and international conferences.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium block mb-1">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
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

          {/* Region Tabs */}
          <Tabs defaultValue="SA" onValueChange={(v) => setRegion(v as "SA" | "Global")}>
            <TabsList>
              <TabsTrigger value="SA">South Africa ({futureEvents.filter((e: any) => e.region === "SA" || !e.region).length})</TabsTrigger>
              <TabsTrigger value="Global">Global ({futureEvents.filter((e: any) => e.region === "Global").length})</TabsTrigger>
            </TabsList>

            <TabsContent value="SA" className="mt-4">
              <div className="rounded-lg border border-border bg-card">
                <EventsTable
                  events={futureEvents}
                  onEdit={(e) => { setEditingEvent(e); setShowEditModal(true); }}
                  onDelete={(id) => deleteMut.mutate(id)}
                  onScore={(e) => { setSelectedEvent(e); setShowScoringModal(true); }}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                />
              </div>
            </TabsContent>

            <TabsContent value="Global" className="mt-4">
              <div className="rounded-lg border border-border bg-card">
                <EventsTable
                  events={futureEvents}
                  onEdit={(e) => { setEditingEvent(e); setShowEditModal(true); }}
                  onDelete={(id) => deleteMut.mutate(id)}
                  onScore={(e) => { setSelectedEvent(e); setShowScoringModal(true); }}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Scoring Modal */}
      <Dialog open={showScoringModal} onOpenChange={setShowScoringModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.name} — Scoring Breakdown</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {SCORING_CATEGORIES.map((cat, i) => {
              const scoreKey = `score_${cat.toLowerCase().replace(/[& ]/g, "_")}`;
              const scoreValue = selectedEvent?.[scoreKey] ?? 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <label className="w-40 text-sm font-medium">{cat}</label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    value={scoreValue}
                    onChange={e => setSelectedEvent((s: any) => ({ ...s, [scoreKey]: Number(e.target.value) }))}
                    className="w-20"
                  />
                </div>
              );
            })}
            <div className="pt-4 border-t font-semibold text-lg">
              Total: {SCORING_CATEGORIES.reduce((sum, cat) => {
                const scoreKey = `score_${cat.toLowerCase().replace(/[& ]/g, "_")}`;
                return sum + (selectedEvent?.[scoreKey] ?? 0);
              }, 0)} / 100
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => updateMut.mutate({ ...selectedEvent, total_score: SCORING_CATEGORIES.reduce((sum, cat) => {
              const scoreKey = `score_${cat.toLowerCase().replace(/[& ]/g, "_")}`;
              return sum + (selectedEvent?.[scoreKey] ?? 0);
            }, 0) })}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingEvent?.id ? "Edit Event" : "Add Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
            <div>
              <label className="text-sm font-medium">Who Will Attend</label>
              <Input value={editingEvent?.who_you_meet ?? ""} onChange={e => setEditingEvent((s: any) => ({ ...s, who_you_meet: e.target.value }))} placeholder="Target attendee types" />
            </div>
            <div>
              <label className="text-sm font-medium">Cost (R)</label>
              <Input type="number" value={editingEvent?.cost ?? 0} onChange={e => setEditingEvent((s: any) => ({ ...s, cost: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Website</label>
              <Input value={editingEvent?.website ?? ""} onChange={e => setEditingEvent((s: any) => ({ ...s, website: e.target.value }))} placeholder="https://" />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={editingEvent?.status ?? "opportunistic"} onValueChange={v => setEditingEvent((s: any) => ({ ...s, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
            <Button onClick={() => {
              if (editingEvent?.id) {
                updateMut.mutate(editingEvent);
              } else {
                createEvent(editingEvent).then(() => {
                  qc.invalidateQueries({ queryKey: ["events"] });
                  setShowEditModal(false);
                  setEditingEvent(null);
                  toast.success("Event created");
                });
              }
            }}>
              {editingEvent?.id ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface EventsTableProps {
  events: any[];
  onEdit: (event: any) => void;
  onDelete: (id: string) => void;
  onScore: (event: any) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
}

function EventsTable({ events, onEdit, onDelete, onScore, formatCurrency, formatDate }: EventsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Event</TableHead>
          <TableHead>Dates</TableHead>
          <TableHead>Attendees</TableHead>
          <TableHead>Cost</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((e: any) => (
          <TableRow key={e.id}>
            <TableCell className="font-medium">
              <div className="flex items-start gap-2">
                {e.is_new && <span className="text-lg">⭐</span>}
                <div>
                  <div className="font-medium">{e.name}</div>
                  <div className="text-xs text-muted-foreground">{e.city}, {e.country}</div>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-sm">
              <div>{formatDate(e.start_date)}</div>
              <div className="text-xs text-muted-foreground">to {formatDate(e.end_date || e.start_date)}</div>
            </TableCell>
            <TableCell className="text-xs max-w-xs line-clamp-2">{e.who_you_meet || "—"}</TableCell>
            <TableCell className="font-medium">{formatCurrency(e.cost || 0)}</TableCell>
            <TableCell>
              <Button size="sm" variant="outline" onClick={() => onScore(e)}>
                {e.total_score ?? 0} / 100 <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </TableCell>
            <TableCell>
              <Badge className={`${STATUS_BADGE_COLORS[e.status]?.bg || 'bg-gray-100'} ${STATUS_BADGE_COLORS[e.status]?.text || 'text-gray-800'} border-0`}>
                {e.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex gap-1 justify-end">
                {e.website && (
                  <Button
                    size="sm"
                    variant="default"
                    className="h-8 text-xs"
                    onClick={() => window.open(e.website, '_blank')}
                  >
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
