import { Resend } from "resend";

import { env } from "@/core/config/env";
import { getLogger } from "@/core/logging";
import { listPinnedInsights } from "@/features/pinned-insights";

const logger = getLogger("email-digest.service");

interface DigestProject {
  id: string;
  name: string;
  description: string | null;
  dataSourceCount: number;
  conversationCount: number;
}

interface DigestRecipient {
  userId: string;
  email: string;
  projects: DigestProject[];
}

function buildDigestHtml(recipient: DigestRecipient, insights: Record<string, string[]>): string {
  const projectRows = recipient.projects
    .map((p) => {
      const projectInsights = insights[p.id] ?? [];
      const insightHtml =
        projectInsights.length > 0
          ? `<ul style="margin:8px 0 0 0;padding-left:20px;color:#6b7280;font-size:14px;">
              ${projectInsights.map((ins) => `<li style="margin-bottom:6px;">${ins}</li>`).join("")}
            </ul>`
          : `<p style="color:#9ca3af;font-size:13px;margin:6px 0 0 0;">No pinned insights yet.</p>`;

      return `
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:12px;background:#fafafa;">
          <p style="margin:0 0 4px 0;font-size:16px;font-weight:600;color:#111827;">${p.name}</p>
          ${p.description ? `<p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">${p.description}</p>` : ""}
          <p style="margin:0;font-size:12px;color:#9ca3af;">${p.dataSourceCount} data source${p.dataSourceCount === 1 ? "" : "s"} · ${p.conversationCount} conversation${p.conversationCount === 1 ? "" : "s"}</p>
          ${insightHtml}
        </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Your Lumin weekly digest</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:32px 16px;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#4f46e5;padding:24px 32px;">
      <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">Lumin</p>
      <p style="margin:4px 0 0 0;font-size:13px;color:#c7d2fe;">Your weekly data digest</p>
    </div>
    <div style="padding:28px 32px;">
      <p style="margin:0 0 20px 0;font-size:15px;color:#374151;">
        Here's a summary of your projects and pinned insights for the week.
      </p>
      ${projectRows.length > 0 ? projectRows : `<p style="color:#9ca3af;font-size:14px;">You have no active projects yet. <a href="${env.APP_URL}/dashboard/projects/new" style="color:#4f46e5;">Create one →</a></p>`}
      <div style="margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;">
        <a href="${env.APP_URL}/dashboard" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:500;">
          Open Lumin
        </a>
      </div>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">You're receiving this because you have a Lumin account. Sent every Monday.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Send a weekly digest email to a single user.
 * Returns true on success, false on failure.
 */
export async function sendDigestEmail(recipient: DigestRecipient): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    logger.warn({ userId: recipient.userId }, "email_digest.skipped_no_api_key");
    return false;
  }

  logger.info(
    { userId: recipient.userId, projectCount: recipient.projects.length },
    "email_digest.send_started",
  );

  // Gather pinned insights per project
  const insightsByProject: Record<string, string[]> = {};
  await Promise.all(
    recipient.projects.map(async (p) => {
      try {
        const pinned = await listPinnedInsights(p.id, recipient.userId);
        insightsByProject[p.id] = pinned.slice(0, 5).map((ins) => ins.content.slice(0, 200));
      } catch {
        insightsByProject[p.id] = [];
      }
    }),
  );

  const html = buildDigestHtml(recipient, insightsByProject);

  try {
    const resend = new Resend(env.RESEND_API_KEY);
    await resend.emails.send({
      from: env.DIGEST_FROM_EMAIL,
      to: recipient.email,
      subject: "Your Lumin weekly digest",
      html,
    });
    logger.info({ userId: recipient.userId }, "email_digest.send_completed");
    return true;
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    logger.error({ userId: recipient.userId, cause }, "email_digest.send_failed");
    return false;
  }
}
