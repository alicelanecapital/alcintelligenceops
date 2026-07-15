import { supabase } from "@/integrations/supabase/client";

export type TeamMemberColor = "red" | "orange" | "amber" | "green" | "teal" | "blue" | "indigo" | "purple" | "pink" | "gray";

export const TEAM_MEMBER_COLORS: TeamMemberColor[] = ["red", "orange", "amber", "green", "teal", "blue", "indigo", "purple", "pink", "gray"];

export type TeamMember = {
  id: string;
  email: string;
  display_name: string | null;
  color: TeamMemberColor;
  created_at: string;
};

// team_members is new (20260716000000_team_members_accounts.sql) and not yet in the generated
// Supabase types -- cast until types.ts is regenerated post-migration.
export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const { data, error } = await (supabase.from("team_members" as any) as any)
    .select("*")
    .order("display_name", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as TeamMember[];
}

export async function addTeamMember(payload: { email: string; display_name?: string; color: TeamMemberColor }) {
  const { data, error } = await (supabase.from("team_members" as any) as any)
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data as TeamMember;
}

export async function updateTeamMember(id: string, payload: Partial<{ email: string; display_name: string; color: TeamMemberColor }>) {
  const { data, error } = await (supabase.from("team_members" as any) as any)
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as TeamMember;
}

export async function deleteTeamMember(id: string) {
  const { error } = await (supabase.from("team_members" as any) as any).delete().eq("id", id);
  if (error) throw error;
}
