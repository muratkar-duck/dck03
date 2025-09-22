import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Session } from '@supabase/supabase-js';

export async function getServerSession(): Promise<Session | null> {
  const cookieStore = cookies();
  const role = cookieStore.get('dt_role')?.value ?? null;

  const hasSupabaseEnv =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!hasSupabaseEnv) {
    return role ? ({ user: { user_metadata: { role } } } as unknown as Session) : null;
  }

  try {
    const supabase = createServerComponentClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      if (role && !session.user.user_metadata?.role) {
        session.user.user_metadata = {
          ...session.user.user_metadata,
          role,
        };
      }
      return session;
    }
  } catch (error) {
    console.error('Failed to fetch Supabase session', error);
  }

  return role ? ({ user: { user_metadata: { role } } } as unknown as Session) : null;
}
