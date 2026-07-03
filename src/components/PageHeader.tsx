import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-6 border-b border-border pb-6 mb-8">
      <div>
        {eyebrow && <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">{eyebrow}</div>}
        <h1 className="font-serif text-4xl text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function KpiStrip({ items }: { items: { label: string; value: string | number; hint?: string }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border rounded-lg overflow-hidden border border-border">
      {items.map((k) => (
        <div key={k.label} className="bg-card px-5 py-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k.label}</div>
          <div className="font-serif text-3xl mt-1 text-foreground">{k.value}</div>
          {k.hint && <div className="text-xs text-muted-foreground mt-1">{k.hint}</div>}
        </div>
      ))}
    </div>
  );
}
