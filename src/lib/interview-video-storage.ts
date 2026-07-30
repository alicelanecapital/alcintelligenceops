// Client-side storage helpers for uploaded interview videos (behavioral-signals source).
// Private bucket -- playback goes through short-lived signed URLs, never a public URL.
import { supabase } from "@/integrations/supabase/client";

export async function uploadInterviewVideo(interviewId: string, file: File): Promise<string> {
  const path = `${interviewId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("interview-videos").upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

export async function getInterviewVideoSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("interview-videos").createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteBehavioralSignals(analysisId: string, videoPath?: string | null) {
  if (videoPath) {
    await supabase.storage.from("interview-videos").remove([videoPath]);
  }
  const { error } = await supabase.from("interview_analyses").delete().eq("id", analysisId);
  if (error) throw error;
}
