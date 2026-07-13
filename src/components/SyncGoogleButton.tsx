import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getGoogleConnectionStatus, GOOGLE_SCOPES } from "@/lib/google-oauth.functions";
import { syncGoogleCalendarEvents } from "@/lib/google-calendar-sync.functions";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

/**
 * One button for both connecting and syncing Google Calendar: connects if not
 * yet linked, otherwise triggers an immediate sync. Also auto-syncs every 15
 * minutes while this screen is open, as a client-side backstop alongside the
 * server-side cron job (see /api/cron/sync-google-calendars).
 */
export function SyncGoogleButton() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const statusFn = useServerFn(getGoogleConnectionStatus);
  const syncFn = useServerFn(syncGoogleCalendarEvents);
  const status = useQuery({ queryKey: ["google-connection"], queryFn: () => statusFn() });

  const syncMut = useMutation({
    mutationFn: () => syncFn(),
    onSuccess: (result: any) => {
      toast.success(`Synced ${result.synced} calendar event${result.synced === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["google-connection"] });
      qc.invalidateQueries({ queryKey: ["upcoming-calendar-meetings"] });
      qc.invalidateQueries({ queryKey: ["all-meetings"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Sync failed"),
  });

  useEffect(() => {
    if (!status.data?.connected) return;
    const id = setInterval(() => syncMut.mutate(), FIFTEEN_MINUTES_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.data?.connected]);

  // Surface the redirect result from /auth/google/callback (always lands on /calendar?google=...).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("google");
    if (!result) return;
    if (result === "connected") {
      toast.success("Google account connected");
      qc.invalidateQueries({ queryKey: ["google-connection"] });
    } else if (result === "error") {
      toast.error("Google connection failed: " + (params.get("google_message") ?? "unknown error"));
    }
    window.history.replaceState({}, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function connect() {
    const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
    if (!clientId) {
      toast.error("Google OAuth isn't configured yet (VITE_GOOGLE_OAUTH_CLIENT_ID missing)");
      return;
    }
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPES,
      access_type: "offline",
      prompt: "consent",
      state: user?.email ?? "",
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => (status.data?.connected ? syncMut.mutate() : connect())}
      disabled={syncMut.isPending}
    >
      <RefreshCw className={`h-3.5 w-3.5 mr-1 ${syncMut.isPending ? "animate-spin" : ""}`} />
      {syncMut.isPending ? "Syncing…" : "Sync Google"}
    </Button>
  );
}
