import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/components/AuthGuard', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/hooks/useSession', () => ({
  useSession: () => ({
    session: { user: { user_metadata: { role: 'producer' } } },
    loading: false,
  }),
}));

const mockGetSupabaseClient = jest.fn();

jest.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: mockGetSupabaseClient,
}));

jest.mock('@/lib/conversations', () => ({
  ensureConversationWithParticipants: jest.fn(),
}));

type QueryResponse = {
  data: Array<{
    id: string;
    status: string;
    created_at: string;
    listing_id: string | null;
    producer_listing_id: string | null;
    request_id: string | null;
    owner_id: string | null;
    producer_id: string | null;
    script_id: string | null;
    script_metadata: Record<string, unknown> | null;
    writer: { id: string; email: string } | null;
    listing: { id: string; title: string; source: string | null } | null;
    conversations: Array<{ id: string }>;
  }>;
  error: null;
  count: number;
};

describe('ProducerApplicationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders application list from supabase response', async () => {
    const response: QueryResponse = {
      data: [
        {
          id: 'application-1',
          status: 'pending',
          created_at: '2024-01-01T10:00:00Z',
          listing_id: 'listing-1',
          producer_listing_id: null,
          request_id: null,
          owner_id: 'owner-1',
          producer_id: 'producer-1',
          script_id: 'script-1',
          script_metadata: {
            id: 'script-1',
            title: 'Test Script',
            length: 90,
            price_cents: 150000,
          },
          writer: { id: 'writer-1', email: 'writer@example.com' },
          listing: { id: 'listing-1', title: 'Test Listing', source: 'requests' },
          conversations: [],
        },
      ],
      error: null,
      count: 1,
    };

    const queryBuilder = {
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: (resolve: (value: QueryResponse) => void) =>
        Promise.resolve(response).then(resolve),
    };

    const mockSelect = jest.fn().mockReturnValue(queryBuilder);

    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'producer-1' } },
        }),
      },
      from: jest.fn().mockReturnValue({
        select: mockSelect,
      }),
    };

    mockGetSupabaseClient.mockReturnValue(mockSupabase);

    const Page = require('@/app/dashboard/producer/applications/page').default;

    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText('writer@example.com')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Script')).toBeInTheDocument();
    expect(screen.getByText('Test Listing')).toBeInTheDocument();
    expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(1);
    expect(mockSupabase.from).toHaveBeenCalledWith('applications');
    expect(mockSelect).toHaveBeenCalled();
  });
});
