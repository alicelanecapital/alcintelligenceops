import { Link, Outlet, useLocation, Navigate, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  LayoutDashboard, Calendar, CalendarDays, Kanban, Users, Map, BarChart3, MessagesSquare,
  Building2, ShieldCheck, LogOut, UserCog, LayoutTemplate, FileText, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

type NavItem = {
  to?: string;
  label: string;
  icon: typeof LayoutDashboard;
  children?: NavItem[];
};

const navGroups: { label: string; items: NavItem[] }[] = [
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
      { to: "/contacts", label: "Organisations", icon: Users },
      { to: "/interviews", label: "Meetings", icon: MessagesSquare },
      { to: "/dd-engine", label: "Deal Pipeline", icon: Kanban },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        label: "Templates",
        icon: LayoutTemplate,
        children: [
          { to: "/admin/toolkits", label: "Playbooks", icon: ShieldCheck },
          { to: "/admin/templates", label: "Reports", icon: FileText },
        ],
      },
      { to: "/admin/accounts", label: "Accounts", icon: UserCog },
    ],
  },
];

/** Every `to` under a node, used to work out whether a collapsed group contains the
 * currently active route so it can auto-expand on load. */
function collectPaths(item: NavItem): string[] {
  const own = item.to ? [item.to] : [];
  const nested = item.children?.flatMap(collectPaths) ?? [];
  return [...own, ...nested];
}

function isActivePath(pathname: string, to: string) {
  return pathname === to || (to !== "/" && pathname.startsWith(to));
}

export function AppShell({ children }: { children?: ReactNode }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const { session, loading, signOut, user } = useAuth();

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const group of navGroups) {
      for (const item of group.items) {
        if (item.children && collectPaths(item).some((p) => isActivePath(loc.pathname, p))) {
          initial.add(item.label);
        }
        for (const child of item.children ?? []) {
          if (child.children && collectPaths(child).some((p) => isActivePath(loc.pathname, p))) {
            initial.add(child.label);
          }
        }
      }
    }
    return initial;
  });

  function toggle(label: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  }

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
                {group.items.map((item) => (
                  <NavNode key={item.label} item={item} depth={0} pathname={loc.pathname} expanded={expanded} onToggle={toggle} />
                ))}
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

function NavNode({ item, depth, pathname, expanded, onToggle }: {
  item: NavItem;
  depth: number;
  pathname: string;
  expanded: Set<string>;
  onToggle: (label: string) => void;
}) {
  const Icon = item.icon;
  const hasChildren = !!item.children?.length;
  const isOpen = expanded.has(item.label);
  const active = item.to ? isActivePath(pathname, item.to) : false;
  const containsActive = hasChildren && collectPaths(item).some((p) => isActivePath(pathname, p));

  const rowClass = cn(
    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
    depth > 0 && "ml-3",
    active
      ? "bg-forest text-white"
      : containsActive
      ? "text-sidebar-accent-foreground font-medium"
      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
  );

  const label = (
    <>
      <Icon className="h-4 w-4 shrink-0" /> <span className="flex-1 truncate">{item.label}</span>
      {hasChildren && (
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", isOpen ? "rotate-180" : "")} />
      )}
    </>
  );

  return (
    <div>
      {item.to ? (
        <div className={rowClass}>
          <Link to={item.to} className="flex items-center gap-3 flex-1 min-w-0">
            <Icon className="h-4 w-4 shrink-0" /> <span className="truncate">{item.label}</span>
          </Link>
          {hasChildren && (
            <button onClick={() => onToggle(item.label)} className="shrink-0" aria-label={`Toggle ${item.label}`}>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen ? "rotate-180" : "")} />
            </button>
          )}
        </div>
      ) : (
        <button onClick={() => onToggle(item.label)} className={cn(rowClass, "w-full text-left")}>
          {label}
        </button>
      )}
      {hasChildren && isOpen && (
        <div className="mt-1 space-y-1">
          {item.children!.map((child) => (
            <NavNode key={child.label} item={child} depth={depth + 1} pathname={pathname} expanded={expanded} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
}
