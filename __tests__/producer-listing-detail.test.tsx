/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProducerListingDetailPage from '@/app/dashboard/producer/listings/[id]/page';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useParams, useRouter } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock('@/components/AuthGuard', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/conversations', () => ({
  ensureConversationWithParticipants: jest
    .fn()
    .mockResolvedValue({ conversationId: null, error: null }),
}));

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockGetSupabaseClient = getSupabaseClient as jest.MockedFunction<
  typeof getSupabaseClient
>;

const alertSpy = jest
  .spyOn(window, 'alert')
  .mockImplementation(() => undefined);

afterAll(() => {
  alertSpy.mockRestore();
});

afterEach(() => {
  jest.clearAllMocks();
});

const baseListing = {
  id: 'listing-1',
  owner_id: 'producer-1',
  title: 'Test Listing',
  description: 'Detaylı açıklama',
  genre: 'Drama',
  budget: 150000,
  created_at: '2024-01-01T00:00:00.000Z',
  source: null,
};

const acceptedApplication = {
  id: 'application-1',
  owner_id: 'producer-1',
  status: 'accepted',
  created_at: '2024-01-02T00:00:00.000Z',
  script: {
    id: 'script-1',
    title: 'Deneme Senaryo',
    genre: 'Drama',
    length: 120,
    price_cents: 55000,
  },
  writer: {
    id: 'writer-1',
    email: 'yazar@example.com',
  },
};

function createSupabaseStub(): {
  client: any;
  orderInsertMock: jest.Mock;
  applicationUpdateMock: jest.Mock;
  applicationUpdateEqMock: jest.Mock;
} {
  const listingMaybeSingleMock = jest.fn().mockResolvedValue({
    data: baseListing,
    error: null,
  });

  const listingEqMock = jest.fn().mockReturnValue({
    maybeSingle: listingMaybeSingleMock,
  });

  const listingSelectMock = jest.fn().mockReturnValue({
    eq: listingEqMock,
  });

  const applicationsOrderMock = jest.fn().mockResolvedValue({
    data: [acceptedApplication],
    error: null,
  });

  const applicationsOrMock = jest.fn().mockReturnValue({
    order: applicationsOrderMock,
  });

  const applicationsEqMock = jest.fn().mockReturnValue({
    or: applicationsOrMock,
  });

  const applicationsSelectMock = jest.fn().mockReturnValue({
    eq: applicationsEqMock,
  });

  const applicationUpdateEqMock = jest
    .fn()
    .mockResolvedValue({ error: null });

  const applicationUpdateMock = jest.fn().mockReturnValue({
    eq: applicationUpdateEqMock,
  });

  const orderInsertMock = jest.fn().mockResolvedValue({ error: null });

  const fromMock = jest.fn((table: string) => {
    if (table === 'v_listings_unified') {
      return {
        select: listingSelectMock,
      };
    }

    if (table === 'applications') {
      return {
        select: applicationsSelectMock,
        update: applicationUpdateMock,
      };
    }

    if (table === 'orders') {
      return {
        insert: orderInsertMock,
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });

  const client = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'producer-1' } },
        error: null,
      }),
    },
    from: fromMock,
  };

  return {
    client,
    orderInsertMock,
    applicationUpdateMock,
    applicationUpdateEqMock,
  };
}

describe('Producer listing detail purchase flow', () => {
  it('transitions an accepted application to purchased after confirming purchase', async () => {
    const { client, orderInsertMock, applicationUpdateMock, applicationUpdateEqMock } =
      createSupabaseStub();

    mockUseParams.mockReturnValue({ id: 'listing-1' });
    mockUseRouter.mockReturnValue({ push: jest.fn() });
    mockGetSupabaseClient.mockReturnValue(client);

    render(<ProducerListingDetailPage />);

    const purchaseButton = await screen.findByText('🛒 Satın Al');
    fireEvent.click(purchaseButton);

    expect(
      await screen.findByText('Satın alma işlemini onaylayın')
    ).not.toBeNull();

    const confirmButton = screen.getByText('Satın almayı tamamla');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.queryByText('🛒 Satın Al')).toBeNull();
    });

    expect(screen.getByText('📄 PDF indir')).not.toBeNull();

    expect(orderInsertMock).toHaveBeenCalledWith({
      script_id: 'script-1',
      buyer_id: 'producer-1',
      amount_cents: 55000,
    });

    expect(applicationUpdateMock).toHaveBeenCalledWith({ status: 'purchased' });
    expect(applicationUpdateEqMock).toHaveBeenCalledWith('id', 'application-1');
  });
});

