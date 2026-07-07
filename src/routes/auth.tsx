import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Package } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2 text-lg font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Package className="h-5 w-5" />
          </span>
          Embarques <span className="text-muted-foreground font-normal">/ Guntner</span>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
