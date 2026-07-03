import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) nav({ to: "/" }); }, [user, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      if (mode === "signup") {
        const redirect = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirect } });
        if (error) throw error;
        toast.success("Account created — you're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      nav({ to: "/" });
    } catch (err: any) { toast.error(err.message ?? "Failed"); } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        <div className="font-serif text-2xl">The Jungle</div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] opacity-70">Origination Hub</div>
          <h2 className="font-serif text-5xl mt-3 leading-tight">A repeatable deal-flow engine, not another CRM.</h2>
          <p className="opacity-80 mt-6 max-w-md">Events, founders, ecosystem intelligence and pipeline analytics — unified, with an AI layer that gets sharper with every interaction.</p>
        </div>
        <div className="text-xs opacity-60">Internal access only</div>
      </div>
      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{mode === "signup" ? "Create account" : "Sign in"}</div>
            <h1 className="font-serif text-3xl mt-1">Welcome back</h1>
          </div>
          <div className="space-y-3">
            <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label htmlFor="pw">Password</Label><Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          </div>
          <Button type="submit" disabled={busy} className="w-full">{busy ? "…" : mode === "signup" ? "Create account" : "Sign in"}</Button>
          <button type="button" className="text-xs text-muted-foreground hover:text-foreground w-full" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
            {mode === "signup" ? "Have an account? Sign in" : "First team member? Create an account"}
          </button>
          <p className="text-[11px] text-muted-foreground text-center">The first account becomes admin.</p>
        </form>
      </div>
    </div>
  );
}
