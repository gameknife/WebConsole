/** @type {import('tailwindcss').Config} */
// The Tailwind theme maps onto the CSS-variable design tokens defined in
// src/design/tokens.css, so utilities like `bg-bg-1` or `text-accent` resolve
// to the SteamOS-style token values (and stay swappable at runtime).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-0': 'var(--bg-0)',
        'bg-1': 'var(--bg-1)',
        'bg-2': 'var(--bg-2)',
        panel: 'var(--panel)',
        'text-0': 'var(--text-0)',
        'text-1': 'var(--text-1)',
        'text-dim': 'var(--text-dim)',
        accent: 'var(--accent)',
        'accent-strong': 'var(--accent-strong)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        focus: 'var(--focus-glow)',
      },
      backdropBlur: {
        glass: 'var(--blur)',
      },
      fontFamily: {
        sans: ['Inter', 'Fira Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
