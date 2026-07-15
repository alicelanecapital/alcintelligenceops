import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateDiscProfile } from "@/lib/dd-personality.functions";
import { generateOpportunityOverview } from "@/lib/dd-overview.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, BrainCircuit, Sparkles } from "lucide-react";

type DiscDimension = { score: number; label: string; evidence: string };
type DiscProfile = {
  dominance?: DiscDimension;
  influence?: DiscDimension;
  steadiness?: DiscDimension;
  conscientiousness?: DiscDimension;
  primary_style?: string;
  secondary_style?: string;
  summary?: string;
  investor_considerations?: string[];
  rounds_analyzed?: number[];
};

type Overview = {
  headline?: string;
  summary?: string;
  key_risks?: string[];
  key_strengths?: string[];
  recommendation?: string;
  rounds_covered?: number[];
};

const DIMENSIONS: { key: keyof DiscProfile; label: string; color: string }[] = [
  { key: "dominance", label: "D", color: "bg-red-500" },
  { key: "influence", label: "I", color: "bg-amber-500" },
  { key: "steadiness", label: "S", color: "bg-green-500" },
  { key: "conscientiousness", label: "C", color: "bg-blue-500" },
];

export function OpportunityOverviewBar({
  opportunityId, companyName, founderName, sector, description,
  initialDiscProfile, initialOverview,
}: {
  opportunityId: string;
  companyName?: string;
  founderName?: string;
  sector?: string;
  description?: string;
  initialDiscProfile: DiscProfile | null;
  initialOverview: Overview | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [profile, setProfile] = useState<DiscProfile | null>(initialDiscProfile);
  const [overview, setOverview] = useState<Overview | null>(initialOverview);
  const [generatingDisc, setGeneratingDisc] = useState(false);
  const [generatingOverview, setGeneratingOverview] = useState(false);

  const generateDiscFn = useServerFn(generateDiscProfile);
  const generateOverviewFn = useServerFn(generateOpportunityOverview);

  async function handleGenerateDisc() {
    setGeneratingDisc(true);
    try {
      const result = await generateDiscFn({ data: { opportunityId } });
      setProfile(result);
      toast.success("DISC profile updated");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate DISC profile");
    } finally {
      setGeneratingDisc(false);
    }
  }

  async function handleGenerateOverview() {
    setGeneratingOverview(true);
    try {
      const result = await generateOverviewFn({ data: { opportunityId } });
      setOverview(result);
      toast.success("AI overview updated");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate AI overview");
    } finally {
      setGeneratingOverview(false);
    }
  }

  return (
    <div className="sticky top-0 z-10 mb-6 rounded-lg border border-border bg-card/95 backdrop-blur shadow-sm">
      <button onClick={() => setExpanded((v) => !v)} className="w-full text-left px-5 py-3 flex items-center gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-serif text-lg leading-tight">{companyName}</span>
            {sector && <Badge variant="outline" className="whitespace-nowrap text-[10px]">{sector}</Badge>}
            {founderName && <span className="text-xs text-muted-foreground">Founder: {founderName}</span>}
          </div>
          {overview?.headline && <div className="text-xs text-muted-foreground mt-0.5 truncate">{overview.headline}</div>}
        </div>

        {profile && (
          <div className="flex items-center gap-1 shrink-0">
            {DIMENSIONS.map(({ key, label, color }) => {
              const dim = profile[key] as DiscDimension | undefined;
              if (!dim) return null;
              return (
                <span key={key} title={`${dim.label} (${dim.score})`} className={`h-6 w-6 rounded-full ${color} text-white text-[10px] font-semibold flex items-center justify-center`}>
                  {label}
                </span>
              );
            })}
          </div>
        )}

        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-4">
          {description && <p className="text-sm text-muted-foreground">{description}</p>}

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-medium">AI overview</span>
                {overview?.rounds_covered && overview.rounds_covered.length > 0 && (
                  <span className="text-xs text-muted-foreground">Rounds {overview.rounds_covered.join(", ")}</span>
                )}
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleGenerateOverview} disabled={generatingOverview}>
                {generatingOverview ? "Generating…" : overview ? "Regenerate" : "Generate overview"}
              </Button>
            </div>
            {overview ? (
              <div className="space-y-2 text-sm">
                {overview.summary && <p className="text-muted-foreground">{overview.summary}</p>}
                <div className="grid sm:grid-cols-2 gap-3">
                  {overview.key_strengths && overview.key_strengths.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-green-700 mb-1">Strengths</div>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {overview.key_strengths.map((s, i) => <li key={i}>• {s}</li>)}
                      </ul>
                    </div>
                  )}
                  {overview.key_risks && overview.key_risks.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-red-700 mb-1">Risks</div>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {overview.key_risks.map((s, i) => <li key={i}>• {s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
                {overview.recommendation && <p className="text-xs italic text-muted-foreground">{overview.recommendation}</p>}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No overview generated yet — this synthesises every round recorded so far into a running executive summary.</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-medium">DISC personality profile</span>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleGenerateDisc} disabled={generatingDisc}>
                {generatingDisc ? "Analysing…" : profile ? "Regenerate" : "Generate profile"}
              </Button>
            </div>
            {profile ? (
              <div className="space-y-2">
                {profile.primary_style && (
                  <div className="text-sm">
                    Primary style: <span className="font-medium">{profile.primary_style}</span>
                    {profile.secondary_style ? ` · Secondary: ${profile.secondary_style}` : ""}
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-2">
                  {DIMENSIONS.map(({ key, label, color }) => {
                    const dim = profile[key] as DiscDimension | undefined;
                    if (!dim) return null;
                    return (
                      <div key={key} className="border border-border rounded-md p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">{label} · {dim.label}</span>
                          <span className="text-[10px] text-muted-foreground">{dim.score}</span>
                        </div>
                        <div className="h-1 bg-muted rounded-full overflow-hidden mb-1">
                          <div className={`h-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, dim.score))}%` }} />
                        </div>
                        <p className="text-[11px] text-muted-foreground">{dim.evidence}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No DISC profile generated yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
