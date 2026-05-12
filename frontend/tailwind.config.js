/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html','./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50:'#eef2ff',100:'#e0e7ff',300:'#a5b4fc',400:'#818cf8',500:'#6366f1',600:'#4f46e5',700:'#4338ca',800:'#3730a3',900:'#312e81' },
        surface: { 950:'#050609',900:'#080910',800:'#0d0f18',700:'#111420',600:'#161927',500:'#1c2030',400:'#232840',300:'#2d3350' },
      },
      fontFamily: {
        display: ['"DM Serif Display"','Georgia','serif'],
        mono: ['"JetBrains Mono"','monospace'],
        sans: ['"DM Sans"','system-ui','sans-serif'],
      },
    },
  },
  plugins: [],
}
