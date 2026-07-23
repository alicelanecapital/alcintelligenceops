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
