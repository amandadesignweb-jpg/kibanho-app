/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Paleta Kibanho — extraída 1:1 dos wireframes (project/*.dc.html)
        // tons de azul, terracota, off-white e preto
        ink: '#191512',
        bg: '#f3efe8',
        card: '#ffffff',
        border: {
          DEFAULT: '#e9e1d4',
          soft: '#ece5d8',
          faint: '#f0ebe0',
        },
        text: {
          muted: '#8a8074',
          faint: '#a79c8e',
          soft: '#6e655c',
          light: '#9a8f80',
        },
        blue: {
          DEFAULT: '#2f5d82',
          dark: '#1f4560',
          mid: '#33628c',
          deep: '#1c3f5a',
          tint: '#eaf1f8',
          tint2: '#e2edf6',
          bar1: '#dbe8f3',
          bar2: '#cfe0ee',
          bar3: '#a9c6de',
        },
        terracota: {
          DEFAULT: '#c2703d',
          dark: '#a8562a',
          strong: '#a8341a',
          tint: '#f5e5d8',
          tint2: '#fbf1e7',
          border: '#f0dcc8',
          border2: '#f6d9cd',
        },
      },
      borderRadius: {
        card: '20px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(26,22,19,0.04), 0 14px 30px -16px rgba(26,22,19,0.14)',
        rowcard: '0 1px 2px rgba(26,22,19,0.03), 0 10px 22px -16px rgba(26,22,19,0.14)',
      },
    },
  },
  plugins: [],
}
