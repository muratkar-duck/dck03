import { render } from '@testing-library/react';

import TermsPage from '@/app/terms/page.mdx';

describe('TermsPage', () => {
  it('matches the snapshot', () => {
    const { container } = render(<TermsPage />);

    expect(container.firstChild).toMatchSnapshot();
  });
});
