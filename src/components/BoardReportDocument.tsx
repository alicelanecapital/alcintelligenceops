import { forwardRef, useMemo } from "react";
import { format } from "date-fns";
import type { ReportTemplate, ReportTemplateSection } from "@/lib/report-templates";
import { buildSectionBlocks, type ReportBlock } from "@/lib/report-content";

// A4 at 96dpi -- each "page" div is captured individually and dropped onto its own PDF page,
// so the exported document reads like an actual printed board deck rather than one long
// image sliced arbitrarily.
export const PAGE_WIDTH = 794;
export const PAGE_HEIGHT = 1123;

type PageGroup = { anchor: ReportTemplateSection; children: ReportTemplateSection[] };

/** Groups the flat, level-tagged section list into pages: each level-1 section starts a new
 * page, and any level-2/3 sections that follow it (until the next level-1) render as nested
 * subsection / sub-subsection headings stacked on that same page. */
function groupIntoPages(sections: ReportTemplateSection[]): PageGroup[] {
  const groups: PageGroup[] = [];
  for (const s of sections) {
    if (s.level === 1 || !groups.length) {
      groups.push({ anchor: s, children: [] });
    } else {
      groups[groups.length - 1].children.push(s);
    }
  }
  return groups;
}

export const BoardReportDocument = forwardRef<HTMLDivElement, {
  template: ReportTemplate;
  sections: ReportTemplateSection[];
  report: any;
  meta: { founderName?: string; businessName?: string; industry?: string };
  redactScores?: boolean;
}>(function BoardReportDocument({ template, sections, report, meta, redactScores }, ref) {
  const brand = template.name.replace(/\s*Template$/i, "");
  const dealTitle = meta.businessName || meta.founderName || "Deal";
  const pages = useMemo(() => groupIntoPages(sections), [sections]);
  const hasCoverTheme = !!(template.cover_bg && template.cover_fg);
  const accent = template.cover_bg || "#0F766E";

  return (
    <div ref={ref}>
      {/* Cover page */}
      <Page footer={brand} bg={template.cover_bg} fg={template.cover_fg}>
        <div className="h-full flex flex-col justify-between">
          <div>
            {template.logo_url && (
              <img src={template.logo_url} alt={brand} className="h-12 mb-6 object-contain" style={{ objectPosition: "left" }} />
            )}
            <div className="text-[11px] uppercase tracking-[0.3em]" style={{ opacity: 0.7 }}>{brand}</div>
            <div className="h-px w-16 my-4" style={{ backgroundColor: hasCoverTheme ? template.cover_fg! : undefined }} />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] mb-3" style={{ opacity: 0.7 }}>Investment Committee Report</div>
            <div className="font-serif text-5xl leading-tight">{dealTitle}</div>
            {meta.founderName && meta.businessName && (
              <div className="text-lg mt-3" style={{ opacity: 0.75 }}>{meta.founderName}</div>
            )}
            {meta.industry && (
              <div className="inline-block mt-4 px-3 py-1 border rounded-full text-xs uppercase tracking-widest" style={{ opacity: 0.75, borderColor: "currentColor" }}>
                {meta.industry}
              </div>
            )}
          </div>
          <div className="text-xs" style={{ opacity: 0.7 }}>
            <div>{format(new Date(), "d MMMM yyyy")}</div>
            <div className="mt-1 uppercase tracking-widest text-[10px]">Confidential — Prepared for the Investment Committee</div>
          </div>
        </div>
      </Page>

      {/* Table of contents */}
      <Page footer={brand}>
        <div className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-6">Contents</div>
        <div className="space-y-3">
          {sections.map((s) => (
            <div key={s.id} className="flex items-baseline gap-3 text-sm" style={{ marginLeft: (s.level - 1) * 20 }}>
              <span className="flex-1 border-b border-dotted border-border pb-1" style={{ fontSize: s.level === 1 ? undefined : "0.85em", opacity: s.level === 1 ? 1 : 0.75 }}>
                {s.title}
              </span>
            </div>
          ))}
        </div>
      </Page>

      {/* Section pages -- one per top-level section, with nested subsections stacked below */}
      {pages.map((group, i) => (
        <Page key={group.anchor.id} footer={brand} pageNumber={i + 3} accent={accent}>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
            <span>{brand}</span>
            <span style={{ color: accent }}>·</span>
            <span>Section {i + 1} of {pages.length}</span>
          </div>
          <div className="font-serif text-3xl mb-5">{group.anchor.title}</div>
          <div className="h-[3px] w-16 mb-6" style={{ backgroundColor: accent }} />
          <div className="space-y-5">
            {buildSectionBlocks(group.anchor.title, report).map((b, bi) => <Block key={bi} block={b} redact={redactScores} accent={accent} />)}
          </div>
          {group.children.map((child) => (
            <div key={child.id} className="mt-8">
              {child.level === 2 ? (
                <div className="font-serif text-xl mb-3 pl-3" style={{ borderLeft: `3px solid ${accent}` }}>{child.title}</div>
              ) : (
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 pl-3">{child.title}</div>
              )}
              <div className="space-y-4 pl-3">
                {buildSectionBlocks(child.title, report).map((b, bi) => <Block key={bi} block={b} redact={redactScores} accent={accent} />)}
              </div>
            </div>
          ))}
        </Page>
      ))}
    </div>
  );
});

