import { useQuery } from "@tanstack/react-query";
import { forwardRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SECTOR_MODULES } from "@/lib/dd-framework-data";
import { BrainCircuit, Sparkles, Target, Flag } from "lucide-react";

type DiscDimension = { score: number; label: string; evidence: string };
type DiscProfile = {
  dominance?: DiscDimension; influence?: DiscDimension;
  steadiness?: DiscDimension; conscientiousness?: DiscDimension;
  primary_style?: string; secondary_style?: string; summary?: string;
};
type Overview = {
  summary?: string; key_risks?: string[]; key_strengths?: string[];
  recommendation?: string; rounds_covered?: number[];
};

const DIMENSIONS: { key: keyof DiscProfile; letter: string; label: string; color: string }[] = [
  { key: "dominance", letter: "D", label: "Dominance", color: "bg-red-500" },
  { key: "influence", letter: "I", label: "Influence", color: "bg-amber-500" },
  { key: "steadiness", letter: "S", label: "Steadiness", color: "bg-green-500" },
  { key: "conscientiousness", letter: "C", label: "Conscientiousness", color: "bg-blue-500" },
];

export async function fetchSynopsis(opportunityId: string) {
  const { data: opp } = await (supabase.from("opportunities") as any)
    .select("*, founder:founders(name, startup_name, sector), company:companies(name, industry)")
    .eq("id", opportunityId).maybeSingle();
  const { data: interviews } = await (supabase.from("dd_interviews") as any)
    .select("round, stakeholder_brief, red_flags, detected_sector, sector_confidence")
    .eq("opportunity_id", opportunityId)
    .order("round", { ascending: true });
  return { opp, interviews: interviews ?? [] };
}

export type SynopsisData = {
  companyName?: string;
  founderName?: string;
  isLoading: boolean;
};

