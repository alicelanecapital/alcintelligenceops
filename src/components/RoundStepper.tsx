import { cn } from "@/lib/utils";

export type StepperRound = { round: number; title: string; subtitle?: string | null };

/** Vertical left-rail stepper for navigating the 5 DD rounds, used on both the DD Interview
 * screen and the DD Framework admin screen so both share the same navigational pattern. */
export function RoundStepper({ rounds, current, onSelect }: { rounds: StepperRound[]; current: number; onSelect: (round: number) => void }) {
  return (
    <div className="space-y-1">
      {rounds.map((r) => {
        const active = r.round === current;
        return (
          <button
            key={r.round}
            onClick={() => onSelect(r.round)}
            className={cn(
              "w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-md transition-colors",
              active ? "bg-primary/10" : "hover:bg-muted/60",
            )}
          >
            <span
              className={cn(
                "mt-0.5 h-3.5 w-3.5 rounded-full border-2 shrink-0",
                active ? "border-primary bg-primary" : "border-muted-foreground/40 bg-background",
              )}
            />
            <span className="min-w-0">
              <span className={cn("block text-sm font-medium", active ? "text-primary" : "text-foreground")}>
                {r.title}
              </span>
              {r.subtitle && <span className="block text-xs text-muted-foreground whitespace-normal break-words">{r.subtitle}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
