/** @jest-environment jsdom */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';

import UserMenu from '@/components/UserMenu';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockGetUser = jest.fn();
const mockSignOut = jest.fn();

const createQueryBuilder = (count: number) => {
  const result = { count };
  const builder: any = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    in: jest.fn(() => builder),
    then: (resolve: any, reject?: any) =>
      Promise.resolve(result).then(resolve, reject),
    catch: (reject: any) => Promise.resolve(result).catch(reject),
    finally: (onFinally: any) => Promise.resolve(result).finally(onFinally),
  };
  return builder;
};

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
    onAuthStateChange: jest.fn(() => ({
      data: {
        subscription: { unsubscribe: jest.fn() },
      },
    })),
    signOut: mockSignOut,
  },
  from: jest.fn((table: string) => {
    if (table === 'applications') return createQueryBuilder(4);
    if (table === 'conversations') return createQueryBuilder(2);
    return createQueryBuilder(0);
  }),
};

jest.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: jest.fn(() => mockSupabase),
}));

describe('UserMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'writer@example.com',
          user_metadata: { role: 'writer' },
        },
      },
    });
  });

  it('omits role switching actions while keeping badges functional', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<UserMenu />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await Promise.resolve();
    });

    const trigger = container.querySelector('button[aria-haspopup="menu"]');
    expect(trigger).not.toBeNull();

    await act(async () => {
      trigger!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const menu = container.querySelector('[role="menu"]');
    expect(menu).not.toBeNull();
    expect(menu?.textContent).toContain('Rol: Senarist');
    expect(menu?.textContent).not.toContain('Rol Değiştir');

    const buttons = Array.from(menu!.querySelectorAll('button'));
    const messagesBtn = buttons.find((btn) => btn.textContent?.includes('💬 Sohbetler'));
    const notificationsBtn = buttons.find((btn) => btn.textContent?.includes('🔔 Bildirimler'));

    expect(messagesBtn?.textContent).toContain('2');
    expect(notificationsBtn?.textContent).toContain('4');

    await act(async () => {
      root.unmount();
    });

    document.body.removeChild(container);
  });
});

