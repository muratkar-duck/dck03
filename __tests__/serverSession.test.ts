import type { Session } from '@supabase/supabase-js';

describe('getServerSession', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns null when no auth cookie is present', async () => {
    jest.doMock('next/headers', () => ({
      cookies: () => ({
        get: () => undefined,
      }),
    }));
    jest.doMock('@supabase/auth-helpers-nextjs', () => ({
      createServerComponentClient: jest.fn(),
    }));

    const { getServerSession } = await import('@/lib/serverSession');
    const session = await getServerSession();

    expect(session).toBeNull();
  });

  it('returns a session-like object when dt_role cookie exists', async () => {
    jest.doMock('next/headers', () => ({
      cookies: () => ({
        get: (name: string) =>
          name === 'dt_role' ? { name, value: 'writer' } : undefined,
      }),
    }));
    jest.doMock('@supabase/auth-helpers-nextjs', () => ({
      createServerComponentClient: jest.fn(),
    }));

    const { getServerSession } = await import('@/lib/serverSession');
    const session = (await getServerSession()) as Session | null;

    expect(session).not.toBeNull();
    expect(session?.user?.user_metadata?.role).toBe('writer');
  });
});
