import { render, screen } from '@testing-library/react';

jest.mock('@/components/UserMenu', () => () => <div data-testid="user-menu" />);
jest.mock('@/hooks/useSession', () => ({
  useSession: jest.fn(),
}));

import AppHeader from '@/components/AppHeader';
import { useSession } from '@/hooks/useSession';

const mockedUseSession = useSession as jest.MockedFunction<typeof useSession>;

describe('AppHeader navigation', () => {
  beforeEach(() => {
    mockedUseSession.mockReset();
  });

  it('renders the Messages link when a session is present', () => {
    mockedUseSession.mockReturnValue({ session: { user: {} } as any, loading: false });

    render(<AppHeader />);

    const messagesLink = screen.getByRole('link', { name: /messages/i });
    expect(messagesLink).toBeInTheDocument();
    expect(messagesLink).toHaveAttribute('href', '/messages');
  });

  it('hides the Messages link when there is no session', () => {
    mockedUseSession.mockReturnValue({ session: null, loading: false });

    render(<AppHeader />);

    const links = screen.queryAllByRole('link', { name: /messages/i });
    expect(links).toHaveLength(0);
  });
});
