import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getGoogleConnectionStatus, disconnectGoogle, getGoogleOAuthClientId, GOOGLE_SCOPES } from "@/lib/google-oauth.functions";
import { syncGoogleCalendarEvents, listTeamGoogleConnections } from "@/lib/google-calendar-sync.functions";
import { fetchTeamMembers, addTeamMember, updateTeamMember, deleteTeamMember, TEAM_MEMBER_COLORS, type TeamMemberColor } from "@/lib/team-members";
import { COLOR_CLASSES } from "@/lib/team-member-colors";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { LinkIcon, Unlink, RefreshCw, Users, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/accounts")({ component: () => <AppShell><AccountsScreen /></AppShell> });

function AccountsScreen() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const statusFn = useServerFn(getGoogleConnectionStatus);
  const disconnectFn = useServerFn(disconnectGoogle);
  const syncFn = useServerFn(syncGoogleCalendarEvents);
  const teamFn = useServerFn(listTeamGoogleConnections);

  const status = useQuery({ queryKey: ["google-connection"], queryFn: () => statusFn() });
  const connections = useQuery({ queryKey: ["team-google-connections"], queryFn: () => teamFn() });
  const members = useQuery({ queryKey: ["team-members"], queryFn: fetchTeamMembers });

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

  const updateColorMut = useMutation({
    mutationFn: ({ id, color }: { id: string; color: TeamMemberColor }) => updateTeamMember(id, { color }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-members"] }),
    onError: (e: any) => toast.error(e.message ?? "Failed to update colour"),
  });

  const deleteMemberMut = useMutation({
    mutationFn: (id: string) => deleteTeamMember(id),
    onSuccess: () => {
      toast.success("Account removed");
      qc.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to remove account"),
  });

  async function connect() {
    const { clientId } = await getGoogleOAuthClientId();
    if (!clientId) {
      toast.error("Google OAuth isn't configured yet (GOOGLE_OAUTH_CLIENT_ID missing on the server)");
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

  const connectionByEmail = new Map((connections.data ?? []).map((c: any) => [c.user_email, c]));

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
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="font-serif text-lg">Team accounts</div>
          </div>
          <AddAccountDialog />
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Register teammates and shared inboxes here, and give each a colour used to tell their calendar events apart on the
          Meetings screen. Each person still has to click "Connect Google" themselves from their own signed-in session to
          actually sync their calendar.
        </p>
        <div className="rounded-lg border border-border divide-y divide-border bg-card">
          {(members.data ?? []).map((m) => {
            const conn = connectionByEmail.get(m.email);
            const classes = COLOR_CLASSES[m.color];
            return (
              <div key={m.id} className="flex items-center justify-between px-5 py-3 text-sm gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={cn("h-3 w-3 rounded-full shrink-0", classes.dot)} />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{m.display_name || m.email}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {m.display_name ? `${m.email} · ` : ""}
                      {conn
                        ? `Connected ${format(new Date(conn.connected_at), "d MMM yyyy")}${conn.last_synced_at ? ` · Last synced ${format(new Date(conn.last_synced_at), "d MMM yyyy, HH:mm")}` : " · Never synced"}`
                        : "Not connected yet"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={m.color}
                    onChange={(e) => updateColorMut.mutate({ id: m.id, color: e.target.value as TeamMemberColor })}
                    className="h-8 text-xs border border-input rounded-md bg-background px-2 capitalize"
                  >
                    {TEAM_MEMBER_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {conn ? <Badge variant="outline">Connected</Badge> : <Badge variant="secondary">Not connected</Badge>}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    title="Remove account"
                    onClick={() => deleteMemberMut.mutate(m.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
          {members.isSuccess && !members.data?.length && (
            <div className="p-8 text-center text-sm text-muted-foreground">No accounts registered yet. Add one to get started.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function AddAccountDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [color, setColor] = useState<TeamMemberColor>("blue");

  const addMut = useMutation({
    mutationFn: () => addTeamMember({ email: email.trim().toLowerCase(), display_name: displayName.trim() || undefined, color }),
    onSuccess: () => {
      toast.success("Account added");
      qc.invalidateQueries({ queryKey: ["team-members"] });
      setOpen(false);
      setEmail("");
      setDisplayName("");
      setColor("blue");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to add account"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Add account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add team account</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@alicelanecapital.com" className="mt-1" />
          </div>
          <div>
            <Label>Display name (optional)</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Tendai" className="mt-1" />
          </div>
          <div>
            <Label>Colour</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {TEAM_MEMBER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  title={c}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform",
                    COLOR_CLASSES[c].dot,
                    color === c ? "border-foreground scale-110" : "border-transparent",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => addMut.mutate()} disabled={!email.trim() || addMut.isPending}>
            {addMut.isPending ? "Adding…" : "Add account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
