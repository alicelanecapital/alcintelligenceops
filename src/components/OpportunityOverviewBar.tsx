import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Sparkles, Target } from "lucide-react";

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

/**
 * Fixed, always-visible (not collapsible) summary of the opportunity, laid out as a single
 * 2-column grid so the coloured frames align row-for-row: "About the Business" (Sector
 * Detected, AI overview) beside "About {founder}" (Pre-interview stakeholder brief, DISC
 * profile). All four fill in automatically as round data comes in -- no manual regenerate
 * controls by design. All 6 cells are direct grid children (not nested per-column wrappers)
 * so each row's height matches across both columns automatically.
 */
export function OpportunityOverviewBar({
  companyName, founderName, sector, description, discProfile, overview,
  detectedSector, detectedSectorConfidence, stakeholderBrief,
}: {
  companyName?: string;
  founderName?: string;
  sector?: string;
  description?: string;
  discProfile: DiscProfile | null;
  overview: Overview | null;
  detectedSector?: string | null;
  detectedSectorConfidence?: number;
  stakeholderBrief?: any;
}) {
  return (
    <div className="mb-6 grid md:grid-cols-2 gap-4 items-stretch">
      {/* Row 1: headings */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-serif text-lg leading-tight">
            <span className="font-bold">About</span> {companyName ? <span className="font-bold">{companyName}</span> : "the Business"}
          </span>
          {sector && <Badge variant="outline" className="whitespace-nowrap text-[10px]">{sector}</Badge>}
        </div>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      <div>
        <span className="font-serif text-lg leading-tight">
          <span className="font-bold">About</span> {founderName ? <span className="font-bold">{founderName}</span> : "the Founder"}
        </span>
      </div>

      {/* Row 2 */}
      <div className="p-3 bg-teal-50 border border-teal-200 rounded h-full">
        <div className="flex items-center gap-2 mb-1">
          <Target className="h-3.5 w-3.5 text-teal-700" />
          <span className="text-sm font-semibold text-teal-900">Sector Detected</span>
        </div>
        {detectedSector ? (
          <>
            <p className="text-sm text-teal-900">{detectedSector} <span className="text-xs text-teal-700">({detectedSectorConfidence ?? 0}% confidence)</span></p>
            <p className="text-xs text-teal-700 mt-1">Sector-specific questions and verification steps will be loaded for this business type.</p>
          </>
        ) : (
          <p className="text-xs text-teal-700">Not detected yet — this fills in automatically once a round has been recorded and analysed.</p>
        )}
      </div>
      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded h-full">
        <p className="text-sm font-semibold text-indigo-900 mb-1">🧭 Stakeholder Brief</p>
        {stakeholderBrief ? (
          <div className="space-y-2">
            {stakeholderBrief.relationship_history && (
              <p className="text-xs text-indigo-800">{stakeholderBrief.relationship_history}</p>
            )}
            {Array.isArray(stakeholderBrief.attendees) && stakeholderBrief.attendees.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-2">
                {stakeholderBrief.attendees.map((a: any, idx: number) => (
                  <div key={idx} className="bg-white rounded border border-indigo-200 p-2">
                    <p className="text-sm font-medium text-indigo-900">{a.name} <span className="text-xs font-normal text-indigo-600">— {a.role}</span></p>
                    <p className="text-xs text-indigo-700">{a.org}</p>
                    {a.notes && <p className="text-xs text-indigo-800 mt-1">{a.notes}</p>}
                  </div>
                ))}
              </div>
            )}
            {Array.isArray(stakeholderBrief.talking_points) && stakeholderBrief.talking_points.length > 0 && (
              <ul className="text-xs text-indigo-800 space-y-1">
                {stakeholderBrief.talking_points.map((t: string, idx: number) => <li key={idx}>• {t}</li>)}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-xs text-indigo-700">Generating an AI summary of the external (non-Alice-Lane) attendees expected at this round, based on contacts linked to this company…</p>
        )}
      </div>

      {/* Row 3 */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded h-full">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-3.5 w-3.5 text-amber-700" />
          <span className="text-sm font-semibold text-amber-900">AI Overview</span>
          {overview?.rounds_covered && overview.rounds_covered.length > 0 && (
            <span className="text-xs text-amber-700">Rounds {overview.rounds_covered.join(", ")}</span>
          )}
        </div>
        {overview ? (
          <div className="space-y-2 text-sm">
            {overview.summary && <p className="text-amber-900">{overview.summary}</p>}
            <div className="grid sm:grid-cols-2 gap-3">
              {overview.key_strengths && overview.key_strengths.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-green-700 mb-1">Strengths</div>
                  <ul className="text-xs text-amber-800 space-y-0.5">
                    {overview.key_strengths.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              )}
              {overview.key_risks && overview.key_risks.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-red-700 mb-1">Risks</div>
                  <ul className="text-xs text-amber-800 space-y-0.5">
                    {overview.key_risks.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              )}
            </div>
            {overview.recommendation && <p className="text-xs italic text-amber-700">{overview.recommendation}</p>}
          </div>
        ) : (
          <p className="text-xs text-amber-700">Not enough information yet — this fills in automatically once a round has been recorded and analysed.</p>
        )}
      </div>
      <div className="p-3 bg-cyan-50 border border-cyan-200 rounded h-full">
        <div className="flex items-center gap-2 mb-1">
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
              {DIMENSIONS.map(({ key, label, color }) => {
                const dim = discProfile[key] as DiscDimension | undefined;
                if (!dim) return null;
                return (
                  <div key={key} className="border border-cyan-200 bg-white rounded-md p-2">
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
          <p className="text-xs text-cyan-700">Not enough information yet — this fills in automatically once a round has been recorded and analysed.</p>
        )}
      </div>
    </div>
  );
}
