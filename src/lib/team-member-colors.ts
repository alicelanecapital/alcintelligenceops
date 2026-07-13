import type { TeamMemberColor } from "@/lib/team-members";

export const COLOR_CLASSES: Record<TeamMemberColor, { dot: string; badge: string; border: string }> = {
  red: { dot: "bg-red-500", badge: "bg-red-100 text-red-800", border: "border-l-red-500" },
  orange: { dot: "bg-orange-500", badge: "bg-orange-100 text-orange-800", border: "border-l-orange-500" },
  amber: { dot: "bg-amber-500", badge: "bg-amber-100 text-amber-800", border: "border-l-amber-500" },
  green: { dot: "bg-green-500", badge: "bg-green-100 text-green-800", border: "border-l-green-500" },
  teal: { dot: "bg-teal-500", badge: "bg-teal-100 text-teal-800", border: "border-l-teal-500" },
  blue: { dot: "bg-blue-500", badge: "bg-blue-100 text-blue-800", border: "border-l-blue-500" },
  indigo: { dot: "bg-indigo-500", badge: "bg-indigo-100 text-indigo-800", border: "border-l-indigo-500" },
  purple: { dot: "bg-purple-500", badge: "bg-purple-100 text-purple-800", border: "border-l-purple-500" },
  pink: { dot: "bg-pink-500", badge: "bg-pink-100 text-pink-800", border: "border-l-pink-500" },
  gray: { dot: "bg-gray-400", badge: "bg-gray-100 text-gray-700", border: "border-l-gray-400" },
};

export const DEFAULT_COLOR_CLASSES = { dot: "bg-gray-300", badge: "bg-gray-100 text-gray-600", border: "border-l-gray-300" };
