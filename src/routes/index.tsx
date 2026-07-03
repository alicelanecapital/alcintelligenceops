import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader, KpiStrip } from "@/components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { fetchDeals, fetchOrgs, fetchFounders, fetchContacts, fetchEvents, DEAL_STAGES } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({ component: () => <AppShell><Dashboard /></AppShell> });

function Dashboard() {
  const deals = useQuery({ queryKey: ["deals"], queryFn: fetchDeals });
  const smes = useQuery({ queryKey: ["orgs","sme"], queryFn: () => fetchOrgs("sme") });
  const ecos = useQuery({ queryKey: ["orgs","ecosystem"], queryFn: () => fetchOrgs("ecosystem") });
  const founders = useQuery({ queryKey: ["founders"], queryFn: fetchFounders });
  const contacts = useQuery({ queryKey: ["contacts"], queryFn: fetchContacts });
  const events = useQuery({ queryKey: ["events"], queryFn: fetchEvents });

  const active = (deals.data ?? []).filter((d: any) => !["Funded","Portfolio","Passed"].includes(d.stage)).length;
  const highFit = (ecos.data ?? []).filter((o) => (o.fit_rating ?? "").toLowerCase().startsWith("high")).length;

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Daily Briefing"
        title="Good morning."
        description="A live snapshot of your origination engine — pipeline health, priority ecosystem plays and founders worth a call today."
      />
      <KpiStrip items={[
        { label: "Active deals", value: active, hint: `${deals.data?.length ?? 0} total` },
        { label: "Founders", value: founders.data?.length ?? 0 },
        { label: "SMEs sourced", value: smes.data?.length ?? 0, hint: "from MSME list" },
        { label: "Ecosystem partners", value: ecos.data?.length ?? 0, hint: `${highFit} high fit` },
        { label: "Contacts", value: contacts.data?.length ?? 0 },
      ]} />

      <div className="grid lg:grid-cols-3 gap-6 mt-8">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="font-serif text-xl flex items-center gap-2"><Sparkles className="h-4 w-4 text-[var(--gold)]" /> AI narrative</CardTitle>
            <Badge variant="outline" className="uppercase tracking-widest text-[10px]">Generated</Badge>
          </CardHeader>
          <CardContent className="text-sm text-foreground/80 leading-relaxed space-y-3">
            <p>The pipeline is anchored by <strong>{active} live opportunities</strong> — the majority sourced from the recent MSME selection list. Beauty, Automotive and Architecture are the deepest verticals; each has 3+ founders ready to progress from screening.</p>
            <p>On the ecosystem side, <strong>{highFit} partners scored “High fit”</strong> including SAB Foundation, TechnoServe, The Hope Factory and Endeavor South Africa — prioritise a warm intro to two of these this week to unlock structured referral pipelines.</p>
            <p>Once the AI event-discovery job is enabled, this briefing will also surface the top three events worth attending in the next 30 days.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-serif text-xl">Priority ecosystem plays</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(ecos.data ?? []).filter(o => (o.fit_rating ?? "").toLowerCase().startsWith("high")).slice(0,6).map(o => (
              <div key={o.id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{o.name}</div>
                  <Badge className="bg-[var(--gold)] text-[var(--ink)] hover:bg-[var(--gold)]">{o.fit_rating}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{o.category}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader><CardTitle className="font-serif text-xl">Pipeline by stage</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {DEAL_STAGES.map(s => {
                const n = (deals.data ?? []).filter((d: any) => d.stage === s).length;
                const max = Math.max(1, ...DEAL_STAGES.map(x => (deals.data ?? []).filter((d: any) => d.stage === x).length));
                return (
                  <div key={s} className="flex items-center gap-3 text-sm">
                    <div className="w-40 text-muted-foreground">{s}</div>
                    <div className="flex-1 h-2 bg-muted rounded"><div className="h-2 bg-[var(--gold)] rounded" style={{ width: `${(n/max)*100}%` }} /></div>
                    <div className="w-8 tabular-nums text-right">{n}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-serif text-xl">Upcoming events</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {(events.data ?? []).length === 0
              ? <p className="text-muted-foreground">No events yet. Enable the AI discovery job to auto-populate this feed with SA-relevant startup, VC and MSME events.</p>
              : (events.data ?? []).slice(0,5).map((e: any) => (
                <div key={e.id} className="border-b border-border last:border-0 py-3">
                  <div className="font-medium">{e.name}</div>
                  <div className="text-xs text-muted-foreground">{e.city} · {e.start_date}</div>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
