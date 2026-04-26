import { createClient } from "@supabase/supabase-js";

import { env } from "@/core/config/env";

/**
 * Supabase admin client for server-side Storage operations.
 * Uses the service role key, so it bypasses Row Level Security.
 * NEVER expose this client or the service role key to the browser.
 */
const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export const STORAGE_BUCKET = "data-sources";

/**
 * Upload a file to Supabase Storage.
 * Returns the storage key (path) on success.
 */
export async function uploadFile(
  key: string,
  file: File | Buffer,
  contentType: string,
): Promise<string> {
  const { error } = await adminClient.storage.from(STORAGE_BUCKET).upload(key, file, {
    contentType,
    upsert: false,
  });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return key;
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFile(key: string): Promise<void> {
  const { error } = await adminClient.storage.from(STORAGE_BUCKET).remove([key]);
  if (error) {
    throw new Error(`Storage delete failed: ${error.message}`);
  }
}

/**
 * Create a signed URL for temporary access to a private file.
 * Default expiry is 1 hour.
 */
export async function createSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  const { data, error } = await adminClient.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(key, expiresInSeconds);

  if (error || !data) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? "unknown error"}`);
  }

  return data.signedUrl;
}
