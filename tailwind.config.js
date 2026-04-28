/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          900: '#0b2948',
          800: '#103256',
          700: '#16406f'
        },
        accent: {
          600: '#f97316'
        }
      }
    }
  },
  plugins: []
}
