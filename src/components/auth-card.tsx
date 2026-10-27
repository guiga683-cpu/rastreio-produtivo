import type { ReactNode } from "react";
import { Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export function AuthCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2 text-lg font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Package className="h-5 w-5" />
          </span>
          Embarques <span className="font-normal text-muted-foreground">/ Guntner</span>
        </div>
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <h1 className="text-lg font-semibold">{title}</h1>
            <CardDescription className="text-xs">{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}