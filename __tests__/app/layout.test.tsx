import { render, within } from '@testing-library/react';

jest.mock('@/components/AppHeader', () => () => (
  <div data-testid="mock-app-header" />
));
jest.mock('@/components/TabTitleHandler', () => () => null);

import RootLayout from '@/app/layout';

describe('RootLayout footer', () => {
  it('renders links to privacy and terms pages', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const { container } = render(
      <RootLayout>
        <div />
      </RootLayout>
    );

    const footer = container.querySelector('[data-test-id="app-footer"]');
    if (!(footer instanceof HTMLElement)) {
      throw new Error('Footer not rendered');
    }
    const privacyLink = within(footer).getByRole('link', {
      name: /gizlilik politikası/i,
    });
    const termsLink = within(footer).getByRole('link', {
      name: /kullanım şartları/i,
    });

    expect(privacyLink).toHaveAttribute('href', '/privacy');
    expect(termsLink).toHaveAttribute('href', '/terms');

    consoleError.mockRestore();
  });
});
