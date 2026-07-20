import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateDiscProfile } from "@/lib/dd-personality.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BrainCircuit } from "lucide-react";

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
  generated_at?: string;
};

const DIMENSIONS: { key: keyof DiscProfile; label: string; color: string }[] = [
  { key: "dominance", label: "D — Dominance", color: "bg-red-500" },
  { key: "influence", label: "I — Influence", color: "bg-amber-500" },
  { key: "steadiness", label: "S — Steadiness", color: "bg-green-500" },
  { key: "conscientiousness", label: "C — Conscientiousness", color: "bg-blue-500" },
];

export function DiscProfileCard({ opportunityId, initialProfile }: { opportunityId: string; initialProfile: DiscProfile | null }) {
  const [profile, setProfile] = useState<DiscProfile | null>(initialProfile);
  const [generating, setGenerating] = useState(false);
  const generateFn = useServerFn(generateDiscProfile);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const result = await generateFn({ data: { opportunityId } });
      setProfile(result);
      toast.success("DISC profile updated");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate DISC profile");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mb-6 p-5 bg-card border border-border rounded-lg">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-primary" />
          <div className="font-serif text-lg">DISC personality profile</div>
          {profile?.rounds_analyzed && profile.rounds_analyzed.length > 0 && (
            <span className="text-xs text-muted-foreground">
              Based on round{profile.rounds_analyzed.length > 1 ? "s" : ""} {profile.rounds_analyzed.join(", ")}
            </span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generating}>
          {generating ? "Analysing…" : profile ? "Regenerate" : "Generate profile"}
        </Button>
      </div>

      {!profile ? (
        <p className="text-sm text-muted-foreground">
          Generate an overall DISC assessment (Dominance, Influence, Steadiness, Conscientiousness) inferred from this
          founder's language and thought structure across every round recorded so far.
        </p>
      ) : (
        <div className="space-y-4">
          {(profile.primary_style || profile.summary) && (
            <div>
              {profile.primary_style && (
                <div className="text-sm font-medium">
                  Primary style: {profile.primary_style}
                  {profile.secondary_style ? ` · Secondary: ${profile.secondary_style}` : ""}
                </div>
              )}
              {profile.summary && <p className="text-sm text-muted-foreground mt-1">{profile.summary}</p>}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            {DIMENSIONS.map(({ key, label, color }) => {
              const dim = profile[key] as DiscDimension | undefined;
              if (!dim) return null;
              return (
                <div key={key} className="border border-border rounded-md p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-xs text-muted-foreground">{dim.label} · {dim.score}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                    <div className={`h-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, dim.score))}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{dim.evidence}</p>
                </div>
              );
            })}
          </div>

          {profile.investor_considerations && profile.investor_considerations.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-1">What this means for working with them</div>
              <ul className="text-sm text-muted-foreground space-y-1">
                {profile.investor_considerations.map((c, idx) => <li key={idx}>• {c}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
