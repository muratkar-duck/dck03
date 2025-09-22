import { cookies } from 'next/headers';
import { createClient, type Session } from '@supabase/supabase-js';

function getProjectRef(url: string): string | null {
  try {
    const parsed = new URL(url);
    const [ref] = parsed.hostname.split('.');
    return ref ?? null;
  } catch {
    return null;
  }
}

function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

type CookieSessionPayload = {
  currentSession?: {
    access_token?: string;
    refresh_token?: string;
  } | null;
  access_token?: string;
  refresh_token?: string;
};

function extractSessionTokens(rawValue: string | undefined) {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(rawValue)) as CookieSessionPayload;
    const accessToken =
      parsed.currentSession?.access_token ?? parsed.access_token ?? null;
    const refreshToken =
      parsed.currentSession?.refresh_token ?? parsed.refresh_token ?? null;

    if (!accessToken || !refreshToken) {
      return null;
    }

    return { accessToken, refreshToken };
  } catch {
    return null;
  }
}

export async function getServerSession(): Promise<Session | null> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const projectRef = supabaseUrl ? getProjectRef(supabaseUrl) : null;

  if (!projectRef) {
    return null;
  }

  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieStore = cookies();
  const authCookie = cookieStore.get(cookieName)?.value;
  const tokens = extractSessionTokens(authCookie);

  if (!tokens) {
    return null;
  }

  const { accessToken, refreshToken } = tokens;

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    return null;
  }

  return data.session ?? null;
}
