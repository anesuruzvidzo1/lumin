import { ChevronRight, FolderKanban, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { createClient } from "@/core/supabase/server";
import { getProjectsByOwner } from "@/features/projects";

function StatCard({
  title,
  value,
  description,
  href,
  icon,
  cta,
}: {
  title: string;
  value: number;
  description: string;
  href: string;
  icon: ReactNode;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-xl transition-all duration-200"
      style={{
        border: "1px solid rgba(130, 140, 255, 0.25)",
        backgroundColor: "#13131f",
        borderTop: "2px solid #818cf8",
      }}
    >
      {/* Ambient gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(129,140,248,0.12) 0%, rgba(129,140,248,0.03) 50%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      <div className="relative p-6">
        <div className="flex items-center justify-between mb-6">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: "rgba(129, 140, 248, 0.2)",
              border: "1px solid rgba(129, 140, 248, 0.35)",
            }}
          >
            {icon}
          </div>
          <span
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "#818cf8", opacity: 0.8 }}
          >
            {title}
          </span>
        </div>
        <div
          className="text-5xl font-black tracking-tighter tabular-nums mb-1.5"
          style={{ color: "#e8e8f5" }}
        >
          {value}
        </div>
        <p className="text-sm" style={{ color: "#8080a8" }}>
          {description}
        </p>
      </div>

      <div
        className="relative px-6 py-3 flex items-center justify-between"
        style={{
          borderTop: "1px solid rgba(130, 140, 255, 0.12)",
          backgroundColor: "rgba(129, 140, 248, 0.06)",
        }}
      >
        <span className="text-xs font-medium" style={{ color: "#8080a8" }}>
          {cta}
        </span>
        <ChevronRight className="h-3.5 w-3.5" style={{ color: "#818cf8" }} />
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const projects = user ? await getProjectsByOwner(user.id) : [];
  const projectCount = projects.length;
  const recentProjects = projects.slice(0, 3);
  const displayName = user?.email?.split("@")[0] ?? "there";

  return (
    <div
      className="flex flex-col gap-12"
      style={{
        position: "relative",
      }}
    >
      {/* Radial glow */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "50vh",
          background:
            "radial-gradient(ellipse 80% 50% at 50% -5%, rgba(99, 102, 241, 0.22), transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Hero */}
      <div className="pt-8" style={{ position: "relative", zIndex: 1 }}>
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6"
          style={{
            border: "1px solid rgba(129, 140, 248, 0.5)",
            backgroundColor: "rgba(129, 140, 248, 0.15)",
          }}
        >
          <Sparkles className="h-3.5 w-3.5" style={{ color: "#818cf8" }} />
          <span className="text-xs font-semibold" style={{ color: "#818cf8" }}>
            AI-powered data analysis
          </span>
        </div>
        <h1 className="text-5xl font-black tracking-tight leading-none mb-4">
          Ask your data anything.
        </h1>
        <p className="text-xl text-muted-foreground leading-snug font-medium">
          Finally, it speaks your language.
        </p>
        <p className="text-sm text-muted-foreground/70 mt-3">
          Welcome back, <span className="text-foreground font-medium">{displayName}</span>
        </p>
      </div>

      {/* Stats */}
      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        style={{ position: "relative", zIndex: 1 }}
      >
        <StatCard
          title="Projects"
          value={projectCount}
          description={projectCount === 1 ? "active project" : "active projects"}
          href="/dashboard/projects"
          icon={<FolderKanban className="h-4.5 w-4.5" style={{ color: "#818cf8" }} />}
          cta="View all projects"
        />
      </div>

      {/* Recent projects or empty CTA */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {recentProjects.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold">Recent projects</h2>
              <Link
                href="/dashboard/projects"
                className="text-xs font-medium transition-colors"
                style={{ color: "#818cf8" }}
              >
                View all →
              </Link>
            </div>
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid rgba(130, 140, 255, 0.2)", backgroundColor: "#13131f" }}
            >
              {recentProjects.map((project, index) => (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="group flex items-center gap-3 px-5 py-4 transition-colors"
                  style={{
                    borderTop: index > 0 ? "1px solid rgba(130, 140, 255, 0.1)" : undefined,
                  }}
                >
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: "rgba(129, 140, 248, 0.18)",
                      border: "1px solid rgba(129, 140, 248, 0.3)",
                    }}
                  >
                    <span className="text-sm font-black" style={{ color: "#818cf8" }}>
                      {project.name[0]?.toUpperCase() ?? "P"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{project.name}</p>
                    {project.description && (
                      <p className="text-xs truncate mt-0.5" style={{ color: "#8080a8" }}>
                        {project.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs shrink-0" style={{ color: "#8080a8" }}>
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-150"
                    style={{ color: "#818cf8" }}
                  />
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="relative overflow-hidden rounded-xl p-10 text-center"
            style={{ border: "1px solid rgba(129, 140, 248, 0.3)" }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(135deg, rgba(129,140,248,0.1) 0%, transparent 60%)",
                pointerEvents: "none",
              }}
            />
            <div className="relative">
              <div
                className="h-14 w-14 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{
                  backgroundColor: "rgba(129, 140, 248, 0.18)",
                  border: "1px solid rgba(129, 140, 248, 0.35)",
                }}
              >
                <FolderKanban className="h-6 w-6" style={{ color: "#818cf8" }} />
              </div>
              <h3 className="text-lg font-bold mb-2">Ready to get started?</h3>
              <p
                className="text-sm mb-6 max-w-xs mx-auto leading-relaxed"
                style={{ color: "#8080a8" }}
              >
                Create your first project, upload a data file, and start asking questions in plain
                English.
              </p>
              <Link
                href="/dashboard/projects/new"
                className="inline-flex items-center gap-2 h-9 px-5 rounded-lg text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: "#818cf8",
                  color: "#05050f",
                  boxShadow: "0 4px 14px rgba(129, 140, 248, 0.35)",
                }}
              >
                <Plus className="h-4 w-4" />
                Create your first project
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
