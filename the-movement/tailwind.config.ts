import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#0b0d12', 900: '#11141b', 850: '#161a23', 800: '#1c212c', 700: '#262c3a', 600: '#363e50', 500: '#4b5468', 400: '#7a8399', 300: '#a8afc0', 200: '#d0d5df', 100: '#eceef3' },
        parchment: { 50: '#fbf8f1', 100: '#f4eedf', 200: '#e8dcc0', 300: '#d6c39a' },
        seal: { 500: '#b3403a', 600: '#8f2f2a' },
        brass: { 300: '#e8cf8a', 400: '#d8b55e', 500: '#b8933a' },
      },
      fontFamily: {
        serif: ['"Iowan Old Style"', '"Palatino Linotype"', 'Palatino', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
