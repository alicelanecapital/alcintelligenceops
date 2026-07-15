import { cn } from "@/lib/utils";

export type StepperRound = { round: number; title: string; subtitle?: string | null };

/** Stepper for navigating the 5 DD rounds, used on both the DD Interview screen (horizontal,
 * sitting above that round's heading) and the DD Framework admin screen (vertical left rail),
 * so both share the same navigational pattern. */
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
      <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
        {rounds.map((r) => {
          const active = r.round === current;
          const completed = completedRounds?.includes(r.round) ?? false;
          return (
            <button
              key={r.round}
              onClick={() => onSelect(r.round)}
              className={cn(
                "flex-1 min-w-[150px] text-left flex flex-col gap-1 px-3 py-2.5 rounded-md transition-colors border",
                completed
                  ? "bg-emerald-600 border-emerald-600"
                  : active ? "bg-primary/10 border-primary/30" : "border-transparent hover:bg-muted/60",
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-3.5 w-3.5 rounded-full border-2 shrink-0",
                    completed ? "border-white bg-white" : active ? "border-primary bg-primary" : "border-muted-foreground/40 bg-background",
                  )}
                />
                <span className={cn("block text-sm font-medium whitespace-normal break-words", completed ? "text-white" : active ? "text-primary" : "text-foreground")}>
                  {r.title}
                </span>
              </span>
              {r.subtitle && (
                <span className={cn("block text-xs whitespace-normal break-words pl-[22px]", completed ? "text-white/80" : "text-muted-foreground")}>
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
