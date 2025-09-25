import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import UserMenu from '@/components/UserMenu';

const mockRouterPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

jest.mock('next/link', () => {
  return ({ children, href, ...rest }: any) => (
    <a href={typeof href === 'string' ? href : href.toString()} {...rest}>
      {children}
    </a>
  );
});

let mockSupabase: any;
let notificationsQuery: any;
let conversationsQuery: any;
const unsubscribe = jest.fn();

jest.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: () => mockSupabase,
}));

describe('UserMenu notification badges', () => {
  beforeEach(() => {
    notificationsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      is: jest.fn().mockResolvedValue({ count: 3 }),
    };

    conversationsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ count: 1 }),
    };

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-1',
              email: 'writer@example.com',
              user_metadata: { role: 'writer' },
            },
          },
        }),
        onAuthStateChange: jest.fn().mockReturnValue({
          data: { subscription: { unsubscribe } },
        }),
        refreshSession: jest.fn(),
        updateUser: jest.fn(),
        signOut: jest.fn(),
      },
      from: jest.fn((table: string) => {
        if (table === 'notifications') {
          return notificationsQuery;
        }
        if (table === 'conversations') {
          return conversationsQuery;
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders badge counts from notifications table', async () => {
    render(<UserMenu />);

    await waitFor(() => expect(mockSupabase.auth.getUser).toHaveBeenCalled());

    fireEvent.click(await screen.findByRole('button', { name: /writer/i }));

    await waitFor(() => {
      expect(screen.getByText('🔔 Bildirimler')).toBeInTheDocument();
    });

    expect(await screen.findByText('3')).toBeInTheDocument();
    expect(await screen.findByText('1')).toBeInTheDocument();

    expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
    expect(notificationsQuery.is).toHaveBeenCalledWith('read_at', null);
  });
});
