import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

jest.mock('react-simple-typewriter', () => ({
  Typewriter: ({ words }: { words: string[] }) => <span>{words[0]}</span>,
}));

describe('Home page', () => {
  it('matches snapshot', async () => {
    const HomePage = (await import('@/app/page')).default;
    const html = renderToStaticMarkup(<HomePage />);

    expect(html).toMatchSnapshot();
  });
});
