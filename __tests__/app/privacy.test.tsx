import { render } from '@testing-library/react';

import PrivacyPage from '@/app/privacy/page.mdx';

describe('PrivacyPage', () => {
  it('matches the snapshot', () => {
    const { container } = render(<PrivacyPage />);

    expect(container.firstChild).toMatchSnapshot();
  });
});
