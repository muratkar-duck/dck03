import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { SupabaseApplicationRow } from '@/types/producer-applications';

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

describe('ProducerApplicationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders application list from supabase response', async () => {
    const mockRange = jest.fn().mockResolvedValue({
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
          script_title: 'Test Script',
          script_genre: 'Drama',
          script_length: 90,
          script_price_cents: 150000,
          script_writer_email: 'writer@example.com',
          listing_title: 'Test Listing',
          listing_source: 'request',
          request_title: null,
          request_genre: null,
          request_length: null,
          request_writer_email: null,
          conversation_id: null,
        } satisfies SupabaseApplicationRow,
      ],
      error: null,
    });

    const queryBuilder: any = {};
    const mockSelect = jest.fn(() => queryBuilder);
    const mockOr = jest.fn(() => queryBuilder);
    const mockOrder = jest.fn(() => queryBuilder);
    const mockEq = jest.fn(() => queryBuilder);
    queryBuilder.select = mockSelect;
    queryBuilder.or = mockOr;
    queryBuilder.order = mockOrder;
    queryBuilder.range = mockRange;
    queryBuilder.eq = mockEq;

    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'producer-1' } },
        }),
      },
      from: jest.fn().mockReturnValue(queryBuilder),
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
    expect(queryBuilder.select).toHaveBeenCalled();
    expect(mockRange).toHaveBeenCalled();
  });
});
