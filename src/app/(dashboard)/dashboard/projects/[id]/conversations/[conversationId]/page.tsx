import { notFound, redirect } from "next/navigation";

import { createClient } from "@/core/supabase/server";
import {
  ConversationAccessDeniedError,
  ConversationNotFoundError,
  getConversation,
  getMessages,
} from "@/features/conversations";
import { listDataSources } from "@/features/data-sources";
import { listPinnedInsights } from "@/features/pinned-insights";
import { getProject, ProjectAccessDeniedError, ProjectNotFoundError } from "@/features/projects";
import { getSuggestedQuestionsForSources } from "@/features/suggested-questions";
import type { ChatMessage } from "@/shared/components/chat-interface";
import { ConversationShell } from "@/shared/components/conversation-shell";

interface ConversationPageProps {
  params: Promise<{ id: string; conversationId: string }>;
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  const { id: projectId, conversationId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let project: Awaited<ReturnType<typeof getProject>>;
  try {
    project = await getProject(projectId, user.id);
  } catch (err) {
    if (err instanceof ProjectNotFoundError || err instanceof ProjectAccessDeniedError) {
      notFound();
    }
    throw err;
  }

  let conv: Awaited<ReturnType<typeof getConversation>>;
  let messages: Awaited<ReturnType<typeof getMessages>>;
  try {
    [conv, messages] = await Promise.all([
      getConversation(conversationId, user.id),
      getMessages(conversationId, user.id),
    ]);
  } catch (err) {
    if (err instanceof ConversationNotFoundError || err instanceof ConversationAccessDeniedError) {
      notFound();
    }
    throw err;
  }

  const [sources, pinnedInsights] = await Promise.all([
    listDataSources(projectId, user.id),
    listPinnedInsights(projectId, user.id),
  ]);

  const readySourceIds = sources.filter((s) => s.status === "ready").map((s) => s.id);
  const suggestedQuestions = await getSuggestedQuestionsForSources(readySourceIds);

  const pinnedMessageIds: Record<string, string> = {};
  for (const ins of pinnedInsights) {
    pinnedMessageIds[ins.messageId] = ins.id;
  }

  const initialMessages: ChatMessage[] = messages.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    chartSpec: m.chartSpec as Record<string, unknown> | null,
  }));

  const initialPinnedInsights = pinnedInsights.map((ins) => ({
    id: ins.id,
    content: ins.content,
    createdAt: ins.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 2.75rem - 4rem)" }}>
      <div className="mb-4 shrink-0">
        <nav className="text-xs text-muted-foreground mb-2">
          <a href="/dashboard/projects" className="hover:text-foreground transition-colors">
            Projects
          </a>
          <span className="mx-1.5">/</span>
          <a
            href={`/dashboard/projects/${projectId}`}
            className="hover:text-foreground transition-colors"
          >
            {project.name}
          </a>
          <span className="mx-1.5">/</span>
          <span>{conv.title}</span>
        </nav>
        <h1 className="text-lg font-semibold tracking-tight">{conv.title}</h1>
      </div>

      <ConversationShell
        initialMessages={initialMessages}
        conversationId={conversationId}
        projectId={projectId}
        conversationTitle={conv.title}
        projectName={project.name}
        suggestedQuestions={suggestedQuestions}
        pinnedMessageIds={pinnedMessageIds}
        initialPinnedInsights={initialPinnedInsights}
      />
    </div>
  );
}
