/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Keep the structure neutral; restore color for semantic statuses and data.
        zinc: {
          50: '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7',
          300: '#D4D4D8',
          400: '#A1A1AA',
          500: '#71717A',
          600: '#52525B',
          700: '#3F3F46',
          800: '#27272A',
          900: '#18181B',
          950: '#09090B',
        },
        earth: { 50: '#FAFAFA', 100: '#F4F4F5', 200: '#E4E4E7', 300: '#D4D4D8', 500: '#71717A', 800: '#27272A', 950: '#09090B' },
        clay: { DEFAULT: '#71717A', 50: '#F4F4F5', 100: '#E4E4E7', 500: '#71717A', 700: '#3F3F46' },
      },
      fontFamily: {
        display: ['Inter', 'Geist', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        sans: [
          'Inter',
          'Geist',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
};
