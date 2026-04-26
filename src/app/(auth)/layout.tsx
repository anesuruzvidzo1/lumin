import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { createClient } from "@/core/supabase/server";

interface AuthLayoutProps {
  children: ReactNode;
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex h-10 w-10 rounded-xl bg-gradient-to-br from-primary via-primary to-primary/70 items-center justify-center mb-4 shadow-lg shadow-primary/25">
            <span className="text-base font-black text-primary-foreground">L</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">lumin</h1>
          <p className="text-sm text-muted-foreground mt-1">Ask your data anything.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
