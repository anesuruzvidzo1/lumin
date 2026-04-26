function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

/**
 * Get Supabase anon/publishable key.
 * Supports both legacy ANON_KEY and new PUBLISHABLE_KEY naming.
 */
function getSupabaseKey(): string {
  const publishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  const key = publishableKey ?? anonKey;
  if (!key) {
    throw new Error(
      "Missing required environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return key;
}

export const env = {
  // App config
  NODE_ENV: getOptionalEnv("NODE_ENV", "development"),
  LOG_LEVEL: getOptionalEnv("LOG_LEVEL", "info"),
  APP_NAME: getOptionalEnv("APP_NAME", "lumin"),

  // Supabase config (required)
  NEXT_PUBLIC_SUPABASE_URL: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getSupabaseKey(),

  // Supabase service role key - required for server-side Storage operations
  // (bypasses RLS; never expose to the client)
  SUPABASE_SERVICE_ROLE_KEY: getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),

  // Database config (required)
  DATABASE_URL: getRequiredEnv("DATABASE_URL"),

  // Anthropic API key - required for AI query answering
  ANTHROPIC_API_KEY: getRequiredEnv("ANTHROPIC_API_KEY"),

  // Resend API key - optional, required for email digest feature
  RESEND_API_KEY: getOptionalEnv("RESEND_API_KEY", ""),

  // From address for email digest
  DIGEST_FROM_EMAIL: getOptionalEnv("DIGEST_FROM_EMAIL", "digest@lumin.app"),

  // Secret token for cron endpoints (passed as Authorization: Bearer <token>)
  CRON_SECRET: getOptionalEnv("CRON_SECRET", ""),

  // Public app URL used in email links
  APP_URL: getOptionalEnv("APP_URL", "http://localhost:3000"),
} as const;

export type Env = typeof env;
