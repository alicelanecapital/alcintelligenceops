// Shared palette for contact categories. Used by the Contacts list badge,
// the Calendar meeting cells + legend, and anywhere else a contact needs
// consistent color coding.
export type ContactCategory = "founder" | "investor" | "ecosystem" | "vendor" | "unknown";

export const CONTACT_COLORS: Record<ContactCategory, {
  label: string;
  badge: string;   // solid/tinted pill for the Contacts list
  pastel: string;  // fully-shaded pastel for calendar cells
  dot: string;     // legend swatch
}> = {
  founder:   { label: "Founder",   badge: "bg-emerald-100 text-emerald-800 border-emerald-200", pastel: "bg-emerald-100 text-emerald-900", dot: "bg-emerald-500" },
  investor:  { label: "Investor",  badge: "bg-violet-100 text-violet-800 border-violet-200",    pastel: "bg-violet-100 text-violet-900",   dot: "bg-violet-500" },
  ecosystem: { label: "Ecosystem", badge: "bg-sky-100 text-sky-800 border-sky-200",              pastel: "bg-sky-100 text-sky-900",         dot: "bg-sky-500" },
  vendor:    { label: "Vendor",    badge: "bg-rose-100 text-rose-800 border-rose-200",           pastel: "bg-rose-100 text-rose-900",       dot: "bg-rose-500" },
  unknown:   { label: "Unknown",   badge: "bg-slate-100 text-slate-800 border-slate-200",        pastel: "bg-slate-100 text-slate-900",     dot: "bg-slate-400" },
};

export function contactColor(category: string | null | undefined) {
  const key = (category ?? "unknown") as ContactCategory;
  return CONTACT_COLORS[key] ?? CONTACT_COLORS.unknown;
}
