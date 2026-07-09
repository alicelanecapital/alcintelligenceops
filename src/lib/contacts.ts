import { supabase } from "@/integrations/supabase/client";

export type ContactCategory = "founder" | "investor" | "ecosystem" | "vendor" | "unknown";

export type ContactRow = {
  id: string;
  name: string;
  category: string;
  company: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  website: string | null;
  notes: string | null;
  ai_summary: string | null;
  company_description: string | null;
  relationship_score: number | null;
  last_interaction_at: string | null;
  status: string | null;
  tags: string[] | null;
  source_event_id: string | null;
  date_met: string | null;
  organisation_id: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  source_event?: { id: string; name: string } | null;
};

export const CATEGORY_LABELS: Record<string, string> = {
  founder: "Founder",
  investor: "Investor",
  ecosystem: "Ecosystem",
  vendor: "Vendor",
  unknown: "Unknown",
};

export const CATEGORY_OPTIONS = [
  { value: "founder", label: "Founder" },
  { value: "investor", label: "Investor" },
  { value: "ecosystem", label: "Ecosystem" },
  { value: "vendor", label: "Vendor" },
  { value: "unknown", label: "Unknown" },
];

export async function fetchContacts(category?: string) {
  let q = supabase
    .from("contacts")
    .select("*, source_event:events(id, name)")
    .order("name");
  if (category && category !== "all") q = q.eq("category", category);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as ContactRow[];
}

export async function fetchContact(id: string) {
  const { data, error } = await supabase
    .from("contacts")
    .select("*, source_event:events(id, name, start_date, city, country)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as ContactRow | null;
}

export async function createContact(input: Partial<Omit<ContactRow, "source_event">>) {
  const payload: any = { ...input };
  if (!payload.name) throw new Error("Name is required");
  if (!payload.category) payload.category = "ecosystem";
  const { data, error } = await supabase.from("contacts").insert(payload).select("*").single();
  if (error) throw error;
  return data as unknown as ContactRow;
}

export async function updateContact(id: string, input: Partial<Omit<ContactRow, "source_event">>) {
  const { data, error } = await supabase.from("contacts").update(input as any).eq("id", id).select("*").single();
  if (error) throw error;
  return data as unknown as ContactRow;
}

export async function deleteContact(id: string) {
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchContactMeetings(contactId: string) {
  const { data, error } = await supabase
    .from("interviews")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchContactOpportunities(contactId: string) {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
