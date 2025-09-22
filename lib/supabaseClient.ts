'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (client) {
    return client;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const message = 'Supabase environment variables are not set.';

    if (process.env.NODE_ENV !== 'production') {
      console.error(message);
    } else {
      console.warn(message);
    }

    return null;
  }

  client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}
