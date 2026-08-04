import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCompanyNameSuggestions } from "@/lib/contacts";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command";
import { Building2 } from "lucide-react";

/** Company field as a combobox: defaults to plain free-text entry (so typing a brand new
 * company name just works, same as before), but shows a filtered dropdown of existing
 * companies to pick from instead of retyping one that already exists. */
export function CompanyCombobox({
  value,
  onChange,
  onBlur,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const suggestions = useQuery({ queryKey: ["company-name-suggestions"], queryFn: fetchCompanyNameSuggestions });

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    const all = suggestions.data ?? [];
    if (!q) return all.slice(0, 8);
    return all.filter((n) => n.toLowerCase().includes(q)).slice(0, 8);
  }, [value, suggestions.data]);

  const exactMatch = filtered.some((n) => n.toLowerCase() === value.trim().toLowerCase());

  return (
    <Popover open={open}>
      <PopoverAnchor asChild>
        <Input
          value={value ?? ""}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Slight delay so a click on a suggestion registers before the popover closes.
            setTimeout(() => setOpen(false), 150);
            onBlur?.();
          }}
          placeholder="Type a new company name…"
        />
      </PopoverAnchor>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandList>
            {filtered.length === 0 ? (
              <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                {value.trim() ? `"${value.trim()}" will be added as a new company` : "Start typing to add a new company"}
              </CommandEmpty>
            ) : (
              <CommandGroup heading={exactMatch ? "Existing companies" : "Existing companies — or keep typing to add new"}>
                {filtered.map((name) => (
                  <CommandItem
                    key={name}
                    value={name}
                    onMouseDown={(e) => e.preventDefault()}
                    onSelect={() => { onChange(name); setOpen(false); }}
                  >
                    <Building2 className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    {name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
