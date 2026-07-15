import { cn } from "@/lib/utils";

export type StepperRound = { round: number; title: string; subtitle?: string | null };

/** Stepper for navigating the 5 DD rounds, used on both the DD Interview screen (horizontal,
 * sitting above that round's heading) and the DD Framework admin screen (vertical left rail),
 * so both share the same navigational pattern. */
export function RoundStepper({ rounds, current, onSelect, orientation = "vertical" }: {
  rounds: StepperRound[];
  current: number;
  onSelect: (round: number) => void;
  orientation?: "vertical" | "horizontal";
}) {
  if (orientation === "horizontal") {
    return (
      <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
        {rounds.map((r) => {
          const active = r.round === current;
          return (
            <button
              key={r.round}
              onClick={() => onSelect(r.round)}
              className={cn(
                "flex-1 min-w-[140px] text-left flex items-start gap-2 px-3 py-2.5 rounded-md transition-colors border",
                active ? "bg-primary/10 border-primary/30" : "border-transparent hover:bg-muted/60",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 h-3.5 w-3.5 rounded-full border-2 shrink-0",
                  active ? "border-primary bg-primary" : "border-muted-foreground/40 bg-background",
                )}
              />
              <span className="min-w-0">
                <span className={cn("block text-sm font-medium truncate", active ? "text-primary" : "text-foreground")}>
                  {r.title}
                </span>
                {r.subtitle && <span className="block text-xs text-muted-foreground truncate">{r.subtitle}</span>}
              </span>
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
