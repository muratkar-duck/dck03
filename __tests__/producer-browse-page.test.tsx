/** @jest-environment jsdom */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SupabaseClient } from '@supabase/supabase-js';
import '@testing-library/jest-dom';

import BrowseScriptsPage from '@/app/dashboard/producer/browse/page';

jest.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: jest.fn(),
}));

const { getSupabaseClient } = require('@/lib/supabaseClient') as {
  getSupabaseClient: jest.Mock;
};

type MockedSupabaseClient = Pick<
  SupabaseClient,
  'from' | 'rpc' | 'auth'
> & {
  __selectMock: jest.Mock;
  __orderMock: jest.Mock;
};

const baseScript = {
  id: 'script-1',
  title: 'Test Senaryo',
  genre: 'Dram',
  length: 120,
  synopsis: 'Kısa özet',
  created_at: new Date().toISOString(),
  price_cents: 10000,
  owner_id: 'writer-1',
};

function createSupabaseMock(
  overrides?: Partial<MockedSupabaseClient>
): MockedSupabaseClient {
  const orderMock = jest.fn().mockResolvedValue({
    data: [baseScript],
    error: null,
  });
  const selectMock = jest.fn().mockReturnValue({ order: orderMock });
  const fromMock = jest.fn().mockImplementation((table: string) => {
    if (table === 'scripts') {
      return { select: selectMock };
    }

    throw new Error(`Unexpected table request: ${table}`);
  });

  const rpcMock = jest
    .fn()
    .mockResolvedValue({ data: null, error: null });

  const authMock = {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'producer-1' } },
      error: null,
    }),
  };

  return {
    from: fromMock,
    rpc: rpcMock,
    auth: authMock,
    __selectMock: selectMock,
    __orderMock: orderMock,
    ...overrides,
  } as MockedSupabaseClient;
}

describe('BrowseScriptsPage interest handling', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('shows success toast when interest is recorded and notification enqueued', async () => {
    const supabase = createSupabaseMock();

    (supabase.rpc as jest.Mock).mockImplementation(
      (fnName: string, params: Record<string, unknown>) => {
        if (fnName === 'rpc_mark_interest') {
          return Promise.resolve({
            data: { ...baseScript, producer_id: 'producer-1' },
            error: null,
          });
        }

        if (fnName === 'enqueue_notification') {
          return Promise.resolve({ data: null, error: null });
        }

        throw new Error(`Unexpected RPC call ${fnName} with ${JSON.stringify(params)}`);
      }
    );

    getSupabaseClient.mockReturnValue(supabase);

    render(<BrowseScriptsPage />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'İlgi Göster' })).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole('button', { name: 'İlgi Göster' }));

    await waitFor(() =>
      expect(
        screen.getByText(
          `${baseScript.title} senaryosuna ilgi gösterdiniz. Senarist bilgilendirildi.`
        )
      ).toBeInTheDocument()
    );

    expect(supabase.rpc).toHaveBeenCalledWith('rpc_mark_interest', {
      script_id: baseScript.id,
    });
    expect(supabase.rpc).toHaveBeenCalledWith('enqueue_notification', {
      recipient_id: baseScript.owner_id,
      template: 'producer_interest_registered',
      payload: {
        script_id: baseScript.id,
        script_title: baseScript.title,
        producer_id: 'producer-1',
      },
    });
  });

  it('shows error toast when marking interest fails', async () => {
    const supabase = createSupabaseMock();

    (supabase.rpc as jest.Mock).mockImplementation((fnName: string) => {
      if (fnName === 'rpc_mark_interest') {
        return Promise.resolve({ data: null, error: new Error('rpc failed') });
      }

      return Promise.resolve({ data: null, error: null });
    });

    getSupabaseClient.mockReturnValue(supabase);

    render(<BrowseScriptsPage />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'İlgi Göster' })).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole('button', { name: 'İlgi Göster' }));

    await waitFor(() =>
      expect(screen.getByText('rpc failed')).toBeInTheDocument()
    );

    expect(supabase.rpc).toHaveBeenCalledWith('rpc_mark_interest', {
      script_id: baseScript.id,
    });
  });

  it('shows error toast when notification enqueue fails', async () => {
    const supabase = createSupabaseMock();

    (supabase.rpc as jest.Mock).mockImplementation((fnName: string) => {
      if (fnName === 'rpc_mark_interest') {
        return Promise.resolve({
          data: { ...baseScript, producer_id: 'producer-1' },
          error: null,
        });
      }

      if (fnName === 'enqueue_notification') {
        return Promise.resolve({ data: null, error: new Error('queue down') });
      }

      return Promise.resolve({ data: null, error: null });
    });

    getSupabaseClient.mockReturnValue(supabase);

    render(<BrowseScriptsPage />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'İlgi Göster' })).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole('button', { name: 'İlgi Göster' }));

    await waitFor(() =>
      expect(
        screen.getByText(
          `${baseScript.title} senaryosuna ilginiz kaydedildi ancak senaristi bilgilendirme denemesi başarısız oldu.`
        )
      ).toBeInTheDocument()
    );

    expect(supabase.rpc).toHaveBeenCalledWith('enqueue_notification', {
      recipient_id: baseScript.owner_id,
      template: 'producer_interest_registered',
      payload: {
        script_id: baseScript.id,
        script_title: baseScript.title,
        producer_id: 'producer-1',
      },
    });
  });
});
