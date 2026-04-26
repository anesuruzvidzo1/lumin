import { count, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/core/config/env";
import { db } from "@/core/database/client";
import { conversations, dataSources, projects, users } from "@/core/database/schema";
import { getLogger } from "@/core/logging";
import { sendDigestEmail } from "@/features/email-digest";

const logger = getLogger("api.cron.weekly-digest");

/**
 * POST /api/cron/weekly-digest
 *
 * Triggered every Monday by Vercel Cron or an external scheduler.
 * Secured with a Bearer token matching CRON_SECRET.
 *
 * Vercel cron.json example:
 * { "crons": [{ "path": "/api/cron/weekly-digest", "schedule": "0 9 * * 1" }] }
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  if (env.CRON_SECRET) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  logger.info("weekly_digest.cron_started");

  try {
    // Fetch all users with their project stats
    const allUsers = await db.select().from(users);

    let sent = 0;
    let failed = 0;

    for (const user of allUsers) {
      const userProjects = await db.select().from(projects).where(eq(projects.ownerId, user.id));

      if (userProjects.length === 0) {
        continue;
      }

      const projectsWithStats = await Promise.all(
        userProjects.map(async (p) => {
          const [dsCounts, convCounts] = await Promise.all([
            db.select({ n: count() }).from(dataSources).where(eq(dataSources.projectId, p.id)),
            db.select({ n: count() }).from(conversations).where(eq(conversations.projectId, p.id)),
          ]);
          return {
            id: p.id,
            name: p.name,
            description: p.description,
            dataSourceCount: dsCounts[0]?.n ?? 0,
            conversationCount: convCounts[0]?.n ?? 0,
          };
        }),
      );

      const ok = await sendDigestEmail({
        userId: user.id,
        email: user.email,
        projects: projectsWithStats,
      });

      if (ok) {
        sent++;
      } else {
        failed++;
      }
    }

    logger.info({ sent, failed }, "weekly_digest.cron_completed");
    return NextResponse.json({ sent, failed });
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    logger.error({ cause }, "weekly_digest.cron_failed");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
