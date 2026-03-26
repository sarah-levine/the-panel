/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        panel: {
          bg: '#F2EDE4',
          surface: '#F7F3EC',
          text: '#4A4035',
          muted: '#9A8F82',
          border: '#D6CEBE',
          accent: '#E8C14A',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
