import { db } from "@/core/database/client";
import { users } from "@/core/database/schema";

/**
 * Upsert a Supabase Auth user into public.users.
 *
 * Called on every authenticated request from the dashboard layout so that
 * users who signed up before the auth trigger was configured are backfilled,
 * and as a safety net for any new users. The ON CONFLICT DO NOTHING makes this
 * a cheap no-op once the row exists.
 */
export async function syncUser(id: string, email: string): Promise<void> {
  await db.insert(users).values({ id, email }).onConflictDoNothing();
}
