/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        panel: {
          dark: '#1A1A2E',
          cream: '#F1EFE8',
          teal: '#0F6E56',
          'teal-light': '#E1F5EE',
          pink: '#D4537E',
          'pink-light': '#FBEAF0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
