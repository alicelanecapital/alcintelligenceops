import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

async function callAI(system: string, user: string): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI gateway ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content ?? "").trim();
}

// Generates a short "what does this company do" description for the Add Contact
// wizard. Used to populate contacts.company_description, which then flows into
// opportunities.description (via createOpportunityFromContact below) and is shown
// in the DD wizard's fixed company panel.
export const generateCompanyDescription = createServerFn({ method: "POST" })
  .inputValidator((d: { company: string; website?: string; position?: string }) => d)
  .handler(async ({ data }) => {
    if (!data.company?.trim()) throw new Error("Company name is required");
    const user = `Company name: ${data.company}
${data.website ? `Website: ${data.website}` : ""}
${data.position ? `Contact's role there: ${data.position}` : ""}

Write a concise 1-2 sentence description of what this company does (its product/service and target market). If you don't have specific knowledge of this company, make a reasonable, clearly-general inference from its name and any context given rather than inventing false specifics.`;
    const description = await callAI(
      "You are a research analyst writing crisp one-line company descriptions for an investor's CRM. Return plain text only, no markdown, no preamble.",
      user,
    );
    return { description };
  });

// Start a meeting for a contact: creates an interview row linked back to the contact + event.
export const startMeetingForContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { contactId: string; meetingType?: string; interviewer?: string }) => d)
  .handler(async ({ data, context }) => {
    const s = context.supabase;

    const { data: contact, error } = await s
      .from("contacts")
      .select("*, source_event:events(id, name)")
      .eq("id", data.contactId)
      .maybeSingle();
    if (error) throw error;
    if (!contact) throw new Error("Contact not found");

    const c: any = contact;
    const founderName = c.name;
    const businessName = c.company ?? c.name;

    const { data: row, error: insErr } = await s
      .from("interviews")
      .insert({
        contact_id: c.id,
        event_id: c.source_event_id,
        founder_id: c.legacy_founder_id ?? null,
        organisation_id: c.organisation_id ?? null,
        title: `${founderName} · ${businessName}`,
        founder_name: founderName,
        business_name: businessName,
        industry: null,
        interviewer_name: data.interviewer ?? null,
        status: "draft",
        meeting_type: data.meetingType ?? "intro",
      } as any)
      .select("*")
      .single();
    if (insErr) throw insErr;

    // Bump last_interaction_at on the contact
    await s.from("contacts").update({ last_interaction_at: new Date().toISOString() } as any).eq("id", c.id);

    return row;
  });

// Create an opportunity from a contact, pulling in the latest meeting context.
export const createOpportunityFromContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { contactId: string }) => d)
  .handler(async ({ data, context }) => {
    const s = context.supabase;

    // De-dupe: return the existing opportunity for this contact if one already exists.
    // Prevents duplicate deals when Request Info is re-sent to chase missing documents.
    const { data: existing } = await s
      .from("opportunities")
      .select("*")
      .eq("contact_id", data.contactId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) return existing;

    const { data: contact, error } = await s
      .from("contacts")
      .select("*, source_event:events(id, name)")
      .eq("id", data.contactId)
      .maybeSingle();
    if (error) throw error;
    if (!contact) throw new Error("Contact not found");
    const c: any = contact;

    // Latest meeting + report
    const { data: meetings } = await s
      .from("interviews")
      .select("*")
      .eq("contact_id", c.id)
      .order("created_at", { ascending: false })
      .limit(1);
    const latest = meetings?.[0];

    let summary = c.company_description || c.ai_summary || "";
    if (latest) {
      const { data: report } = await s
        .from("interview_reports")
        .select("body")
        .eq("interview_id", (latest as any).id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (report && (report as any).body?.executive_summary) {
        summary = (report as any).body.executive_summary;
      }
    }

    const { data: opp, error: oppErr } = await s
      .from("opportunities")
      .insert({
        name: c.company ?? c.name,
        contact_id: c.id,
        event_id: c.source_event_id,
        meeting_id: (latest as any)?.id ?? null,
        founder_id: c.legacy_founder_id ?? null,
        company_id: null,
        current_stage: "Screening",
        priority: "Medium",
        source: (c.source_event as any)?.name ?? "Contact",
        summary,
        description: c.company_description || summary,
      } as any)
      .select("*")
      .single();
    if (oppErr) throw oppErr;

    return opp;
  });

// ---- Merge duplicate contacts -------------------------------------------------

type ContactLite = {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  position: string | null;
  website: string | null;
  linkedin: string | null;
  notes: string | null;
  ai_summary: string | null;
  company_description: string | null;
  source_event_id: string | null;
  date_met: string | null;
  category: string | null;
  status: string | null;
  created_at: string;
};

const normEmail = (v: string | null) => {
  const s = (v ?? "").trim().toLowerCase();
  if (!s || !s.includes("@")) return null;
  const [local, domain] = s.split("@");
  const cleanLocal = local.split("+")[0];
  return `${cleanLocal}@${domain}`;
};
const normPhone = (v: string | null) => {
  const digits = (v ?? "").replace(/\D/g, "");
  if (digits.length < 7) return null;
  return digits.slice(-9); // last 9 digits — tolerates country code / spaces / formatting
};
const normText = (v: string | null) => (v ?? "").trim().toLowerCase() || null;

type GroupInfo = { members: ContactLite[]; reasons: Set<string> };

function groupDuplicates(rows: ContactLite[]): { group: ContactLite[]; reasons: string[] }[] {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const p = parent.get(x) ?? x;
    if (p === x) return x;
    const r = find(p);
    parent.set(x, r);
    return r;
  };
  const union = (a: string, b: string) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  rows.forEach((r) => parent.set(r.id, r.id));

  const reasonsByRoot = new Map<string, Set<string>>();
  const addReason = (id: string, reason: string) => {
    const root = find(id);
    const set = reasonsByRoot.get(root) ?? new Set<string>();
    set.add(reason);
    reasonsByRoot.set(root, set);
  };

  const byKey = new Map<string, { id: string; reason: string }>();
  const link = (key: string | null, reason: string, id: string) => {
    if (!key) return;
    const prev = byKey.get(key);
    if (prev) {
      union(prev.id, id);
      addReason(id, reason);
    } else {
      byKey.set(key, { id, reason });
    }
  };
  for (const r of rows) {
    const e = normEmail(r.email);
    const p = normPhone(r.phone);
    const n = normText(r.name), c = normText(r.company);
    link(e && `e:${e}`, "Same email", r.id);
    link(p && `p:${p}`, "Same phone", r.id);
    if (n && c) link(`nc:${n}|${c}`, "Same name + company", r.id);
  }

  // migrate reasons whose root changed after later unions
  const finalReasons = new Map<string, Set<string>>();
  for (const [root, set] of reasonsByRoot) {
    const newRoot = find(root);
    const target = finalReasons.get(newRoot) ?? new Set<string>();
    set.forEach((s) => target.add(s));
    finalReasons.set(newRoot, target);
  }

  const groups = new Map<string, ContactLite[]>();
  for (const r of rows) {
    const root = find(r.id);
    const arr = groups.get(root) ?? [];
    arr.push(r);
    groups.set(root, arr);
  }
  return [...groups.entries()]
    .filter(([, g]) => g.length > 1)
    .map(([root, g]) => ({ group: g, reasons: [...(finalReasons.get(root) ?? new Set())] }));
}

