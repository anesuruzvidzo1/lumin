import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  FileJson,
  FileText,
  MessageSquare,
  Pin,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { createClient } from "@/core/supabase/server";
import type { AnomalyAlert } from "@/features/anomaly-detection";
import { listAnomalyAlerts } from "@/features/anomaly-detection";
import type { Conversation } from "@/features/conversations";
import { listConversations } from "@/features/conversations";
import type { DataSource, DataSourceStatus, DataSourceType } from "@/features/data-sources";
import { listDataSources } from "@/features/data-sources";
import type { PinnedInsight } from "@/features/pinned-insights";
import { listPinnedInsights } from "@/features/pinned-insights";
import { getProject, ProjectAccessDeniedError, ProjectNotFoundError } from "@/features/projects";
import { NewConversationDialog } from "@/shared/components/new-conversation-dialog";
import { UploadDataSourceDialog } from "@/shared/components/upload-data-source-dialog";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

function TypeIcon({ type }: { type: DataSourceType }): ReactNode {
  if (type === "csv") {
    return <Database className="h-3.5 w-3.5 text-blue-400" />;
  }
  if (type === "json") {
    return <FileJson className="h-3.5 w-3.5 text-yellow-400" />;
  }
  return <FileText className="h-3.5 w-3.5 text-emerald-400" />;
}

function StatusPill({ status }: { status: DataSourceStatus }): ReactNode {
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        Ready
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        Processing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="h-3 w-3" />
      Error
    </span>
  );
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) {
    return "—";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DataSourceRow({ source }: { source: DataSource }): ReactNode {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="h-7 w-7 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
        <TypeIcon type={source.type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{source.name}</p>
        <p className="text-xs text-muted-foreground">
          {source.type.toUpperCase()}
          {source.rowCount !== null && ` · ${source.rowCount.toLocaleString()} rows`}
          {` · ${formatBytes(source.fileSize)}`}
        </p>
        {source.status === "error" && source.errorMessage && (
          <p className="text-xs text-destructive mt-0.5 truncate">{source.errorMessage}</p>
        )}
      </div>
      <StatusPill status={source.status} />
    </div>
  );
}

function PinnedInsightRow({
  insight,
  projectId,
}: {
  insight: PinnedInsight;
  projectId: string;
}): ReactNode {
  void projectId;
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Pin className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground/90 leading-relaxed line-clamp-3">{insight.content}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(insight.createdAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: "bg-destructive/10", text: "text-destructive", label: "High" },
  medium: { bg: "bg-amber-500/10", text: "text-amber-500", label: "Medium" },
  low: { bg: "bg-muted/60", text: "text-muted-foreground", label: "Low" },
};

function AnomalyAlertRow({ alert }: { alert: AnomalyAlert }): ReactNode {
  const style = SEVERITY_STYLES[alert.severity] ??
    SEVERITY_STYLES["low"] ?? { bg: "bg-muted/60", text: "text-muted-foreground", label: "Low" };
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="h-7 w-7 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-medium">{alert.columnName}</p>
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}
          >
            {style.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{alert.description}</p>
      </div>
    </div>
  );
}

function ConversationRow({
  conv,
  projectId,
}: {
  conv: Conversation;
  projectId: string;
}): ReactNode {
  return (
    <a
      href={`/dashboard/projects/${projectId}/conversations/${conv.id}`}
      className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
    >
      <div className="h-7 w-7 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{conv.title}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(conv.updatedAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let project: Awaited<ReturnType<typeof getProject>>;
  try {
    project = await getProject(id, user.id);
  } catch (err) {
    if (err instanceof ProjectNotFoundError || err instanceof ProjectAccessDeniedError) {
      notFound();
    }
    throw err;
  }

  const [dataSources, conversations, pinnedInsights, anomalyAlerts] = await Promise.all([
    listDataSources(id, user.id),
    listConversations(id, user.id),
    listPinnedInsights(id, user.id),
    listAnomalyAlerts(id, user.id),
  ]);

  const readySourceIds = dataSources.filter((s) => s.status === "ready").map((s) => s.id);

  return (
    <div className="flex flex-col gap-10">
      {/* Header */}
      <div className="pt-2">
        <nav className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
          <a href="/dashboard/projects" className="hover:text-foreground transition-colors">
            Projects
          </a>
          <span className="text-border">/</span>
          <span>{project.name}</span>
        </nav>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-1.5">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <UploadDataSourceDialog projectId={project.id} />
            <NewConversationDialog projectId={project.id} readySourceIds={readySourceIds} />
          </div>
        </div>
      </div>

      {/* Conversations */}
      <div>
        <div className="mb-4">
          <p className="text-[10px] font-semibold text-primary uppercase tracking-widest mb-1">
            Conversations
          </p>
          <p className="text-xs text-muted-foreground">
            Ask questions and explore your data with AI.
          </p>
        </div>
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center px-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">No conversations yet</p>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
                  {readySourceIds.length === 0
                    ? "Upload a data source first, then start a conversation."
                    : "Start a conversation to ask questions about your data."}
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map((conv) => (
                <ConversationRow key={conv.id} conv={conv} projectId={project.id} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pinned Insights */}
      {pinnedInsights.length > 0 && (
        <div>
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-primary uppercase tracking-widest mb-1">
              Pinned Insights
            </p>
            <p className="text-xs text-muted-foreground">
              Key findings you've saved from conversations.
            </p>
          </div>
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <div className="divide-y divide-border">
              {pinnedInsights.map((ins) => (
                <PinnedInsightRow key={ins.id} insight={ins} projectId={project.id} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Anomaly Alerts */}
      {anomalyAlerts.length > 0 && (
        <div>
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-primary uppercase tracking-widest mb-1">
              Anomaly Alerts
            </p>
            <p className="text-xs text-muted-foreground">
              Unusual patterns detected in your uploaded data.
            </p>
          </div>
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <div className="divide-y divide-border">
              {anomalyAlerts.map((alert) => (
                <AnomalyAlertRow key={alert.id} alert={alert} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Data Sources */}
      <div>
        <div className="mb-4">
          <p className="text-[10px] font-semibold text-primary uppercase tracking-widest mb-1">
            Data sources
          </p>
          <p className="text-xs text-muted-foreground">
            CSV, JSON, or plain text files you want to query.
          </p>
        </div>
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          {dataSources.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center px-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Database className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">No data sources yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upload a CSV, JSON, or .txt file to get started.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {dataSources.map((source) => (
                <DataSourceRow key={source.id} source={source} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
