import { cn } from "@/lib/utils";

const LETTERS = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

/** Row of A-Z chips for jump-filtering a sorted list by first letter. "#" catches non-letter starts. */
export function AlphabetChips({
  active,
  onChange,
  available,
}: {
  active: string | null;
  onChange: (letter: string | null) => void;
  available: Set<string>;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      <button
        onClick={() => onChange(null)}
        className={cn(
          "px-2 h-6 rounded text-[11px] font-medium border transition-colors",
          active === null ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted",
        )}
      >
        All
      </button>
      {LETTERS.map((l) => {
        const has = available.has(l);
        return (
          <button
            key={l}
            disabled={!has}
            onClick={() => onChange(active === l ? null : l)}
            className={cn(
              "w-6 h-6 rounded text-[11px] font-medium border transition-colors",
              !has && "opacity-25 cursor-not-allowed",
              active === l ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

export function firstLetterOf(value: string): string {
  const ch = (value.trim()[0] ?? "#").toUpperCase();
  return /[A-Z]/.test(ch) ? ch : "#";
}
