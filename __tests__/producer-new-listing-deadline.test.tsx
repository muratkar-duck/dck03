/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockGetUser = jest.fn();
const mockInsert = jest.fn();
const mockFrom = jest.fn(() => ({ insert: mockInsert }));
const mockPush = jest.fn();

jest.mock('@/components/AuthGuard', () => ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

describe('NewProducerListingPage deadline validation', () => {
  const originalAlert = window.alert;

  beforeEach(() => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'producer-1' } },
      error: null,
    });
    mockInsert.mockResolvedValue({ error: null });
    mockFrom.mockImplementation(() => ({ insert: mockInsert }));
    mockPush.mockReset();
    window.alert = jest.fn();
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    window.alert = originalAlert;
  });

  const toLocalInputValue = (date: Date) => {
    const tzOffset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - tzOffset * 60000);
    return local.toISOString().slice(0, 16);
  };

  it('shows an alert when deadline is in the past', async () => {
    const Page = (await import('@/app/dashboard/producer/listings/new/page')).default;

    render(<Page />);

    await waitFor(() => expect(mockGetUser).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/Başlık/i), {
      target: { value: 'Test ilanı' },
    });
    fireEvent.change(screen.getByLabelText(/Tür/i), {
      target: { value: 'dram' },
    });
    fireEvent.change(screen.getByLabelText(/Bütçe/i), {
      target: { value: '1000' },
    });
    fireEvent.change(screen.getByLabelText(/Açıklama/i), {
      target: { value: 'Açıklama metni' },
    });

    const deadlineInput = screen.getByLabelText(/Son Teslim Tarihi/i);
    const pastValue = toLocalInputValue(new Date(Date.now() - 60 * 60 * 1000));

    fireEvent.change(deadlineInput, { target: { value: pastValue } });

    fireEvent.click(screen.getByRole('button', { name: /İlanı Yayınla/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Son teslim tarihi geçmiş olamaz.');
    });

    expect(mockInsert).not.toHaveBeenCalled();
  });
});
