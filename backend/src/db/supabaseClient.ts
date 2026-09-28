import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseClient(env: {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}): SupabaseClient | null {
  const nodeEnv = (typeof process !== 'undefined' ? process.env : {}) as Record<string, string | undefined>;

  const url = env.SUPABASE_URL || nodeEnv.SUPABASE_URL || '';
  const key =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_ANON_KEY ||
    nodeEnv.SUPABASE_SERVICE_ROLE_KEY ||
    nodeEnv.SUPABASE_ANON_KEY ||
    '';

  if (!url || !key || url.includes('your-project')) {
    return null;
  }

  return createClient(url, key);
}
