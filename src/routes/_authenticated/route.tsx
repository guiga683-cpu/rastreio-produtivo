import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { TooltipProvider } from "@/components/ui/tooltip";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const { data: prof } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!prof || prof.status !== "approved") {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin")
      .maybeSingle();

    return { user: data.user, isAdmin: !!roleRow };
  },
  component: Layout,
});

function Layout() {
  const { isAdmin } = Route.useRouteContext();
  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen">
        <TopBar isAdmin={isAdmin} />
        <main className="mx-auto max-w-[1400px] px-6 py-6">
          <Outlet />
        </main>
      </div>
    </TooltipProvider>
  );
}
