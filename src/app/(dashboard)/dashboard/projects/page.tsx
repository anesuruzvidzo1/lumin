import { ChevronRight, FolderKanban, Plus } from "lucide-react";
import Link from "next/link";

import { createClient } from "@/core/supabase/server";
import { getProjectsByOwner } from "@/features/projects";
import { DeleteProjectButton } from "@/shared/components/delete-project-button";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const projects = user ? await getProjectsByOwner(user.id) : [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1.5">
            Projects
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Your projects</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Each project holds your data sources and AI conversations.
          </p>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: "#818cf8",
            color: "#05050f",
            boxShadow: "0 2px 10px rgba(129, 140, 248, 0.35)",
          }}
        >
          <Plus className="h-4 w-4" />
          New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div
          className="relative overflow-hidden rounded-xl flex flex-col items-center gap-4 py-20 text-center px-6"
          style={{ border: "1px dashed rgba(129, 140, 248, 0.3)" }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(135deg, rgba(129,140,248,0.05) 0%, transparent 60%)",
              pointerEvents: "none",
            }}
          />
          <div className="relative">
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{
                backgroundColor: "rgba(129, 140, 248, 0.15)",
                border: "1px solid rgba(129, 140, 248, 0.3)",
              }}
            >
              <FolderKanban className="h-5 w-5" style={{ color: "#818cf8" }} />
            </div>
            <p className="text-base font-semibold mb-1">No projects yet</p>
            <p className="text-sm max-w-sm" style={{ color: "#8080a8" }}>
              Create your first project to start uploading data and asking questions.
            </p>
            <Link
              href="/dashboard/projects/new"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium transition-colors mt-5"
              style={{
                backgroundColor: "#818cf8",
                color: "#05050f",
                boxShadow: "0 2px 10px rgba(129, 140, 248, 0.35)",
              }}
            >
              <Plus className="h-4 w-4" />
              New project
            </Link>
          </div>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(130, 140, 255, 0.2)", backgroundColor: "#13131f" }}
        >
          {projects.map((project, index) => (
            <div
              key={project.id}
              className="group relative flex items-center gap-3 px-5 py-4 transition-colors"
              style={{ borderTop: index > 0 ? "1px solid rgba(130, 140, 255, 0.1)" : undefined }}
            >
              <Link
                href={`/dashboard/projects/${project.id}`}
                className="absolute inset-0"
                aria-label={project.name}
              />
              <div
                className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 relative"
                style={{
                  backgroundColor: "rgba(129, 140, 248, 0.18)",
                  border: "1px solid rgba(129, 140, 248, 0.3)",
                }}
              >
                <span className="text-sm font-black" style={{ color: "#818cf8" }}>
                  {project.name[0]?.toUpperCase() ?? "P"}
                </span>
              </div>
              <div className="flex-1 min-w-0 relative">
                <p className="text-sm font-semibold truncate">{project.name}</p>
                {project.description ? (
                  <p className="text-xs truncate mt-0.5" style={{ color: "#8080a8" }}>
                    {project.description}
                  </p>
                ) : (
                  <p className="text-xs mt-0.5" style={{ color: "#8080a8" }}>
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <span
                className="text-xs hidden sm:block shrink-0 relative"
                style={{ color: "#8080a8" }}
              >
                {new Date(project.createdAt).toLocaleDateString()}
              </span>
              <div className="relative flex items-center gap-1">
                <DeleteProjectButton projectId={project.id} projectName={project.name} />
                <ChevronRight
                  className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-150"
                  style={{ color: "#818cf8" }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