function Page({ children, footer, pageNumber, bg, fg, accent }: { children: React.ReactNode; footer: string; pageNumber?: number; bg?: string | null; fg?: string | null; accent?: string }) {
  const themed = !!(bg && fg);
  return (
    <div
      className={`board-report-page px-16 py-14 relative ${themed ? "" : "bg-white text-foreground"}`}
      style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT, boxSizing: "border-box", backgroundColor: bg ?? undefined, color: fg ?? undefined }}
    >
      {accent && !themed && <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: accent }} />}
      <div style={{ height: PAGE_HEIGHT - 2 * 56 - 40, overflow: "hidden" }}>{children}</div>
      <div
        className="absolute bottom-10 left-16 right-16 flex items-center justify-between text-[10px] uppercase tracking-widest pt-3"
        style={{ borderTop: `1px solid ${themed ? fg : undefined}`, opacity: themed ? 0.8 : undefined }}
      >
        <span className={themed ? "" : "text-muted-foreground"}>{footer}</span>
        {pageNumber ? <span className={themed ? "" : "text-muted-foreground"}>Page {pageNumber}</span> : <span className={themed ? "" : "text-muted-foreground"}>Confidential</span>}
      </div>
    </div>
  );
}

function Block({ block, redact, accent }: { block: ReportBlock; redact?: boolean; accent?: string }) {
  if (block.type === "paragraph") {
    return <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-foreground/90">{block.text}</p>;
  }
  if (block.type === "note") {
    return <p className="text-[13px] italic text-muted-foreground">{block.text}</p>;
  }
  if (block.type === "bullets") {
    return (
      <div>
        {block.heading && <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-medium">{block.heading}</div>}
        <ul className="space-y-1.5">
          {block.items.map((it, i) => (
            <li key={i} className="text-[13px] flex gap-2.5 leading-snug">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: accent ?? "var(--primary)" }} />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  // table
  return (
    <div className="rounded-md border border-border overflow-hidden">
      {block.rows.map((row, i) => (
        <div key={i} className={`flex gap-4 py-2.5 px-3 text-[13px] ${i % 2 === 1 ? "bg-muted/30" : ""}`}>
          <div className="w-48 shrink-0 font-medium text-foreground/70">{row.label}</div>
          <div className="flex-1">{redact && row.redactable ? <span className="italic text-muted-foreground">[Redacted]</span> : row.value}</div>
        </div>
      ))}
    </div>
  );
}
