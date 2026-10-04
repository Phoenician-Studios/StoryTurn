export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function isPlunkConfigured(): boolean {
  return Boolean(process.env.PLUNK_API_KEY);
}

export function isQstashConfigured(): boolean {
  return Boolean(
    process.env.QSTASH_TOKEN && process.env.QSTASH_CURRENT_SIGNING_KEY,
  );
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3456";
}

/** Demo mode runs when Supabase is not configured. */
export function isDemoMode(): boolean {
  return process.env.FORCE_DEMO_MODE === "1" || !isSupabaseConfigured();
}
