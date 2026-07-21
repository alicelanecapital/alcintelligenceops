import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepperRound = { round: number; title: string; subtitle?: string | null };

/** Stepper for navigating the 5 DD rounds, used on both the DD Interview screen (horizontal,
 * sitting above that round's heading) and the DD Framework admin screen (vertical left rail),
 * so both share the same navigational pattern. Numbered badges and stronger active/completed
 * styling make it read as a real stepper, not just a plain nav list. */
export function RoundStepper({ rounds, current, onSelect, orientation = "vertical", completedRounds }: {
  rounds: StepperRound[];
  current: number;
  onSelect: (round: number) => void;
  orientation?: "vertical" | "horizontal";
  /** Rounds whose due diligence is complete -- rendered as a solid colour, not just the
   * active/inactive outline, so progress through the rounds is visible at a glance. */
  completedRounds?: number[];
}) {
  if (orientation === "horizontal") {
    return (
      <div className="flex items-stretch gap-3 overflow-x-auto pb-1">
        {rounds.map((r, idx) => {
          const active = r.round === current;
          const completed = completedRounds?.includes(r.round) ?? false;
          return (
            <button
              key={r.round}
              onClick={() => onSelect(r.round)}
              className={cn(
                "flex-1 min-w-[160px] text-left flex flex-col gap-1.5 px-4 py-3 rounded-lg transition-all border",
                completed
                  ? "bg-emerald-600 border-emerald-600"
                  : active
                  ? "bg-primary/10 border-primary"
                  : "bg-card border-border/40 hover:border-primary/40 hover:bg-muted/60",
              )}
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold shrink-0 transition-colors",
                    completed
                      ? "bg-white text-emerald-600"
                      : active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground border border-border",
                  )}
                >
                  {completed ? <Check className="h-4 w-4" /> : idx + 1}
                </span>
                <span className={cn("block text-sm font-bold whitespace-normal break-words", completed ? "text-white" : "text-green-800")}>
                  {r.title}
                </span>
              </span>
              {r.subtitle && (
                <span className={cn("block text-xs whitespace-normal break-words pl-[38px]", completed ? "text-white/80" : "text-muted-foreground")}>
                  {r.subtitle}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {rounds.map((r, idx) => {
        const active = r.round === current;
        const completed = completedRounds?.includes(r.round) ?? false;
        return (
          <button
            key={r.round}
            onClick={() => onSelect(r.round)}
            className={cn(
              "w-full text-left flex items-start gap-3 px-3 py-3 rounded-lg transition-all border-l-4",
              completed
                ? "bg-emerald-50 border-l-emerald-600"
                : active
                ? "bg-primary/10 border-l-primary shadow-sm"
                : "border-l-transparent hover:bg-muted/60",
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-bold shrink-0 mt-0.5 transition-colors",
                completed
                  ? "bg-emerald-600 text-white"
                  : active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground border border-border",
              )}
            >
              {completed ? <Check className="h-3.5 w-3.5" /> : idx + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-green-800">
                {r.title}
              </span>
              {r.subtitle && <span className="block text-xs text-muted-foreground whitespace-normal break-words mt-0.5">{r.subtitle}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
