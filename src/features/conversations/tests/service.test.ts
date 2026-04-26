import { beforeEach, describe, expect, it, mock } from "bun:test";

import type { Project } from "@/features/projects";

import type { Conversation, Message } from "../models";

// ── Mock AI client ────────────────────────────────────────────────────────────
const mockMessagesCreate = mock<
  (params: unknown) => Promise<{ content: { type: string; text: string }[] }>
>((_params: unknown) =>
  Promise.resolve({ content: [{ type: "text", text: "There are 42 open tickets." }] }),
);
mock.module("@/core/ai", () => ({
  anthropic: { messages: { create: mockMessagesCreate } },
  AI_MODEL: "claude-sonnet-4-6",
  MAX_RESPONSE_TOKENS: 4096,
  CONTEXT_SAMPLE_ROWS: 50,
}));

// ── Mock projects ─────────────────────────────────────────────────────────────
const mockProject: Project = {
  id: "proj-1",
  name: "Test",
  slug: "test",
  description: null,
  isPublic: false,
  ownerId: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};
mock.module("@/features/projects", () => ({
  getProject: mock(() => Promise.resolve(mockProject)),
}));

// ── Mock data-sources ─────────────────────────────────────────────────────────
const mockSource = {
  id: "src-1",
  projectId: "proj-1",
  name: "Tickets",
  type: "csv",
  storageKey: "k",
  fileSize: 100,
  rowCount: 10,
  status: "ready",
  errorMessage: null,
  metadata: { columns: ["id", "issue"] },
  createdAt: new Date(),
  updatedAt: new Date(),
};
mock.module("@/features/data-sources", () => ({
  listDataSources: mock(() => Promise.resolve([mockSource])),
}));

// ── Mock ingestion ────────────────────────────────────────────────────────────
mock.module("@/features/ingestion", () => ({
  getSampleRows: mock(() => Promise.resolve([])),
}));

