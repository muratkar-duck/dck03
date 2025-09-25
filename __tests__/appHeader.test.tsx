/** @jest-environment jsdom */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';

import AppHeader from '@/components/AppHeader';

const mockUseSession = jest.fn();
const mockUsePathname = jest.fn();

jest.mock('@/components/UserMenu', () => () => <div data-testid="user-menu" />);

jest.mock('next/link', () => {
  return ({ children, href, ...rest }: any) => (
    <a href={typeof href === 'string' ? href : href.toString()} {...rest}>
      {children}
    </a>
  );
});

jest.mock('next/image', () => {
  return function MockedImage({ priority: _priority, ...props }: any) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />;
  };
});

jest.mock('@/hooks/useSession', () => ({
  useSession: () => mockUseSession(),
}));

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('AppHeader navigation links', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows guest navigation with Turkish labels', () => {
    mockUseSession.mockReturnValue({ session: null, loading: false });

    render(<AppHeader />);

    const expectedLinks = [
      { label: 'Ana Sayfa', href: '/' },
      { label: 'Hakkımızda', href: '/about' },
      { label: 'Nasıl Çalışır', href: '/how-it-works' },
      { label: 'Planlar', href: '/plans' },
    ];

    expectedLinks.forEach(({ label, href }) => {
      const link = screen.getByRole('link', { name: label });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', href);
    });
  });

  it('renders writer dashboard routes when session role is writer', () => {
    const session = {
      user: {
        user_metadata: { role: 'writer' },
      },
    } as unknown as Session;

    mockUseSession.mockReturnValue({ session, loading: false });
    mockUsePathname.mockReturnValue('/dashboard/writer/messages');

    render(<AppHeader />);

    const expectedLinks = [
      { label: 'Keşfet', href: '/browse' },
      { label: 'Panel', href: '/dashboard/writer' },
      { label: 'Mesajlar', href: '/dashboard/writer/messages' },
    ];

    expectedLinks.forEach(({ label, href }) => {
      const link = screen.getByRole('link', { name: label });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', href);
    });
  });

  it('renders producer dashboard routes when session role is producer', () => {
    const session = {
      user: {
        user_metadata: { role: 'producer' },
      },
    } as unknown as Session;

    mockUseSession.mockReturnValue({ session, loading: false });
    mockUsePathname.mockReturnValue('/dashboard/producer');

    render(<AppHeader />);

    const expectedLinks = [
      { label: 'Keşfet', href: '/browse' },
      { label: 'Panel', href: '/dashboard/producer' },
      { label: 'Mesajlar', href: '/dashboard/producer/messages' },
    ];

    expectedLinks.forEach(({ label, href }) => {
      const link = screen.getByRole('link', { name: label });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', href);
    });
  });
});
