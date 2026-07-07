import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchFounders } from "@/lib/db";
import { createFounder, updateFounder, deleteFounder } from "@/lib/founders-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Mail, Phone, Globe, Plus, Edit2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/founders")({ component: () => <AppShell><Founders /></AppShell> });

function Founders() {
  const q = useQuery({ queryKey: ["founders"], queryFn: fetchFounders });
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [viewType, setViewType] = useState<"cards" | "list">("cards");
  const [editing, setEditing] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);

  const saveMut = useMutation({
    mutationFn: (data: any) => data.id ? updateFounder(data.id, data) : createFounder(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["founders"] });
      setShowModal(false);
      setEditing(null);
      toast.success("Founder saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFounder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["founders"] });
      toast.success("Founder deleted");
    },
  });

  const list = (q.data ?? []).filter((f: any) => !search || `${f.name} ${f.sector ?? ""}`.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => { setEditing({}); setShowModal(true); };
  const openEdit = (f: any) => { setEditing(f); setShowModal(true); };
  const confirmDelete = (f: any) => {
    if (confirm(`Delete founder "${f.name}"?`)) deleteMut.mutate(f.id);
  };

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="People"
        title="Founders"
        description="Every founder in the origination universe, with sector, stage and AI investment score."
        actions={<Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add founder</Button>}
      />
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <Input placeholder="Search founders…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <div className="flex gap-2 ml-auto">
          <Button size="sm" variant={viewType === "cards" ? "default" : "outline"} onClick={() => setViewType("cards")}>Cards</Button>
          <Button size="sm" variant={viewType === "list" ? "default" : "outline"} onClick={() => setViewType("list")}>List</Button>
        </div>
        <div className="text-xs text-muted-foreground w-full">{list.length} founders</div>
      </div>
      <div className="mt-6">
        {viewType === "cards" ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((f: any) => (
              <Card key={f.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <Link to="/founders/$id" params={{ id: f.id }} className="flex-1 min-w-0">
                      <div className="font-serif text-lg leading-tight truncate">{f.name}</div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">{f.startup_name}</div>
                    </Link>
                    <div className="flex gap-1 items-center shrink-0">
                      {f.ai_investment_score && <Badge className="bg-primary text-primary-foreground">{f.ai_investment_score}</Badge>}
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(f)}><Edit2 className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => confirmDelete(f)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {f.sector && <Badge variant="outline" className="text-[10px]">{f.sector}</Badge>}
                    {f.stage && <Badge variant="outline" className="text-[10px]">{f.stage}</Badge>}
                  </div>
                  {f.referral_source && <div className="mt-2 text-[11px] text-muted-foreground">Referral: {f.referral_source}</div>}
                  <div className="mt-3 pt-3 border-t space-y-1">
                    {f.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3 text-muted-foreground" /> <a href={`mailto:${f.email}`} className="text-primary hover:underline text-[10px]">{f.email}</a></div>}
                    {f.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-muted-foreground" /> <span className="text-[10px]">{f.phone}</span></div>}
                    {f.website && <div className="flex items-center gap-2"><Globe className="h-3 w-3 text-muted-foreground" /> <a href={f.website} target="_blank" rel="noreferrer" className="text-primary hover:underline text-[10px] truncate">{f.website}</a></div>}
                    {f.description && <div className="text-[10px] text-muted-foreground italic line-clamp-2 mt-2">{f.description}</div>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Startup</TableHead><TableHead>Sector</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Stage</TableHead><TableHead>Score</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {list.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium"><Link to="/founders/$id" params={{ id: f.id }} className="text-primary hover:underline">{f.name}</Link></TableCell>
                    <TableCell className="text-muted-foreground text-xs">{f.startup_name}</TableCell>
                    <TableCell className="text-xs">{f.sector ? <Badge variant="outline" className="text-[10px]">{f.sector}</Badge> : "—"}</TableCell>
                    <TableCell className="text-xs">{f.email ? <a href={`mailto:${f.email}`} className="text-primary hover:underline">{f.email}</a> : "—"}</TableCell>
                    <TableCell className="text-xs">{f.phone ?? "—"}</TableCell>
                    <TableCell className="text-xs">{f.stage ? <Badge variant="outline" className="text-[10px]">{f.stage}</Badge> : "—"}</TableCell>
                    <TableCell className="text-xs">{f.ai_investment_score ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(f)}><Edit2 className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => confirmDelete(f)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Founder" : "Add Founder"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4 max-h-[65vh] overflow-y-auto">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input value={editing.name ?? ""} onChange={e => setEditing((s: any) => ({ ...s, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Startup Name</label>
                <Input value={editing.startup_name ?? ""} onChange={e => setEditing((s: any) => ({ ...s, startup_name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Sector</label>
                  <Input value={editing.sector ?? ""} onChange={e => setEditing((s: any) => ({ ...s, sector: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Stage</label>
                  <Input value={editing.stage ?? ""} onChange={e => setEditing((s: any) => ({ ...s, stage: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input value={editing.email ?? ""} onChange={e => setEditing((s: any) => ({ ...s, email: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input value={editing.phone ?? ""} onChange={e => setEditing((s: any) => ({ ...s, phone: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Website</label>
                <Input value={editing.website ?? ""} onChange={e => setEditing((s: any) => ({ ...s, website: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Referral Source</label>
                <Input value={editing.referral_source ?? ""} onChange={e => setEditing((s: any) => ({ ...s, referral_source: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea value={editing.description ?? ""} onChange={e => setEditing((s: any) => ({ ...s, description: e.target.value }))} rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={() => saveMut.mutate(editing)} disabled={saveMut.isPending || !editing?.name}>
              {saveMut.isPending ? "Saving…" : editing?.id ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
