import { supabase } from "@/integrations/supabase/client";

export type Toolkit = {
  id: string;
  name: string;
  description: string | null;
  kind: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export async function listToolkits(): Promise<Toolkit[]> {
  const { data, error } = await (supabase as any)
    .from("toolkits")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Toolkit[];
}

export async function createToolkit(payload: { name: string; description?: string; kind?: string }) {
  const { data, error } = await (supabase as any)
    .from("toolkits")
    .insert({ name: payload.name, description: payload.description ?? null, kind: payload.kind ?? "custom" })
    .select()
    .single();
  if (error) throw error;
  return data as Toolkit;
}

export async function updateToolkit(id: string, payload: Partial<Pick<Toolkit, "name" | "description" | "sort_order">>) {
  const { error } = await (supabase as any).from("toolkits").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteToolkit(id: string) {
  const { error } = await (supabase as any).from("toolkits").delete().eq("id", id);
  if (error) throw error;
}

/** Copies a playbook including its saved Live Workspace layout, so a new workspace can start
 * from an existing design instead of the built-in default. */
export async function duplicateToolkit(id: string): Promise<Toolkit> {
  const { data: source, error: readError } = await (supabase as any)
    .from("toolkits")
    .select("name, description, kind, workspace_layout")
    .eq("id", id)
    .single();
  if (readError) throw readError;
  const { data, error } = await (supabase as any)
    .from("toolkits")
    .insert({
      name: `${source.name} (copy)`,
      description: source.description,
      kind: source.kind ?? "custom",
      workspace_layout: source.workspace_layout ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Toolkit;
}

/** How many meetings are still pointing at this playbook -- deleting one out from under a
 * live workspace would leave that meeting with no questions or panel layout. */
export async function countToolkitUsage(id: string): Promise<number> {
  const { count, error } = await (supabase as any)
    .from("interviews")
    .select("id", { count: "exact", head: true })
    .eq("playbook_id", id);
  if (error) throw error;
  return count ?? 0;
}
