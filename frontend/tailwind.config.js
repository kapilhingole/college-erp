/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        zes: {
          50: '#F0F7FD',
          100: '#E1EFFB',
          200: '#C2DFF7',
          300: '#95C7F1',
          400: '#6BA4D9', // Signature logo cerulean/sky blue
          500: '#4A90E2',
          600: '#2B6CB0',
          700: '#1E4E8C',
          800: '#1B365D', // Signature logo deep navy blue
          900: '#0F2341',
          950: '#081426',
        },
        navy: {
          800: '#0D1E3A',
          900: '#091528',
          950: '#050D1A',
        },
      },
    },
  },
  plugins: [],
};
