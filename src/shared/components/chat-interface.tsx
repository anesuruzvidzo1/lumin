"use client";

import { ArrowUp, Pin, PinOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Textarea } from "@/components/ui/textarea";

import { VegaChart } from "./vega-chart";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  chartSpec: Record<string, unknown> | null;
  isLoading?: boolean;
};

interface ChatInterfaceProps {
  initialMessages: ChatMessage[];
  conversationId: string;
  projectId: string;
  suggestedQuestions?: string[];
  /** Map of messageId → pinned insight ID (if already pinned) */
  pinnedMessageIds?: Record<string, string>;
  /** Called whenever the message list changes so a parent can track it */
  onMessagesChange?: (messages: ChatMessage[]) => void;
}

export function ChatInterface({
  initialMessages,
  conversationId,
  projectId,
  suggestedQuestions = [],
  pinnedMessageIds = {},
  onMessagesChange,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Track which messages are pinned: messageId → insightId
  const [pinned, setPinned] = useState<Record<string, string>>(pinnedMessageIds);
  const [chipsVisible, setChipsVisible] = useState(suggestedQuestions.length > 0);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Notify parent after messages state has settled (avoids updating parent during render)
  useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run on messages change to scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function submitQuestion(question?: string) {
    const q = (question ?? input).trim();
    if (!q || submitting) {
      return;
    }

    setInput("");
    setSubmitting(true);
    setChipsVisible(false);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: q,
      chartSpec: null,
    };
    const loadingMsg: ChatMessage = {
      id: "loading",
      role: "assistant",
      content: "",
      chartSpec: null,
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);

    try {
      const res = await fetch(
        `/api/projects/${projectId}/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q }),
        },
      );

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? `Request failed (${res.status})`);
      }

      const msg = (await res.json()) as {
        id: string;
        role: "user" | "assistant";
        content: string;
        chartSpec: Record<string, unknown> | null;
      };

      setMessages((prev) =>
        prev.map((m) => (m.id === "loading" ? { ...msg, isLoading: false } : m)),
      );
    } catch (err) {
      const errorText = err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "loading"),
        { id: crypto.randomUUID(), role: "assistant", content: errorText, chartSpec: null },
      ]);
    } finally {
      setSubmitting(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }

  async function handlePin(message: ChatMessage) {
    const existingInsightId = pinned[message.id];
    if (existingInsightId) {
      // Unpin
      const insightId = existingInsightId;
      try {
        await fetch(`/api/projects/${projectId}/pinned-insights/${insightId}`, {
          method: "DELETE",
        });
        setPinned((prev) => {
          const next = { ...prev };
          delete next[message.id];
          return next;
        });
      } catch {
        // silent
      }
      return;
    }

    // Pin
    try {
      const res = await fetch(`/api/projects/${projectId}/pinned-insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: message.id,
          content: message.content,
          chartSpec: message.chartSpec,
        }),
      });
      if (res.ok || res.status === 409) {
        const json = (await res.json()) as { id?: string };
        const newId = json.id;
        if (newId) {
          setPinned((prev) => ({ ...prev, [message.id]: newId }));
        }
      }
    } catch {
      // silent
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submitQuestion();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submitQuestion();
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Ask a question about your data.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Lumin will analyse it and respond with insights.
              </p>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-6">
            {messages.map((msg) => (
              <MessageRow
                key={msg.id}
                message={msg}
                isPinned={!!pinned[msg.id]}
                onPin={() => void handlePin(msg)}
              />
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 pt-4">
        {/* Suggested question chips */}
        {chipsVisible && suggestedQuestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void submitQuestion(q)}
                disabled={submitting}
                className="text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  borderColor: "rgba(129, 140, 248, 0.35)",
                  backgroundColor: "rgba(129, 140, 248, 0.08)",
                  color: "#818cf8",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="rounded-xl border border-border bg-card focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all p-3">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your data…"
              disabled={submitting}
              className="border-0 bg-transparent p-0 resize-none text-sm focus-visible:ring-0 min-h-[24px] max-h-40 leading-relaxed placeholder:text-muted-foreground/50"
              rows={1}
            />
            <div className="flex items-center justify-between mt-2.5">
              <span className="text-[11px] text-muted-foreground/50 select-none">
                ↵ send · ⇧↵ newline
              </span>
              <button
                type="submit"
                disabled={!input.trim() || submitting}
                className="h-6 w-6 rounded-md bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowUp className="h-3.5 w-3.5 text-primary-foreground" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function MessageRow({
  message,
  isPinned,
  onPin,
}: {
  message: ChatMessage;
  isPinned: boolean;
  onPin: () => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[72%] bg-muted rounded-2xl rounded-tr-sm px-4 py-2.5">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 group">
      <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-[10px] font-bold text-primary">L</span>
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        {message.isLoading ? (
          <ThinkingIndicator />
        ) : (
          <>
            <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {message.content}
            </p>
            {message.chartSpec && <VegaChart spec={message.chartSpec} />}
            {/* Pin button — visible on hover */}
            <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={onPin}
                className="inline-flex items-center gap-1.5 text-[11px] transition-colors"
                style={{ color: isPinned ? "#818cf8" : "#8080a8" }}
              >
                {isPinned ? (
                  <>
                    <PinOff className="h-3 w-3" />
                    Unpin
                  </>
                ) : (
                  <>
                    <Pin className="h-3 w-3" />
                    Pin insight
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-1.5 h-5">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse" />
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:200ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:400ms]" />
    </div>
  );
}
