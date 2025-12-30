/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./client/index.html",
    "./client/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'card-back': '#5A67D8',
        'card-face': '#F7FAFC',
        'board-bg': '#2D3748',
        'board-cell': '#4A5568',
        'board-cell-active': '#718096',
        'panel-bg': '#1A202C',
      }
    },
  },
  plugins: [],
}