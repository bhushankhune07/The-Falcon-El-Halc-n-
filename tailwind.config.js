/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        isro: {
          orange: '#FF9933',
          navy: '#0B132B',
          deep: '#030712',
          blue: '#1C2541',
          cyan: '#3A506B',
          glow: '#48E5C2',
          saffron: '#FF6F00',
          accent: '#00F0FF',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
