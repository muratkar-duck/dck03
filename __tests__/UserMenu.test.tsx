/** @jest-environment jsdom */

import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import UserMenu from '@/components/UserMenu';

const mockPush = jest.fn();
const mockGetUser = jest.fn();
const mockUnsubscribe = jest.fn();

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
    onAuthStateChange: jest.fn(() => ({
      data: {
        subscription: {
          unsubscribe: mockUnsubscribe,
        },
      },
    })),
    signOut: jest.fn(),
    updateUser: jest.fn().mockResolvedValue({ error: null }),
    refreshSession: jest.fn(),
  },
};

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: () => mockSupabase,
}));

describe('UserMenu interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'focus@example.com',
          user_metadata: {},
        },
      },
    });
  });

  it('closes the menu on outside pointerdown', async () => {
    const user = userEvent.setup();
    render(<UserMenu />);

    const toggleButton = await screen.findByRole('button', { name: 'focus' });

    await user.click(toggleButton);

    const menuButton = await screen.findByRole('button', { name: /Rol Değiştir/ });
    await waitFor(() => expect(menuButton).toHaveFocus());

    fireEvent.pointerDown(document.body);

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(toggleButton).toHaveFocus();
    });
  });

  it('closes the menu on Escape key press', async () => {
    const user = userEvent.setup();
    render(<UserMenu />);

    const toggleButton = await screen.findByRole('button', { name: 'focus' });

    await user.click(toggleButton);

    const menuButton = await screen.findByRole('button', { name: /Rol Değiştir/ });
    await waitFor(() => expect(menuButton).toHaveFocus());

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(toggleButton).toHaveFocus();
    });
  });
});
