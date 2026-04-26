"use client";

import { useState } from "react";

import type { ChatMessage } from "./chat-interface";
import { ChatInterface } from "./chat-interface";
import { ExportPdfButton } from "./export-pdf-button";

interface ConversationShellProps {
  initialMessages: ChatMessage[];
  conversationId: string;
  projectId: string;
  conversationTitle: string;
  projectName: string;
  suggestedQuestions?: string[];
  pinnedMessageIds?: Record<string, string>;
  initialPinnedInsights: Array<{ id: string; content: string; createdAt: string }>;
}

/**
 * Client wrapper that owns the message state shared between
 * ChatInterface (renders / sends) and ExportPdfButton (reads for export).
 */
export function ConversationShell({
  initialMessages,
  conversationId,
  projectId,
  conversationTitle,
  projectName,
  suggestedQuestions,
  pinnedMessageIds,
  initialPinnedInsights,
}: ConversationShellProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Toolbar — export lives here so it can access message state */}
      <div className="flex items-center justify-end mb-3 shrink-0">
        <ExportPdfButton
          conversationTitle={conversationTitle}
          projectName={projectName}
          messages={messages}
          pinnedInsights={initialPinnedInsights}
        />
      </div>

      <ChatInterface
        initialMessages={initialMessages}
        conversationId={conversationId}
        projectId={projectId}
        onMessagesChange={setMessages}
        {...(suggestedQuestions !== undefined ? { suggestedQuestions } : {})}
        {...(pinnedMessageIds !== undefined ? { pinnedMessageIds } : {})}
      />
    </div>
  );
}
