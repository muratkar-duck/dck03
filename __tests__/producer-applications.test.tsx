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
    application_id: string | null;
    status: string;
    created_at: string;
    listing_id: string | null;
    producer_listing_id: string | null;
    request_id: string | null;
    owner_id: string | null;
    producer_id: string | null;
    script_id: string | null;
    script_metadata: Record<string, unknown> | null;
    listing_title: string | null;
    listing_source: string | null;
    writer_email: string | null;
    conversation_id: string | null;
  }>;
  error: null;
};

describe('ProducerApplicationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders application list from supabase response', async () => {
    const response: QueryResponse = {
      data: [
        {
          application_id: 'application-1',
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
          listing_title: 'Test Listing',
          listing_source: 'request',
          writer_email: 'writer@example.com',
          conversation_id: null,
        },
      ],
      error: null,
    };

    const mockRpc = jest.fn().mockResolvedValue(response);

    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'producer-1' } },
        }),
      },
      rpc: mockRpc,
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
    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_producer_applications', {
      producer_id: 'producer-1',
      status: null,
      limit: 11,
      offset: 0,
    });
  });
});
