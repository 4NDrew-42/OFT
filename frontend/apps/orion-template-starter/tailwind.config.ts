import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        orion: {
          primary: '#6366F1',
          accent: '#8B5CF6',
          surface: '#0F172A',
          glow: '#A5B4FC'
        }
      },
      fontFamily: {
        display: ['var(--font-display)', 'Inter', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        neon: '0 0 20px rgba(99, 102, 241, 0.35)'
      }
    }
  },
  plugins: []
};

export default config;
