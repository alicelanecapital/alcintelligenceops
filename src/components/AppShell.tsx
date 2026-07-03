import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect, type ReactNode } from "react";
import { LayoutDashboard, Calendar, Kanban, Users, Map, Contact2, BarChart3, LogOut, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Daily Briefing", icon: LayoutDashboard },
  { to: "/events", label: "Events", icon: Calendar },
  { to: "/deals", label: "Deal Flow", icon: Kanban },
  { to: "/founders", label: "Founders", icon: Users },
  { to: "/ecosystem", label: "Ecosystem Map", icon: Map },
  { to: "/contacts", label: "Contacts", icon: Contact2 },
  { to: "/analytics", label: "Pipeline Analytics", icon: BarChart3 },
];

export function AppShell({ children }: { children?: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const nav_ = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    if (!loading && !user && loc.pathname !== "/auth") nav_({ to: "/auth" });
  }, [user, loading, loc.pathname, nav_]);
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return null;
  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="px-6 py-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="font-serif text-xl leading-none">The Jungle</div>
              <div className="text-[10px] uppercase tracking-widest opacity-70 mt-1">Origination Hub</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((n) => {
            const active = loc.pathname === n.to || (n.to !== "/" && loc.pathname.startsWith(n.to));
            const Icon = n.icon;
            return (
              <Link key={n.to} to={n.to} className={cn("flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active ? "bg-sidebar-accent text-sidebar-primary" : "hover:bg-sidebar-accent/60")}>
                <Icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border text-xs">
          <div className="px-3 pb-2 opacity-70 truncate">{user.email}</div>
          <button onClick={() => signOut()} className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-sidebar-accent/60">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-x-hidden">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
