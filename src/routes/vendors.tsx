import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCompanies, createCompany, updateCompany, deleteCompany } from "@/lib/founders-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Edit2, Trash2, Plus } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/vendors")({ component: () => <AppShell><Vendors /></AppShell> });

function Vendors() {
  const q = useQuery({ queryKey: ["companies"], queryFn: fetchCompanies });
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any | null>(null);

  const updateMut = useMutation({
    mutationFn: (data: any) => editingVendor?.id ? updateCompany(editingVendor.id, data) : createCompany(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      setShowModal(false);
      setEditingVendor(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Procurement"
        title="Vendors"
        description="Ecosystem and service providers — partners, consultants, and suppliers."
        actions={
          <Button onClick={() => { setEditingVendor({}); setShowModal(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add vendor
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(q.data ?? []).map((v: any) => (
          <Card key={v.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{v.name}</h3>
                  <p className="text-sm text-muted-foreground">{v.industry}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditingVendor(v); setShowModal(true); }}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(v.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {v.website && <p className="text-sm text-blue-600 mb-2"><a href={v.website} target="_blank" rel="noreferrer">{v.website}</a></p>}
              <div className="space-y-2">
                {v.category && <Badge variant="outline">{v.category}</Badge>}
                <p className="text-xs text-muted-foreground">{v.notes}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingVendor?.id ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
          </DialogHeader>
          {editingVendor !== null && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Company Name</label>
                <Input value={editingVendor.name ?? ""} onChange={e => setEditingVendor((s: any) => ({ ...s, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Industry</label>
                  <Input value={editingVendor.industry ?? ""} onChange={e => setEditingVendor((s: any) => ({ ...s, industry: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Input value={editingVendor.category ?? ""} onChange={e => setEditingVendor((s: any) => ({ ...s, category: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Website</label>
                <Input value={editingVendor.website ?? ""} onChange={e => setEditingVendor((s: any) => ({ ...s, website: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea value={editingVendor.notes ?? ""} onChange={e => setEditingVendor((s: any) => ({ ...s, notes: e.target.value }))} rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={() => updateMut.mutate(editingVendor)} disabled={updateMut.isPending}>
              {updateMut.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
