import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchEvents } from "@/lib/db";
import { updateEvent, deleteEvent, createEvent } from "@/lib/founders-data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sparkles, Edit2, Trash2, Plus, ChevronDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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

  const updateMut = useMutation({
    mutationFn: (data: any) => updateEvent(data.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      setShowScoringModal(false);
      setShowEditModal(false);
      setSelectedEvent(null);
      setEditingEvent(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });

  const futureEvents = (q.data ?? []).filter((e: any) => new Date(e.end_date || e.start_date) >= new Date());

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Discovery"
        title="Events"
        description="AI-curated events worth attending — ranked by strategic fit for your origination thesis."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setEditingEvent({}); setShowEditModal(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add event
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => { toast.success("Event discovery initiated. Check back in a few minutes."); }}>
              <Sparkles className="h-4 w-4 mr-2" /> Run discovery
            </Button>
          </div>
        }
      />
      {futureEvents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center bg-card">
          <Sparkles className="h-8 w-8 mx-auto text-primary" />
          <h3 className="font-serif text-2xl mt-3">No upcoming events</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">Trigger the AI event-discovery run to scan SA startup, VC and MSME calendars.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Event</TableHead><TableHead>Description</TableHead><TableHead>Date</TableHead>
              <TableHead>Cost</TableHead><TableHead>Score</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {futureEvents.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-start gap-2">
                      {e.is_new && <span className="text-lg">⭐</span>}
                      <div>
                        <div>{e.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{e.city}, {e.country}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs line-clamp-2">{e.description || e.who_you_meet || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{e.start_date}</TableCell>
                  <TableCell className="text-muted-foreground">${e.cost?.toLocaleString() || 0}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => { setSelectedEvent(e); setShowScoringModal(true); }}>
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
                      <Button size="sm" variant="default" className="h-8 text-xs" onClick={() => { /* TODO: Attend with Gmail OAuth */ }}>
                        Attend
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { setEditingEvent(e); setShowEditModal(true); }}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(e.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Scoring drill-down modal */}
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
                  <span className="text-sm text-muted-foreground">/10</span>
                </div>
              );
            })}
            <div className="pt-4 border-t flex justify-between items-center font-medium">
              <span>Total Score</span>
              <span className="text-lg">{selectedEvent ? SCORING_CATEGORIES.reduce((sum, cat) => {
                const key = `score_${cat.toLowerCase().replace(/[& ]/g, "_")}`;
                return sum + (selectedEvent[key] ?? 0);
              }, 0) : 0} / 100</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScoringModal(false)}>Cancel</Button>
            <Button onClick={() => updateMut.mutate(selectedEvent)} disabled={updateMut.isPending}>
              {updateMut.isPending ? "Saving…" : "Save Scores"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit event modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingEvent?.id ? "Edit Event" : "Add Event"}</DialogTitle>
          </DialogHeader>
          {editingEvent && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Event Name</label>
                <Input value={editingEvent.name ?? ""} onChange={e => setEditingEvent((s: any) => ({ ...s, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <Input type="date" value={editingEvent.start_date ?? ""} onChange={e => setEditingEvent((s: any) => ({ ...s, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <Input type="date" value={editingEvent.end_date ?? ""} onChange={e => setEditingEvent((s: any) => ({ ...s, end_date: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">City</label>
                  <Input value={editingEvent.city ?? ""} onChange={e => setEditingEvent((s: any) => ({ ...s, city: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Country</label>
                  <Input value={editingEvent.country ?? ""} onChange={e => setEditingEvent((s: any) => ({ ...s, country: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Cost</label>
                <Input value={editingEvent.cost ?? ""} onChange={e => setEditingEvent((s: any) => ({ ...s, cost: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <select value={editingEvent.status ?? ""} onChange={e => setEditingEvent((s: any) => ({ ...s, status: e.target.value }))} className="w-full px-3 py-2 border rounded-md text-sm">
                  <option value="opportunistic">Opportunistic</option>
                  <option value="priority">Priority</option>
                  <option value="attend">Attend</option>
                  <option value="selective">Selective</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea value={editingEvent.description ?? ""} onChange={e => setEditingEvent((s: any) => ({ ...s, description: e.target.value }))} className="w-full px-3 py-2 border rounded-md text-sm" rows={2} />
              </div>
              <div>
                <label className="text-sm font-medium">Who You'll Meet</label>
                <textarea value={editingEvent.who_you_meet ?? ""} onChange={e => setEditingEvent((s: any) => ({ ...s, who_you_meet: e.target.value }))} className="w-full px-3 py-2 border rounded-md text-sm" rows={2} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={editingEvent.is_new ?? false} onChange={e => setEditingEvent((s: any) => ({ ...s, is_new: e.target.checked }))} className="rounded" />
                <label className="text-sm font-medium">Mark as New (AI Discovered)</label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={() => updateMut.mutate(editingEvent)} disabled={updateMut.isPending}>
              {updateMut.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
