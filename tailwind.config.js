/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './views/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#13ec5b',
          dark: '#0ea841',
          light: '#4ff585',
        },
        background: {
          DEFAULT: '#102216',
          lighter: '#152e1d',
          card: '#162e1d',
        },
        surface: {
          DEFAULT: 'rgba(21, 46, 29, 0.7)',
          hover: 'rgba(255, 255, 255, 0.05)',
        },
        accent: {
          blue: '#3b82f6',
          yellow: '#eab308',
          red: '#ef4444',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
