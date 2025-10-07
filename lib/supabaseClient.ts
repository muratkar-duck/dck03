'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

function initClient(): SupabaseClient | null {
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

export function getSupabaseClient(): SupabaseClient | null {
  if (client) {
    return client;
  }

  return initClient();
}

function requireSupabaseClient(): SupabaseClient {
  const instance = getSupabaseClient();

  if (!instance) {
    throw new Error('Supabase environment variables are not set.');
  }

  return instance;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const instance = requireSupabaseClient() as any;
    const value = Reflect.get(instance, prop, receiver);

    if (typeof value === 'function') {
      return value.bind(instance);
    }

    return value;
  },
});
