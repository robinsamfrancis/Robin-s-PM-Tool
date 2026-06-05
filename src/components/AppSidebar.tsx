import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Home,
  LayoutGrid,
  Plus,
  Search,
  Star,
  Sparkles,
  LogOut,
} from "lucide-react";
import { BpmLogo } from "@/components/BpmLogo";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { store } = useWorkspaceStore();
  const [workspaceOpen, setWorkspaceOpen] = useState(true);
  const [query, setQuery] = useState("");

  const workspaces = store.workspaces;
  const filtered = workspaces.filter(
    (w) =>
      w.name.toLowerCase().includes(query.toLowerCase()) ||
      w.code.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <aside className="hidden lg:flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar sticky top-0">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <BpmLogo />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <SidebarItem
          to="/"
          icon={<Home className="h-4 w-4" />}
          label="Home"
          active={pathname === "/"}
        />

        <button
          onClick={() => setWorkspaceOpen((o) => !o)}
          className="mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
        >
          <span className="flex items-center gap-2.5">
            <LayoutGrid className="h-4 w-4" />
            Workspaces
          </span>
          {workspaceOpen ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>

        {workspaceOpen && (
          <div className="mt-2 space-y-3 pl-2">
            {workspaces.length > 0 && (
              <div className="relative px-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search workspaces"
                  className="h-8 pl-8 text-xs bg-background/60"
                />
              </div>
            )}

            {workspaces.length === 0 ? (
              <div className="rounded-lg border border-dashed border-sidebar-border p-3 text-center">
                <Sparkles className="mx-auto h-4 w-4 text-primary mb-1.5" />
                <p className="text-[11px] text-muted-foreground mb-2">
                  No workspaces yet. Create your first one.
                </p>
                <Button
                  size="sm"
                  className="w-full gap-1.5 h-7 text-xs bg-gradient-primary text-primary-foreground"
                  onClick={() => navigate({ to: "/workspaces/new" })}
                >
                  <Plus className="h-3 w-3" /> New workspace
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Workspaces
                  </p>
                  <div className="space-y-0.5">
                    {filtered.map((w) => (
                      <Link
                        key={w.code}
                        to="/workspaces/$code/dashboard"
                        params={{ code: w.code }}
                        className={cn(
                          "group flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-left text-xs text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors",
                          pathname.startsWith(`/workspaces/${w.code}`) &&
                            "bg-sidebar-accent text-sidebar-accent-foreground",
                        )}
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-primary text-[9px] font-bold text-primary-foreground">
                          {w.code.slice(0, 2)}
                        </span>
                        <span className="flex-1 truncate font-medium">
                          {w.name}
                        </span>
                      </Link>
                    ))}
                    {filtered.length === 0 && (
                      <p className="px-3 py-1 text-xs text-muted-foreground">
                        No matches
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start gap-2 h-8 text-xs"
                  onClick={() => navigate({ to: "/workspaces/new" })}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create workspace
                </Button>
              </>
            )}
          </div>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <UserCard />
      </div>
    </aside>
  );
}

function SidebarItem({
  to,
  icon,
  label,
  active,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

function UserCard() {
  const navigate = useNavigate();
  const [user, setUser] = useState({
    name: "Alex Morgan",
    email: "alex@beinex.com",
    department: "Engineering",
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("bpm-user");
      if (stored) {
        setUser((prev) => ({ ...prev, ...JSON.parse(stored) }));
      }
    } catch {
      // ignore
    }
  }, []);

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  const handleLogout = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.removeItem("bpm-user");
    navigate({ to: "/login" });
  };

  return (
    <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent/60 transition-colors cursor-default">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground shrink-0 cursor-pointer">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-sidebar-foreground truncate">
          {user.name}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">
          {user.department}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
        onClick={handleLogout}
        title="Logout"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
