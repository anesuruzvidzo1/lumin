import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { createClient } from "@/core/supabase/server";
import { signOut } from "@/features/auth/actions";
import { syncUser } from "@/features/auth/sync-user";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await syncUser(user.id, user.email ?? "");

  return (
    <div className="min-h-screen bg-background">
      <header
        className="h-12 flex items-center px-6 sticky top-0 z-50 backdrop-blur-md"
        style={{
          borderBottom: "1px solid rgba(130, 140, 255, 0.15)",
          backgroundColor: "rgba(13, 13, 22, 0.92)",
        }}
      >
        <a href="/dashboard" className="flex items-center gap-2.5 mr-8 group">
          <span
            className="h-7 w-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#818cf8", boxShadow: "0 2px 8px rgba(129, 140, 248, 0.4)" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <circle cx="6" cy="6" r="3" fill="#05050f" />
              <circle cx="6" cy="6" r="5.5" stroke="#05050f" strokeWidth="1" fill="none" />
            </svg>
          </span>
          <span
            className="text-sm font-bold tracking-tight transition-colors"
            style={{ color: "#818cf8" }}
          >
            Lumin
          </span>
        </a>
        <nav className="flex items-center gap-0.5">
          <a
            href="/dashboard/projects"
            className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
          >
            Projects
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-5">
          <span className="text-xs text-muted-foreground hidden sm:block">{user.email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="container mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
