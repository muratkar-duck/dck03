import { render, screen } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';

jest.mock('@/components/UserMenu', () => () => <div data-testid="user-menu" />);
jest.mock('@/lib/serverSession', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

import MessagesPage from '@/app/messages/page';
import { getServerSession } from '@/lib/serverSession';
import { redirect } from 'next/navigation';

describe('/messages page', () => {
  beforeEach(() => {
    (getServerSession as jest.Mock).mockReset();
    (redirect as jest.Mock).mockReset();
  });

  it('redirects unauthenticated users to the sign-in page', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    await MessagesPage();

    expect(redirect).toHaveBeenCalledWith('/auth/sign-in');
  });

  it('renders the empty state for authenticated users', async () => {
    const fakeSession = {
      user: {
        id: 'user-1',
        email: 'user@example.com',
        app_metadata: {},
        user_metadata: { role: 'writer' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      },
    } as unknown as Session;

    (getServerSession as jest.Mock).mockResolvedValue(fakeSession);

    const result = await MessagesPage();
    render(result);

    expect(screen.getByRole('heading', { name: 'Mesajlar' })).toBeInTheDocument();
    expect(screen.getByText('Henüz mesaj yok')).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });
});
