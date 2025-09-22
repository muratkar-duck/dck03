import { renderToStaticMarkup } from 'react-dom/server';

import AboutPage from '@/app/about/page';
import HowItWorksPage from '@/app/how-it-works/page';

describe('brand usage across pages', () => {
  it('renders the shared brand on the about page', () => {
    const html = renderToStaticMarkup(<AboutPage />);

    expect(html).toContain('Ducktylo');
    expect(html).not.toContain('PlotMatch');
  });

  it('renders the shared brand on the how it works page', () => {
    const html = renderToStaticMarkup(<HowItWorksPage />);

    expect(html).toContain('Ducktylo');
    expect(html).not.toContain('PlotMatch');
  });
});
