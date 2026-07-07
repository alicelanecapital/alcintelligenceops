import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchOrgs, type OrgRow } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, Mail, Phone, Linkedin, Edit2, Trash2 } from "lucide-react";
import { fetchContactsByOrg, deleteOrganisation, updateContact, createOrganisation, updateOrganisation } from "@/lib/founders-data";
import { toast } from "sonner";

export const Route = createFileRoute("/ecosystem")({ component: () => <AppShell><Ecosystem /></AppShell> });

const CALL_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  "Not Started": { bg: "bg-gray-100", text: "text-gray-800" },
  "Scheduled": { bg: "bg-blue-100", text: "text-blue-800" },
  "Call Back": { bg: "bg-yellow-100", text: "text-yellow-800" },
  "Called": { bg: "bg-purple-100", text: "text-purple-800" },
  "Opportunity": { bg: "bg-green-100", text: "text-green-800" },
};

function EcosystemCard({ org, onEdit }: { org: OrgRow; onEdit: (o: OrgRow) => void }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [editingContact, setEditingContact] = useState<any | null>(null);
  const contactsQuery = useQuery({
    queryKey: ["contacts", org.id],
    queryFn: () => fetchContactsByOrg(org.id),
    enabled: expanded,
  });
  const deleteMut = useMutation({
    mutationFn: () => deleteOrganisation(org.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orgs", "ecosystem"] });
      toast.success("Organisation deleted");
    },
  });
  const updateMut = useMutation({
    mutationFn: (data: any) => updateContact(data.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts", org.id] });
      setEditingContact(null);
    },
  });

  const contacts = (contactsQuery.data ?? []) as any[];

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="font-serif text-lg leading-tight">{org.name}</div>
            <div className="flex gap-1">
              {org.fit_rating && <Badge className="bg-primary text-primary-foreground shrink-0">{org.fit_rating}</Badge>}
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onEdit(org)}>
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { if (confirm(`Delete "${org.name}"?`)) deleteMut.mutate(); }}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">{org.category}</div>
          {org.purpose && <p className="text-xs text-foreground/80 mt-2 line-clamp-2">{org.purpose}</p>}
          {org.who_they_serve && <p className="text-[11px] text-muted-foreground mt-1 italic line-clamp-1">{org.who_they_serve}</p>}

          {/* Always show contacts - no expand/collapse */}
          {contacts.length > 0 && (
            <div className="mt-3 pt-3 border-t space-y-2">
              <div className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-2">
                {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
              </div>
              {contacts.map(c => (
                <div key={c.id} className="text-xs p-3 bg-muted rounded space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-sm">{c.name}</div>
                      {c.role && <div className="text-muted-foreground font-medium text-[11px]">{c.role}</div>}
                    </div>
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setEditingContact(c)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                  {c.call_status && (
                    <div>
                      <Badge className={`${CALL_STATUS_COLORS[c.call_status]?.bg || 'bg-gray-100'} ${CALL_STATUS_COLORS[c.call_status]?.text || 'text-gray-800'} border-0 text-[10px]`}>
                        {c.call_status}
                      </Badge>
                    </div>
                  )}
                  <div className="space-y-1">
                    {c.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" /> <a href={`mailto:${c.email}`} className="text-primary hover:underline text-[10px]">{c.email}</a></div>}
                    {c.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" /> <span className="text-[10px]">{c.phone}</span></div>}
                    {c.website && <div className="flex items-center gap-1"><a href={c.website} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate text-[10px]">{c.website}</a></div>}
                    {c.linkedin && <div className="flex items-center gap-1"><Linkedin className="h-3 w-3 text-muted-foreground" /> <a href={c.linkedin} target="_blank" rel="noreferrer" className="text-primary hover:underline text-[10px]">LinkedIn</a></div>}
                  </div>
                  {c.description && <div className="text-[10px] text-muted-foreground italic line-clamp-2 mt-2">{c.description}</div>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Contact: {editingContact?.name}</DialogTitle>
          </DialogHeader>
          {editingContact && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input value={editingContact.name ?? ""} onChange={e => setEditingContact((s: any) => ({ ...s, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Role</label>
                <Input value={editingContact.role ?? ""} onChange={e => setEditingContact((s: any) => ({ ...s, role: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Source</label>
                <select value={editingContact.source ?? ""} onChange={e => setEditingContact((s: any) => ({ ...s, source: e.target.value }))} className="w-full px-3 py-2 border rounded-md text-sm">
                  <option value="">— Select —</option>
                  <option value="cold call">Cold Call</option>
                  <option value="personal contact">Personal Contact</option>
                  <option value="ecosystem">Ecosystem</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Call Status</label>
                <select value={editingContact.call_status ?? ""} onChange={e => setEditingContact((s: any) => ({ ...s, call_status: e.target.value }))} className="w-full px-3 py-2 border rounded-md text-sm">
                  <option value="Not Started">Not Started</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Call Back">Call Back</option>
                  <option value="Called">Called</option>
                  <option value="Opportunity">Opportunity</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Last Call Date</label>
                <Input type="date" value={editingContact.last_call_date ?? ""} onChange={e => setEditingContact((s: any) => ({ ...s, last_call_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Call Notes</label>
                <textarea value={editingContact.last_call_notes ?? ""} onChange={e => setEditingContact((s: any) => ({ ...s, last_call_notes: e.target.value }))} className="w-full px-3 py-2 border rounded-md text-sm" rows={2} />
              </div>
              <div>
                <label className="text-sm font-medium">Website</label>
                <Input value={editingContact.website ?? ""} onChange={e => setEditingContact((s: any) => ({ ...s, website: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea value={editingContact.description ?? ""} onChange={e => setEditingContact((s: any) => ({ ...s, description: e.target.value }))} className="w-full px-3 py-2 border rounded-md text-sm" rows={2} placeholder="What does this company do?" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingContact(null)}>Cancel</Button>
            <Button onClick={() => updateMut.mutate(editingContact)} disabled={updateMut.isPending}>
              {updateMut.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Ecosystem() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["orgs","ecosystem"], queryFn: () => fetchOrgs("ecosystem") });
  const orgs = q.data ?? [];
  const [search, setSearch] = useState("");
  const [fitFilter, setFitFilter] = useState<string | null>(null);
  const [viewType, setViewType] = useState<"cards" | "list">("cards");
  const [editingOrg, setEditingOrg] = useState<any | null>(null);
  const [showOrgModal, setShowOrgModal] = useState(false);

  const saveOrgMut = useMutation({
    mutationFn: (data: any) => data.id ? updateOrganisation(data.id, data) : createOrganisation({ ...data, kind: "ecosystem" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orgs", "ecosystem"] });
      setShowOrgModal(false);
      setEditingOrg(null);
      toast.success("Organisation saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const filtered = useMemo(() => orgs.filter(o => {
    const matchesSearch = !search || o.name.toLowerCase().includes(search.toLowerCase()) || (o.category ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesFit = !fitFilter || (o.fit_rating ?? "").toLowerCase().includes(fitFilter.toLowerCase());
    return matchesSearch && matchesFit;
  }), [orgs, search, fitFilter]);
  const fitRatings = Array.from(new Set(orgs.map(o => o.fit_rating).filter(Boolean))) as string[];

  const openEdit = (o: any) => { setEditingOrg(o); setShowOrgModal(true); };
  const openAdd = () => { setEditingOrg({}); setShowOrgModal(true); };

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Map"
        title="Ecosystem"
        description="South Africa's origination ecosystem — foundations, incubators, funds, hubs, universities, networks and government."
        actions={<Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add organisation</Button>}
      />
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <Input placeholder="Search organisations…" className="max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={fitFilter ?? ""} onChange={(e) => setFitFilter(e.target.value || null)} className="px-3 py-2 border rounded-md text-sm">
          <option value="">All fit levels</option>
          {fitRatings.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <div className="flex gap-2 ml-auto">
          <Button size="sm" variant={viewType === "cards" ? "default" : "outline"} onClick={() => setViewType("cards")}>Cards</Button>
          <Button size="sm" variant={viewType === "list" ? "default" : "outline"} onClick={() => setViewType("list")}>List</Button>
        </div>
        <div className="text-xs text-muted-foreground w-full">{filtered.length} of {orgs.length}</div>
      </div>
      <div className="mt-6">
        {viewType === "cards" ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(o => (
              <EcosystemCard key={o.id} org={o} onEdit={openEdit} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card">
            <Table>
              <TableHeader><TableRow><TableHead>Organisation</TableHead><TableHead>Category</TableHead><TableHead>Fit</TableHead><TableHead>Status</TableHead><TableHead>Purpose</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.name}</TableCell>
                    <TableCell><Badge variant="outline">{o.category}</Badge></TableCell>
                    <TableCell>{o.fit_rating}</TableCell>
                    <TableCell className="text-muted-foreground">{o.status ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-md line-clamp-2">{o.purpose}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(o)}><Edit2 className="h-3 w-3" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={showOrgModal} onOpenChange={setShowOrgModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{editingOrg?.id ? "Edit Organisation" : "Add Organisation"}</DialogTitle></DialogHeader>
          {editingOrg && (
            <div className="space-y-4 max-h-[65vh] overflow-y-auto">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input value={editingOrg.name ?? ""} onChange={e => setEditingOrg((s: any) => ({ ...s, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Input value={editingOrg.category ?? ""} onChange={e => setEditingOrg((s: any) => ({ ...s, category: e.target.value }))} placeholder="Foundation, Incubator, Fund…" />
                </div>
                <div>
                  <label className="text-sm font-medium">Industry</label>
                  <Input value={editingOrg.industry ?? ""} onChange={e => setEditingOrg((s: any) => ({ ...s, industry: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Purpose</label>
                <Input value={editingOrg.purpose ?? ""} onChange={e => setEditingOrg((s: any) => ({ ...s, purpose: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Who They Serve</label>
                <Input value={editingOrg.who_they_serve ?? ""} onChange={e => setEditingOrg((s: any) => ({ ...s, who_they_serve: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Fit Rating</label>
                  <Input value={editingOrg.fit_rating ?? ""} onChange={e => setEditingOrg((s: any) => ({ ...s, fit_rating: e.target.value }))} placeholder="High, Medium, Low" />
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Input value={editingOrg.status ?? ""} onChange={e => setEditingOrg((s: any) => ({ ...s, status: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">City</label>
                  <Input value={editingOrg.city ?? ""} onChange={e => setEditingOrg((s: any) => ({ ...s, city: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Province</label>
                  <Input value={editingOrg.province ?? ""} onChange={e => setEditingOrg((s: any) => ({ ...s, province: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Input value={editingOrg.notes ?? ""} onChange={e => setEditingOrg((s: any) => ({ ...s, notes: e.target.value }))} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrgModal(false)}>Cancel</Button>
            <Button onClick={() => saveOrgMut.mutate(editingOrg)} disabled={saveOrgMut.isPending || !editingOrg?.name}>
              {saveOrgMut.isPending ? "Saving…" : editingOrg?.id ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}