export const SynopsisContent = forwardRef<HTMLDivElement, { opportunityId: string | null; onMeta?: (m: SynopsisData) => void }>(
  function SynopsisContent({ opportunityId, onMeta }, ref) {
    const q = useQuery({
      queryKey: ["opportunity-synopsis", opportunityId],
      queryFn: () => fetchSynopsis(opportunityId!),
      enabled: !!opportunityId,
    });

    const opp = q.data?.opp;
    const interviews = q.data?.interviews ?? [];
    const stakeholderBrief = interviews.map((i: any) => i.stakeholder_brief).filter(Boolean).slice(-1)[0];
    const detectedSectorCode = interviews.map((i: any) => i.detected_sector).filter(Boolean).slice(-1)[0]
      ?? opp?.dd_detected_sector;
    const detectedSectorConfidence = interviews.map((i: any) => i.sector_confidence).filter(Boolean).slice(-1)[0]
      ?? opp?.dd_sector_confidence;
    const resolvedSector = detectedSectorCode ? (SECTOR_MODULES as any)[detectedSectorCode] : null;
    const detectedSectorName = resolvedSector && (detectedSectorConfidence ?? 0) >= 50
      ? resolvedSector.name
      : null;
    const discProfile: DiscProfile | null = opp?.disc_profile ?? null;
    const overview: Overview | null = opp?.ai_overview ?? null;
    const allRedFlags = interviews.flatMap((i: any) =>
      (Array.isArray(i.red_flags) ? i.red_flags : []).map((f: any) => ({ ...f, round: i.round }))
    );

    const companyName = opp?.company?.name ?? opp?.founder?.startup_name ?? opp?.name;
    const founderName = opp?.founder?.name ?? opp?.name;

    // Push metadata up so the wrapper can render the header title / filename.
    if (onMeta) onMeta({ companyName, founderName, isLoading: q.isLoading });

    if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

    const scrollTo = (id: string) => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const tabs = [
      { id: "syn-sector", label: "Sector" },
      { id: "syn-brief", label: "Stakeholder Brief" },
      { id: "syn-overview", label: "AI Overview" },
      { id: "syn-disc", label: "DISC" },
      { id: "syn-flags", label: "Red Flags" },
    ];

    return (
      <div className="space-y-4" ref={ref}>
        <div className="flex flex-wrap gap-1 border-b border-border pb-2 mb-2 sticky top-0 bg-background z-10">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => scrollTo(t.id)}
              className="px-3 py-1.5 text-xs rounded-md hover:bg-muted text-foreground/80 hover:text-foreground transition-colors"
            >
              {t.label}
            </button>
          ))}
        </div>
        <div id="syn-sector" className="p-3 bg-teal-50 border border-teal-200 rounded">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-3.5 w-3.5 text-teal-700" />
            <span className="text-sm font-semibold text-teal-900">Sector Detected</span>
          </div>
          {detectedSectorName ? (
            <p className="text-sm text-teal-900">
              {detectedSectorName}
              {detectedSectorConfidence ? <span className="text-xs text-teal-700"> ({Math.round(detectedSectorConfidence)}% confidence)</span> : null}
            </p>
          ) : (
            <p className="text-xs text-teal-700">Not detected yet — fills in automatically once a round has been recorded and analysed.</p>
          )}
        </div>

        <div id="syn-brief" className="p-3 bg-sky-50 border border-sky-200 rounded">
          <p className="text-sm font-semibold text-sky-900 mb-2">🧭 Stakeholder Brief</p>
          {stakeholderBrief ? (
            <div className="space-y-2">
              {stakeholderBrief.relationship_history && (
                <p className="text-xs text-sky-800">{stakeholderBrief.relationship_history}</p>
              )}
              {Array.isArray(stakeholderBrief.attendees) && stakeholderBrief.attendees.length > 0 && (
                <ul className="text-xs text-sky-800 space-y-1">
                  {stakeholderBrief.attendees.map((a: any, idx: number) => (
                    <li key={idx}>
                      <span className="font-medium text-sky-900">{a.name}</span>
                      {a.role && <> · {a.role}</>}
                      {a.org && <> — {a.org}</>}
                      {a.notes && <div className="text-sky-700">{a.notes}</div>}
                    </li>
                  ))}
                </ul>
              )}
              {Array.isArray(stakeholderBrief.talking_points) && stakeholderBrief.talking_points.length > 0 && (
                <ul className="text-xs text-sky-800 space-y-0.5 mt-1">
                  {stakeholderBrief.talking_points.map((t: string, idx: number) => <li key={idx}>• {t}</li>)}
                </ul>
              )}
            </div>
          ) : (
            <p className="text-xs text-sky-700">No brief generated yet.</p>
          )}
        </div>

        <div id="syn-overview" className="p-3 bg-amber-50 border border-amber-200 rounded">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-700" />
            <span className="text-sm font-semibold text-amber-900">AI Overview</span>
          </div>
          {overview ? (
            <div className="space-y-2 text-sm">
              {overview.summary && <p className="text-amber-900">{overview.summary}</p>}
              <div className="grid sm:grid-cols-2 gap-3">
                {overview.key_strengths?.length ? (
                  <div>
                    <div className="text-xs font-medium text-green-700 mb-1">Strengths</div>
                    <ul className="text-xs text-amber-800 space-y-0.5">
                      {overview.key_strengths.map((s, i) => <li key={i}>• {s}</li>)}
                    </ul>
                  </div>
                ) : null}
                {overview.key_risks?.length ? (
                  <div>
                    <div className="text-xs font-medium text-red-700 mb-1">Risks</div>
                    <ul className="text-xs text-amber-800 space-y-0.5">
                      {overview.key_risks.map((s, i) => <li key={i}>• {s}</li>)}
                    </ul>
                  </div>
                ) : null}
              </div>
              {overview.recommendation && <p className="text-xs italic text-amber-700">{overview.recommendation}</p>}
            </div>
          ) : (
            <p className="text-xs text-amber-700">Not enough information yet.</p>
          )}
        </div>

        <div id="syn-disc" className="p-3 bg-cyan-50 border border-cyan-200 rounded">
          <div className="flex items-center gap-2 mb-2">
            <BrainCircuit className="h-3.5 w-3.5 text-cyan-700" />
            <span className="text-sm font-semibold text-cyan-900">DISC Personality Profile</span>
          </div>
          {discProfile ? (
            <div className="space-y-2">
              {discProfile.primary_style && (
                <div className="text-sm text-cyan-900">
                  Primary Style: <span className="font-medium">{discProfile.primary_style}</span>
                  {discProfile.secondary_style ? ` · Secondary: ${discProfile.secondary_style}` : ""}
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-2">
                {DIMENSIONS.map(({ key, letter, label, color }) => {
                  const dim = discProfile[key] as DiscDimension | undefined;
                  if (!dim) return null;
                  return (
                    <div key={key} className="border border-cyan-200 bg-white rounded-md p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{letter} — {label}</span>
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
            <p className="text-xs text-cyan-700">Not enough information yet.</p>
          )}
        </div>

        <div id="syn-flags" className="p-3 bg-rose-50 border border-rose-200 rounded">
          <div className="flex items-center gap-2 mb-2">
            <Flag className="h-3.5 w-3.5 text-rose-700" />
            <span className="text-sm font-semibold text-rose-900">Red Flags</span>
          </div>
          {allRedFlags.length ? (
            <ul className="text-xs text-rose-800 space-y-1">
              {allRedFlags.map((f: any, i: number) => (
                <li key={i}>
                  <span className="font-medium">[Round {f.round}{f.severity ? ` · ${f.severity}` : ""}]</span> {f.text ?? String(f)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-rose-700">No red flags detected — continue to verify claims in later rounds.</p>
          )}
        </div>
      </div>
    );
  }
);
