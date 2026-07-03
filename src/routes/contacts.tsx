import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { fetchContacts } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/contacts")({ component: () => <AppShell><Contacts /></AppShell> });

function Contacts() {
  const q = useQuery({ queryKey: ["contacts"], queryFn: fetchContacts });
  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <PageHeader eyebrow="Network" title="Contacts" description="Every human relationship, tied back to the SME or ecosystem organisation they belong to." />
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Organisation</TableHead><TableHead>Type</TableHead></TableRow></TableHeader>
          <TableBody>
            {(q.data ?? []).map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.email ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
                <TableCell>{c.organisation?.name ?? "—"}</TableCell>
                <TableCell>{c.organisation?.kind && <Badge variant="outline">{c.organisation.kind}</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