// ── Mock repository ───────────────────────────────────────────────────────────
const mockConv: Conversation = {
  id: "conv-1",
  projectId: "proj-1",
  userId: "user-1",
  title: "My analysis",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUserMsg: Message = {
  id: "msg-1",
  conversationId: "conv-1",
  role: "user",
  content: "How many open tickets?",
  chartSpec: null,
  createdAt: new Date(),
};

const mockAssistantMsg: Message = {
  id: "msg-2",
  conversationId: "conv-1",
  role: "assistant",
  content: "There are 42 open tickets.",
  chartSpec: null,
  createdAt: new Date(),
};

const mockRepo = {
  findConversationById: mock((): Promise<Conversation | undefined> => Promise.resolve(mockConv)),
  findConversationsByProject: mock((): Promise<Conversation[]> => Promise.resolve([mockConv])),
  createConversation: mock((): Promise<Conversation> => Promise.resolve(mockConv)),
  touchConversation: mock((): Promise<void> => Promise.resolve()),
  deleteConversation: mock((): Promise<boolean> => Promise.resolve(true)),
  findMessagesByConversation: mock((): Promise<Message[]> => Promise.resolve([])),
  createMessage: mock((_data?: unknown): Promise<Message> => Promise.resolve(mockUserMsg)),
};
mock.module("../repository", () => mockRepo);

// ── Import service after mocks ────────────────────────────────────────────────
const { createConversation, getConversation, listConversations, deleteConversation, askQuestion } =
  await import("../service");

const userId = "user-1";
const projectId = "proj-1";
const conversationId = "conv-1";

// ─────────────────────────────────────────────────────────────────────────────

describe("createConversation", () => {
  beforeEach(() => {
    mockRepo.createConversation.mockReset();
    mockRepo.createConversation.mockResolvedValue(mockConv);
  });

  it("creates and returns a conversation", async () => {
    const result = await createConversation(
      { title: "My analysis", dataSourceIds: ["src-1"] },
      projectId,
      userId,
    );
    expect(result).toEqual(mockConv);
    expect(mockRepo.createConversation).toHaveBeenCalledTimes(1);
  });
});

describe("getConversation", () => {
  beforeEach(() => {
    mockRepo.findConversationById.mockReset();
    mockRepo.findConversationById.mockResolvedValue(mockConv);
  });

  it("returns the conversation for the owner", async () => {
    const result = await getConversation(conversationId, userId);
    expect(result).toEqual(mockConv);
  });

  it("throws not found when conversation does not exist", async () => {
    mockRepo.findConversationById.mockResolvedValueOnce(undefined as unknown as Conversation);
    await expect(getConversation("missing", userId)).rejects.toThrow("not found");
  });

  it("throws access denied for wrong user", async () => {
    await expect(getConversation(conversationId, "other-user")).rejects.toThrow("Access denied");
  });
});

describe("listConversations", () => {
  it("returns conversations for the project", async () => {
    const result = await listConversations(projectId, userId);
    expect(result).toEqual([mockConv]);
  });
});

describe("deleteConversation", () => {
  beforeEach(() => {
    mockRepo.findConversationById.mockResolvedValue(mockConv);
    mockRepo.deleteConversation.mockResolvedValue(true);
  });

  it("deletes the conversation", async () => {
    await expect(deleteConversation(conversationId, userId)).resolves.toBeUndefined();
    expect(mockRepo.deleteConversation).toHaveBeenCalledWith(conversationId);
  });
});

describe("askQuestion", () => {
  beforeEach(() => {
    mockRepo.findConversationById.mockReset();
    mockRepo.findConversationById.mockResolvedValue(mockConv);
    mockRepo.findMessagesByConversation.mockReset();
    mockRepo.findMessagesByConversation.mockResolvedValue([]);
    mockRepo.createMessage.mockReset();
    mockRepo.createMessage
      .mockResolvedValueOnce(mockUserMsg)
      .mockResolvedValueOnce(mockAssistantMsg);
    mockMessagesCreate.mockReset();
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: "text", text: "There are 42 open tickets." }],
    });
    mockRepo.touchConversation.mockReset();
  });

  it("calls the AI and persists both messages, returning the assistant reply", async () => {
    const result = await askQuestion(
      conversationId,
      { question: "How many open tickets?" },
      userId,
    );

    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
    expect(mockRepo.createMessage).toHaveBeenCalledTimes(2);
    expect(result).toEqual(mockAssistantMsg);
  });

  it("includes prior message history in the AI call", async () => {
    const prior: Message = { ...mockUserMsg, content: "previous question" };
    mockRepo.findMessagesByConversation.mockResolvedValueOnce([prior]);

    await askQuestion(conversationId, { question: "Follow up?" }, userId);

    type AiCallArg = { messages: { role: string; content: string }[] };
    const calls = mockMessagesCreate.mock.calls as unknown as [AiCallArg][];
    const callArgs = calls[0]?.[0];
    expect(callArgs?.messages.some((m) => m.content === "previous question")).toBe(true);
  });

  it("extracts a Vega-Lite chart spec from the response", async () => {
    const spec = { $schema: "vega-lite", mark: "bar", data: { values: [] } };
    const responseText = `Here is the chart:\n\`\`\`vega-lite\n${JSON.stringify(spec)}\n\`\`\``;
    mockMessagesCreate.mockResolvedValueOnce({ content: [{ type: "text", text: responseText }] });

    await askQuestion(conversationId, { question: "Show a chart" }, userId);

    type MsgArg = { role: string; content: string; chartSpec: Record<string, unknown> | null };
    const calls = mockRepo.createMessage.mock.calls as unknown as [MsgArg][];
    const assistantArg = calls.find((c) => c[0]?.role === "assistant")?.[0];
    expect(assistantArg?.chartSpec).not.toBeNull();
    expect((assistantArg?.chartSpec as Record<string, unknown>)?.["mark"]).toBe("bar");
    // The vega-lite code block should be stripped from the text content
    expect(assistantArg?.content).not.toContain("```vega-lite");
  });

  it("throws ConversationAiFailedError when the Anthropic call fails", async () => {
    mockMessagesCreate.mockRejectedValueOnce(new Error("rate limit"));
    await expect(askQuestion(conversationId, { question: "fail" }, userId)).rejects.toThrow(
      "AI query failed",
    );
  });

  it("touches the conversation timestamp after a successful answer", async () => {
    await askQuestion(conversationId, { question: "test" }, userId);
    expect(mockRepo.touchConversation).toHaveBeenCalledWith(conversationId);
  });
});
