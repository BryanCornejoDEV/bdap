// tailwind.config.js
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#3b82f6',
          500: '#3b82f6',
          600: '#2563eb',
        },
      },
      boxShadow: {
        card: 'var(--md-shadow)',
        card2: 'var(--md-shadow-2)',
      },
      borderColor: {
        DEFAULT: 'var(--md-border)'
      }
    },
  },
  plugins: [],
}
