/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Mono"', 'Courier', 'monospace'],
      },
      colors: {
        brand: '#ffaa06',
        forest: '#0e5b4a',
      },
    },
  },
  plugins: [],
};

export default config;
