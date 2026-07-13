import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getGoogleConnectionStatus, disconnectGoogle, GOOGLE_SCOPES } from "@/lib/google-oauth.functions";
import { syncGoogleCalendarEvents, listTeamGoogleConnections } from "@/lib/google-calendar-sync.functions";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LinkIcon, Unlink, RefreshCw, Users } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/accounts")({ component: () => <AppShell><AccountsScreen /></AppShell> });

function AccountsScreen() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const statusFn = useServerFn(getGoogleConnectionStatus);
  const disconnectFn = useServerFn(disconnectGoogle);
  const syncFn = useServerFn(syncGoogleCalendarEvents);
  const teamFn = useServerFn(listTeamGoogleConnections);

  const status = useQuery({ queryKey: ["google-connection"], queryFn: () => statusFn() });
  const team = useQuery({ queryKey: ["team-google-connections"], queryFn: () => teamFn() });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("google");
    if (!result) return;
    if (result === "connected") {
      toast.success("Google account connected");
      qc.invalidateQueries({ queryKey: ["google-connection"] });
      qc.invalidateQueries({ queryKey: ["team-google-connections"] });
    } else if (result === "error") {
      toast.error("Google connection failed: " + (params.get("google_message") ?? "unknown error"));
    }
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const disconnectMut = useMutation({
    mutationFn: () => disconnectFn(),
    onSuccess: () => {
      toast.success("Google disconnected");
      qc.invalidateQueries({ queryKey: ["google-connection"] });
      qc.invalidateQueries({ queryKey: ["team-google-connections"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to disconnect"),
  });

  const syncMut = useMutation({
    mutationFn: () => syncFn(),
    onSuccess: (result: any) => {
      if (result.reason === "not_connected") {
        toast.error("Connect your Google account first");
        return;
      }
      toast.success(`Synced ${result.synced} calendar event${result.synced === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["google-connection"] });
      qc.invalidateQueries({ queryKey: ["team-google-connections"] });
      qc.invalidateQueries({ queryKey: ["upcoming-calendar-meetings"] });
      qc.invalidateQueries({ queryKey: ["all-meetings"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Sync failed"),
  });

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
    <div className="max-w-4xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Admin"
        title="Accounts"
        description="Connect your Google account so your calendar meetings and emailed due-diligence documents show up across the app."
      />

      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="font-serif text-lg">Your Google account</div>
              <div className="text-sm text-muted-foreground mt-1">{user?.email}</div>
              {status.data?.connected && (
                <div className="text-xs text-muted-foreground mt-2">
                  Connected {status.data.connectedAt ? format(new Date(status.data.connectedAt), "d MMM yyyy") : ""}
                  {status.data.lastSyncedAt ? ` · Last synced ${format(new Date(status.data.lastSyncedAt), "d MMM yyyy, HH:mm")}` : " · Never synced"}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {status.data?.connected ? (
                <>
                  <Button onClick={() => syncMut.mutate()} disabled={syncMut.isPending}>
                    <RefreshCw className={`h-4 w-4 mr-1 ${syncMut.isPending ? "animate-spin" : ""}`} />
                    {syncMut.isPending ? "Syncing…" : "Sync calendar now"}
                  </Button>
                  <Button variant="outline" onClick={() => disconnectMut.mutate()} disabled={disconnectMut.isPending}>
                    <Unlink className="h-4 w-4 mr-1" /> Disconnect
                  </Button>
                </>
              ) : (
                <Button onClick={connect}>
                  <LinkIcon className="h-4 w-4 mr-1" /> Connect Google
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <div className="font-serif text-lg">Team accounts</div>
        </div>
        <div className="rounded-lg border border-border divide-y divide-border bg-card">
          {(team.data ?? []).map((t: any) => (
            <div key={t.user_email} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <div className="font-medium">{t.user_email}</div>
                <div className="text-xs text-muted-foreground">
                  Connected {format(new Date(t.connected_at), "d MMM yyyy")}
                  {t.last_synced_at ? ` · Last synced ${format(new Date(t.last_synced_at), "d MMM yyyy, HH:mm")}` : " · Never synced"}
                </div>
              </div>
              <Badge variant="outline">Connected</Badge>
            </div>
          ))}
          {team.isSuccess && !team.data?.length && (
            <div className="p-8 text-center text-sm text-muted-foreground">No team members have connected Google yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