export const previewDuplicateContacts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = context.supabase;
    const { data, error } = await s.from("contacts").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    const groups = groupDuplicates((data ?? []) as any);
    return {
      groupCount: groups.length,
      duplicateCount: groups.reduce((n, g) => n + (g.group.length - 1), 0),
      groups: groups.map(({ group, reasons }) => ({
        keep: group[0].id,
        keepLabel: group[0].name || group[0].company || group[0].email || "(unnamed)",
        reasons,
        members: group.map((m) => ({ id: m.id, label: m.name || m.company || m.email || "(unnamed)" })),
      })),
    };
  });

export const mergeDuplicateContacts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { selection?: { keepId: string; dupeIds: string[] }[] } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    const { data: rows, error } = await s.from("contacts").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    const allRows = (rows ?? []) as any as ContactLite[];
    const byId = new Map(allRows.map((r) => [r.id, r]));

    let plan: { keep: ContactLite; dupes: ContactLite[] }[];
    if (data.selection && data.selection.length) {
      plan = data.selection
        .map((sel) => {
          const keep = byId.get(sel.keepId);
          const dupes = sel.dupeIds.map((id) => byId.get(id)).filter(Boolean) as ContactLite[];
          return keep && dupes.length ? { keep, dupes } : null;
        })
        .filter(Boolean) as any;
    } else {
      const groups = groupDuplicates(allRows);
      plan = groups.map(({ group }) => ({ keep: group[0], dupes: group.slice(1) }));
    }

    let merged = 0;
    for (const { keep, dupes } of plan) {
      const patch: any = {};
      const fields: (keyof ContactLite)[] = [
        "name","company","email","phone","position","website","linkedin",
        "notes","ai_summary","company_description","source_event_id","date_met","status",
      ];
      for (const f of fields) {
        if (!keep[f]) {
          const filled = dupes.find((d) => d[f]);
          if (filled) patch[f] = filled[f];
        }
      }
      const notesPieces = [keep.notes, ...dupes.map((d) => d.notes)].filter(Boolean) as string[];
      const uniqueNotes = [...new Set(notesPieces.map((n) => n.trim()))].join("\n---\n");
      if (uniqueNotes && uniqueNotes !== (keep.notes ?? "").trim()) patch.notes = uniqueNotes;

      if (Object.keys(patch).length) {
        await s.from("contacts").update(patch).eq("id", keep.id);
      }
      const dupIds = dupes.map((d) => d.id);
      await s.from("opportunities").update({ contact_id: keep.id } as any).in("contact_id", dupIds);
      await s.from("interviews").update({ contact_id: keep.id } as any).in("contact_id", dupIds);
      await s.from("event_attendees").update({ contact_id: keep.id } as any).in("contact_id", dupIds);
      await s.from("founders").update({ contact_id: keep.id } as any).in("contact_id", dupIds);
      await s.from("contacts").delete().in("id", dupIds);
      merged += dupIds.length;
    }
    return { mergedCount: merged, groupCount: plan.length };
  });


