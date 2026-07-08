// Badge color system - maps category names to Tailwind classes
export const BADGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  // Event scoring categories
  "Cost": { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
  "Deal Flow": { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" },
  "Investor Access": { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" },
  "Strategic Partnerships": { bg: "bg-pink-100", text: "text-pink-800", border: "border-pink-300" },
  "Government Access": { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
  "Market Intelligence": { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" },
  "Industry Insights": { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-300" },
  "Brand Visibility": { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" },
  "Learning & Development": { bg: "bg-cyan-100", text: "text-cyan-800", border: "border-cyan-300" },
  "Long-Term Opportunity": { bg: "bg-teal-100", text: "text-teal-800", border: "border-teal-300" },

  // Opportunity mess classifications
  "Green": { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" },
  "Amber": { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300" },
  "Red": { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" },
  "Black": { bg: "bg-neutral-900", text: "text-white", border: "border-neutral-900" },
  "Strategic": { bg: "bg-primary/10", text: "text-primary", border: "border-primary/30" },
};

export function getBadgeColor(category: string) {
  return BADGE_COLORS[category] || { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-300" };
}
