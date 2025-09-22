import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Session } from '@supabase/supabase-js';

jest.mock('next/link', () => {
  return ({ children, href, ...rest }: any) => (
    <a href={typeof href === 'string' ? href : href.toString()} {...rest}>
      {children}
    </a>
  );
});

describe('/browse route', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('renders guest marketing teaser when no session', async () => {
    jest.doMock('@/lib/serverSession', () => ({
      getServerSession: jest.fn().mockResolvedValue(null),
    }));

    const Page = (await import('@/app/(site)/browse/page')).default;
    const result = await Page();
    const html = renderToStaticMarkup(result as React.ReactElement);

    expect(html).toContain('Senaryo pazaryeri yakında yayında');
    expect(html).toContain('Yapımcı olarak katıl');
  });

  it('renders producer hero when session role is producer', async () => {
    const session = {
      user: {
        user_metadata: { role: 'producer' },
      },
    } as unknown as Session;

    jest.doMock('@/lib/serverSession', () => ({
      getServerSession: jest.fn().mockResolvedValue(session),
    }));

    const Page = (await import('@/app/(site)/browse/page')).default;
    const result = await Page();
    const html = renderToStaticMarkup(result as React.ReactElement);

    expect(html).toContain('Yapımcılar için hızlı senaryo keşfi');
    expect(html).toContain('/dashboard/producer/browse');
  });

  it('renders writer upsell when session role is writer', async () => {
    const session = {
      user: {
        user_metadata: { role: 'writer' },
      },
    } as unknown as Session;

    jest.doMock('@/lib/serverSession', () => ({
      getServerSession: jest.fn().mockResolvedValue(session),
    }));

    const Page = (await import('@/app/(site)/browse/page')).default;
    const result = await Page();
    const html = renderToStaticMarkup(result as React.ReactElement);

    expect(html).toContain('Senarist paneline geç');
    expect(html).toContain('/dashboard/writer');
  });
});
