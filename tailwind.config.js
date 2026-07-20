/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Groene/aardse kleuren voor de tuin-app
        tuin: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        aarde: {
          50: '#fdf8f6',
          100: '#f2e8e5',
          200: '#eaddd7',
          300: '#e0cfc7',
          400: '#c9b8a8',
          500: '#a89585',
          600: '#8b7355',
          700: '#6b5344',
          800: '#4a3728',
          900: '#2d1f14',
        },
      },
    },
  },
  plugins: [],
}
