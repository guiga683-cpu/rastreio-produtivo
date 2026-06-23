import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Package } from "lucide-react";

const baseTabs = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/faturamento", label: "Faturamento" },
  { to: "/projetos", label: "Projetos" },
  { to: "/novo", label: "Novo projeto" },
] as const;

export function TopBar({ isAdmin = false }: { isAdmin?: boolean }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tabs = isAdmin
    ? [...baseTabs, { to: "/admin", label: "Admin" } as const]
    : baseTabs;

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-card">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-6">
        <div className="flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Package className="h-4 w-4" />
          </span>
          <span className="text-sm">
            Embarques <span className="text-muted-foreground font-normal">/ Guntner</span>
          </span>
        </div>
        <nav className="flex h-full items-center gap-1">
          {tabs.map((t) => {
            const active = pathname === t.to;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`relative flex h-14 items-center px-3 text-sm font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
                {active && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-t bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={signOut}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" /> Sair
        </button>
      </div>
    </header>
  );
}
