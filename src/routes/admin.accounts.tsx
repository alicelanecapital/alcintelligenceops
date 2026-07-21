import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { disconnectGoogle, getGoogleOAuthClientId, GOOGLE_SCOPES } from "@/lib/google-oauth.functions";
import { syncGoogleCalendarEvents, listTeamGoogleConnections, listGoogleSubCalendars, setHiddenCalendars } from "@/lib/google-calendar-sync.functions";
import { updateMyEmailSignature } from "@/lib/profile.functions";
import { fetchTeamMembers, addTeamMember, updateTeamMember, deleteTeamMember, TEAM_MEMBER_COLORS, type TeamMember, type TeamMemberColor } from "@/lib/team-members";
import { COLOR_CLASSES } from "@/lib/team-member-colors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LinkIcon, RefreshCw, Users, Plus, Trash2, Pencil, Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/admin/accounts")({ component: () => <AppShell><AccountsScreen /></AppShell> });

function EmailSignatureCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from("profiles").select("id, email_signature, display_name").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [signature, setSignature] = useState("");
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!q.isSuccess) return;
    const val = ((q.data as any)?.email_signature ?? "") as string;
    setSignature(val);
    if (editorRef.current && !initializedRef.current) {
      editorRef.current.innerHTML = val || "";
      initializedRef.current = true;
    }
  }, [q.isSuccess, q.data]);
  const saveFn = useServerFn(updateMyEmailSignature);
  const save = useMutation({
    mutationFn: async () => {
      const html = editorRef.current?.innerHTML ?? signature;
      return await saveFn({ data: { emailSignature: html } });
    },
    onSuccess: (res: any) => { toast.success(`Signature saved (${res.length} chars)`); qc.invalidateQueries({ queryKey: ["my-profile", user?.id] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  async function onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    // Prefer pasted HTML (preserves logos as <img> tags); fall back to files then plain text.
    const html = e.clipboardData.getData("text/html");
    if (html) {
      e.preventDefault();
      document.execCommand("insertHTML", false, sanitizeSignatureHtml(html));
      setSignature(editorRef.current?.innerHTML ?? "");
      return;
    }
    const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
    if (file) {
      e.preventDefault();
      const dataUrl = await readAsDataUrl(file);
      document.execCommand("insertHTML", false, `<img src="${dataUrl}" style="max-height:80px" />`);
      setSignature(editorRef.current?.innerHTML ?? "");
    }
  }

  return (
    <section className="mb-6">
      <div className="text-sm font-medium inline-flex items-center gap-2 mb-2"><Mail className="h-4 w-4" /> Your email signature</div>
      <div
        ref={editorRef}
        contentEditable
        onPaste={onPaste}
        onInput={(e) => setSignature((e.target as HTMLDivElement).innerHTML)}
        className="min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        suppressContentEditableWarning
      />
      <p className="text-[11px] text-muted-foreground mt-1">Paste your signature (logos and formatting are preserved). Automatically appended to every email sent from the Request Information modal.</p>
      <div className="flex justify-end mt-2">
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save signature"}</Button>
      </div>
    </section>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const ALLOWED_TAGS = new Set(["P","BR","SPAN","STRONG","EM","B","I","U","A","IMG","DIV","UL","OL","LI","TABLE","TR","TD","TH","TBODY","THEAD"]);
const ALLOWED_ATTRS: Record<string, string[]> = {
  A: ["href", "target", "rel"],
  IMG: ["src", "alt", "width", "height", "style"],
  SPAN: ["style"], DIV: ["style"], P: ["style"], TD: ["style"], TH: ["style"], TABLE: ["style", "cellpadding", "cellspacing", "border"],
};
function sanitizeSignatureHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild as HTMLElement;
  const walk = (node: Element) => {
    Array.from(node.children).forEach((child) => {
      if (!ALLOWED_TAGS.has(child.tagName)) {
        // Unwrap disallowed tag but keep children
        const parent = child.parentNode!;
        while (child.firstChild) parent.insertBefore(child.firstChild, child);
        parent.removeChild(child);
      } else {
        const allowed = ALLOWED_ATTRS[child.tagName] ?? [];
        Array.from(child.attributes).forEach((attr) => {
          if (!allowed.includes(attr.name.toLowerCase())) child.removeAttribute(attr.name);
          if (attr.name.toLowerCase() === "href" && attr.value.trim().toLowerCase().startsWith("javascript:")) child.removeAttribute("href");
        });
        walk(child);
      }
    });
  };
  walk(root);
  return root.innerHTML;
}

function SubCalendarsList({ email }: { email: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listGoogleSubCalendars);
  const hideFn = useServerFn(setHiddenCalendars);
  const q = useQuery({
    queryKey: ["sub-calendars", email],
    queryFn: () => listFn({ data: { targetEmail: email } }),
    staleTime: 5 * 60 * 1000,
  });
  const mut = useMutation({
    mutationFn: (hiddenIds: string[]) => hideFn({ data: { targetEmail: email, hiddenIds } }),
    onSuccess: () => {
      toast.success("Calendar visibility updated");
      qc.invalidateQueries({ queryKey: ["sub-calendars", email] });
      qc.invalidateQueries({ queryKey: ["upcoming-calendar-meetings"] });
      qc.invalidateQueries({ queryKey: ["all-meetings"] });
      qc.invalidateQueries({ queryKey: ["team-calendar-events"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update"),
  });
  if (q.isLoading) return <div className="text-[11px] text-muted-foreground mt-2 ml-6">Loading calendars…</div>;
  const cals = (q.data as any[]) ?? [];
  if (!cals.length) return null;
  const toggle = (id: string, nextHidden: boolean) => {
    const current = cals.filter((c) => c.hidden).map((c) => c.id as string);
    const next = nextHidden ? Array.from(new Set([...current, id])) : current.filter((x) => x !== id);
    mut.mutate(next);
  };
  return (
    <div className="mt-2 ml-6 space-y-1">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Sub-calendars — untick to keep private</div>
      {cals.map((c) => (
        <label key={c.id} className="flex items-center gap-2 text-[11px] cursor-pointer">
          <input
            type="checkbox"
            checked={!c.hidden}
            onChange={(e) => toggle(c.id, !e.target.checked)}
            disabled={mut.isPending}
          />
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.backgroundColor ?? "#94a3b8" }} />
          <span className="truncate">{c.summary}</span>
          {c.primary && <Badge variant="outline" className="text-[9px] px-1 py-0">Primary</Badge>}
          <span className="text-muted-foreground">· {c.accessRole}</span>
          {c.hidden && <Badge variant="outline" className="text-[9px] px-1 py-0 border-red-500 text-red-600">Hidden</Badge>}
        </label>
      ))}
    </div>
  );
}



function AccountsScreen() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const disconnectFn = useServerFn(disconnectGoogle);
  const syncFn = useServerFn(syncGoogleCalendarEvents);
  const teamFn = useServerFn(listTeamGoogleConnections);

  const connections = useQuery({ queryKey: ["team-google-connections"], queryFn: () => teamFn() });
  const members = useQuery({ queryKey: ["team-members"], queryFn: fetchTeamMembers });

  const [dialogState, setDialogState] = useState<{ open: boolean; member: TeamMember | null }>({ open: false, member: null });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("google");
    if (!result) return;
    if (result === "connected") {
      toast.success("Google account connected");
      qc.invalidateQueries({ queryKey: ["team-google-connections"] });
    } else if (result === "error") {
      toast.error("Google connection failed: " + (params.get("google_message") ?? "unknown error"));
    }
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const syncMut = useMutation({
    mutationFn: (targetEmail: string) => syncFn({ data: { targetEmail } }),
    onSuccess: (result: any) => {
      if (result.reason === "not_connected") {
        toast.error("That account isn't connected yet");
        return;
      }
      toast.success(`Synced ${result.synced} calendar event${result.synced === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["team-google-connections"] });
      qc.invalidateQueries({ queryKey: ["upcoming-calendar-meetings"] });
      qc.invalidateQueries({ queryKey: ["all-meetings"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Sync failed"),
  });

  const syncAllMut = useMutation({
    mutationFn: async (emails: string[]) => {
      let total = 0;
      for (const email of emails) {
        const result: any = await syncFn({ data: { targetEmail: email } });
        if (result.reason === "ok") total += result.synced;
      }
      return total;
    },
    onSuccess: (total) => {
      toast.success(`Synced ${total} calendar event${total === 1 ? "" : "s"} across all connected accounts`);
      qc.invalidateQueries({ queryKey: ["team-google-connections"] });
      qc.invalidateQueries({ queryKey: ["upcoming-calendar-meetings"] });
      qc.invalidateQueries({ queryKey: ["all-meetings"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Sync all failed"),
  });

  const updateColorMut = useMutation({
    mutationFn: ({ id, color }: { id: string; color: TeamMemberColor }) => updateTeamMember(id, { color }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-members"] }),
    onError: (e: any) => toast.error(e.message ?? "Failed to update colour"),
  });

  // The trash icon both removes the roster entry and disconnects its Google account (if
  // connected) in one action -- no separate "Disconnect" button.
  const deleteMemberMut = useMutation({
    mutationFn: async (member: TeamMember) => {
      await deleteTeamMember(member.id);
      await disconnectFn({ data: { targetEmail: member.email } });
    },
    onSuccess: () => {
      toast.success("Account removed and disconnected");
      qc.invalidateQueries({ queryKey: ["team-members"] });
      qc.invalidateQueries({ queryKey: ["team-google-connections"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to remove account"),
  });

  // targetEmail is the roster row being connected -- not necessarily the signed-in app
  // user's own email. Google's own account chooser lets you pick which Google identity to
  // authorize, so anyone signed in here can connect any Google account they personally have
  // access to (e.g. a second Gmail address of their own registered under a different row).
  async function connect(targetEmail: string) {
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
      state: targetEmail,
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  const connectionByEmail = new Map((connections.data ?? []).map((c: any) => [c.user_email, c]));
  const connectedEmails = (connections.data ?? []).map((c: any) => c.user_email as string);
  const myEmail = (user?.email ?? "").toLowerCase();
  const iAmRegistered = (members.data ?? []).some((m) => m.email.toLowerCase() === myEmail);

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Admin"
        title="Accounts"
        description="Connect Google accounts so calendar meetings and emailed due-diligence documents show up across the app."
        actions={
          <div className="flex items-center gap-2">
            {connectedEmails.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => syncAllMut.mutate(connectedEmails)} disabled={syncAllMut.isPending}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${syncAllMut.isPending ? "animate-spin" : ""}`} />
                {syncAllMut.isPending ? "Syncing all…" : "Sync all"}
              </Button>
            )}
            <Button size="sm" onClick={() => setDialogState({ open: true, member: null })}><Plus className="h-3.5 w-3.5 mr-1" /> Add account</Button>
          </div>
        }
      />

      <EmailSignatureCard />

      <p className="text-xs text-muted-foreground mb-4">
        Registering an account here gives it a name and a colour, used to tell calendar events apart on the Meetings screen.
        Click "Connect Google" on any row to link its calendar — Google's own account picker lets you choose which Google
        identity to authorize, so you can connect a second Google account of your own (registered under a different row)
        without needing to sign into this app as anyone else.
      </p>

      {!iAmRegistered && (
        <div className="rounded-lg border border-dashed border-border bg-card p-4 mb-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm text-muted-foreground">
            You ({user?.email}) aren't in the list below yet — add yourself to get a colour on the Meetings screen.
          </div>
          <Button size="sm" variant="outline" onClick={() => setDialogState({ open: true, member: { id: "", email: user?.email ?? "", display_name: null, color: "blue", created_at: "" } })}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add me
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-muted-foreground" />
        <div className="font-serif text-lg">Accounts</div>
      </div>

      <div className="bg-card space-y-2">
        {(members.data ?? []).map((m) => {
          const conn = connectionByEmail.get(m.email);
          const classes = COLOR_CLASSES[m.color];
          const isMe = m.email.toLowerCase() === myEmail;
          return (
            <div key={m.id} className="px-5 py-3 text-sm">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={cn("h-3 w-3 rounded-full shrink-0", classes.dot)} />
                  <div className="min-w-0">
                    <div className="font-medium truncate flex items-center gap-2">
                      {m.display_name || m.email}
                      {isMe && <Badge variant="outline" className="text-[10px]">You</Badge>}
                    </div>
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

                  {conn ? (
                    <Button size="sm" onClick={() => syncMut.mutate(m.email)} disabled={syncMut.isPending}>
                      <RefreshCw className={`h-3.5 w-3.5 mr-1 ${syncMut.isPending ? "animate-spin" : ""}`} />
                      {syncMut.isPending ? "Syncing…" : "Sync now"}
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => connect(m.email)}>
                      <LinkIcon className="h-3.5 w-3.5 mr-1" /> Connect Google
                    </Button>
                  )}

                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit account" onClick={() => setDialogState({ open: true, member: m })}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    title={conn ? "Remove and disconnect account" : "Remove account"}
                    onClick={() => deleteMemberMut.mutate(m)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {conn && <SubCalendarsList email={m.email} />}
            </div>
          );
        })}
        {members.isSuccess && !members.data?.length && (
          <div className="p-8 text-center text-sm text-muted-foreground">No accounts registered yet. Add one to get started.</div>
        )}
      </div>


      <AccountDialog
        open={dialogState.open}
        member={dialogState.member}
        onClose={() => setDialogState({ open: false, member: null })}
      />
    </div>
  );
}

function AccountDialog({ open, member, onClose }: { open: boolean; member: TeamMember | null; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!member?.id;
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [color, setColor] = useState<TeamMemberColor>("blue");

  useEffect(() => {
    if (open) {
      setEmail(member?.email ?? "");
      setDisplayName(member?.display_name ?? "");
      setColor(member?.color ?? "blue");
    }
  }, [open, member]);

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = { email: email.trim().toLowerCase(), display_name: displayName.trim() || undefined, color };
      return isEdit ? updateTeamMember(member!.id, payload) : addTeamMember(payload as { email: string; color: TeamMemberColor });
    },
    onSuccess: () => {
      toast.success(isEdit ? "Account updated" : "Account added");
      qc.invalidateQueries({ queryKey: ["team-members"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save account"),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? "Edit account" : "Add account"}</DialogTitle></DialogHeader>
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMut.mutate()} disabled={!email.trim() || saveMut.isPending}>
            {saveMut.isPending ? "Saving…" : isEdit ? "Save changes" : "Add account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
