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
  company_id: string | null;
  owner_id: string | null;
  photo_url: string | null;
  sector: string | null;
  stakeholder_brief: { summary?: string; background_points?: string[] } | null;
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

/** Finds an existing company by case-insensitive name match, creating one if needed.
 * Lets many contacts share a single company record (and its Companies-page profile)
 * just by typing the same company name, without changing the Add/Edit Contact UI. */
export async function resolveCompanyId(name: string | null | undefined): Promise<string | null> {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return null;
  const { data: existing, error: findError } = await supabase
    .from("companies")
    .select("id")
    .ilike("name", trimmed)
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return (existing as any).id;
  const { data: created, error: createError } = await supabase
    .from("companies")
    .insert({ name: trimmed } as any)
    .select("id")
    .single();
  if (createError) throw createError;
  return (created as any).id;
}

export async function createContact(input: Partial<Omit<ContactRow, "source_event">>) {
  const payload: any = { ...input };
  if (!payload.name) throw new Error("Name is required");
  if (!payload.category) payload.category = "ecosystem";
  payload.company_id = await resolveCompanyId(payload.company);
  const { data, error } = await supabase.from("contacts").insert(payload).select("*").single();
  if (error) throw error;
  return data as unknown as ContactRow;
}

export async function updateContact(id: string, input: Partial<Omit<ContactRow, "source_event">>) {
  const payload: any = { ...input };
  if ("company" in payload) payload.company_id = await resolveCompanyId(payload.company);
  const { data, error } = await supabase.from("contacts").update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  return data as unknown as ContactRow;
}

export async function deleteContact(id: string) {
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw error;
}

/** Extracts the object path from a stored photo_url value, which may be either a
 * raw storage path (new format) or a legacy public URL from when the bucket was public. */
export function contactPhotoPath(photo_url: string | null | undefined): string | null {
  if (!photo_url) return null;
  const marker = "/contact-photos/";
  const idx = photo_url.indexOf(marker);
  if (idx >= 0) return photo_url.slice(idx + marker.length).split("?")[0];
  // Not a URL — assume it's already a bucket-relative path.
  if (!/^https?:\/\//i.test(photo_url)) return photo_url;
  return null;
}

/** Resolve a stored contact photo reference to a signed URL for rendering. */
export async function resolveContactPhotoUrl(photo_url: string | null | undefined): Promise<string | null> {
  const path = contactPhotoPath(photo_url);
  if (!path) return null;
  const { data, error } = await supabase.storage.from("contact-photos").createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Uploads a profile photo to the private contact-photos bucket. The bucket-relative
 * path is stored on the contact and resolved to a short-lived signed URL at render time. */
export async function uploadContactPhoto(contactId: string, file: File): Promise<string | null> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${contactId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("contact-photos").upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;
  await updateContact(contactId, { photo_url: path });
  const { data } = await supabase.storage.from("contact-photos").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

/** Every distinct company name already in use across contacts, for the Company combobox's
 * "pick an existing one" suggestions. Sourced from the free-text field itself (not just the
 * companies table) so it also surfaces legacy names never formally linked via company_id. */
export async function fetchCompanyNameSuggestions(): Promise<string[]> {
  const { data, error } = await supabase.from("contacts").select("company").not("company", "is", null);
  if (error) throw error;
  const names = new Set<string>();
  for (const row of (data ?? []) as any[]) {
    const c = (row.company ?? "").trim();
    if (c) names.add(c);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export async function fetchContactsByCompany(companyId: string) {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("company_id", companyId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as unknown as ContactRow[];
}

/** Matches on the free-text company name rather than company_id, so it still finds
 * siblings for contacts created before company_id existed / was backfilled. Used by the
 * Edit Contact modal to show "other contacts at this organisation" as you type/edit. */
export async function fetchContactsByCompanyName(companyName: string, excludeId?: string) {
  const trimmed = companyName.trim();
  if (!trimmed) return [] as ContactRow[];
  let q = supabase.from("contacts").select("*").ilike("company", trimmed).order("name");
  if (excludeId) q = q.neq("id", excludeId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as ContactRow[];
}

export async function fetchContactMeetings(contactId: string) {
  const { data, error } = await (supabase.from("interviews") as any)
    .select("*")
    .eq("contact_id", contactId)
    .eq("hidden", false)
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
