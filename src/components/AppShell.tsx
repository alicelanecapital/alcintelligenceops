import { Link, Outlet, useLocation, Navigate, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LayoutDashboard, Calendar, CalendarDays, Kanban, Users, Map, BarChart3, MessagesSquare, Building2, Target, ShieldCheck, LogOut, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const navGroups = [
  {
    label: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/calendar", label: "Calendar", icon: CalendarDays },
      { to: "/events", label: "Events", icon: Calendar },
      { to: "/contacts", label: "Contacts", icon: Users },
      { to: "/interviews", label: "Engagements", icon: MessagesSquare },
      { to: "/dd-engine", label: "Deal Pipeline", icon: Kanban },
    ],
  },
  {
    label: "Admin",
    items: [
      { to: "/admin/dd-framework", label: "DD Intelligence Engine", icon: ShieldCheck },
      { to: "/admin/accounts", label: "Accounts", icon: UserCog },
    ],
  },

];

export function AppShell({ children }: { children?: ReactNode }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const { session, loading, signOut, user } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  if (!session) return <Navigate to="/auth" />;
  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
        <div className="px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-serif text-lg">
              A
            </div>
            <div>
              <div className="font-serif text-xl leading-none">Alice Lane</div>
              <div className="text-[10px] uppercase tracking-[0.2em] opacity-60 mt-1">Operations</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 pt-24 pb-6 space-y-5 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="px-3 mb-1.5 text-[10px] uppercase tracking-[0.15em] text-forest-grey">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map((n) => {
                  const active = loc.pathname === n.to || (n.to !== "/" && loc.pathname.startsWith(n.to));
                  const Icon = n.icon;
                  return (
                    <Link
                      key={n.to}
                      to={n.to}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                        active
                          ? "bg-forest text-white"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" /> {n.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <div className="text-[11px] text-sidebar-foreground/60 truncate">{user?.email}</div>
          <button
            onClick={async () => { await signOut(); navigate({ to: "/auth" }); }}
            className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-sidebar-foreground/70 hover:text-sidebar-foreground"
          >
            <LogOut className="h-3 w-3" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-x-hidden">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
