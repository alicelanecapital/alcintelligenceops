import { supabase } from "@/integrations/supabase/client";

export type ContactCategoryOption = { value: string; label: string };

export async function listContactCategoryOptions(): Promise<ContactCategoryOption[]> {
  const { data, error } = await (supabase.from("contact_categories" as any) as any)
    .select("value, label")
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

/** Slugifies a user-typed category name into a stable value (e.g. "Key Advisor" -> "key_advisor"),
 * then persists it so it's offered in the dropdown from now on for every user. */
export async function createContactCategory(label: string): Promise<ContactCategoryOption> {
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Category name is required");
  const value = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "custom";
  const { data, error } = await (supabase.from("contact_categories" as any) as any)
    .upsert({ value, label: trimmed }, { onConflict: "value", ignoreDuplicates: true })
    .select("value, label")
    .maybeSingle();
  if (error) throw error;
  return data ?? { value, label: trimmed };
}
