/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        accent: {
          50: '#fef3c7',
          100: '#fde68a',
          200: '#fcd34d',
          300: '#fbbf24',
          400: '#f59e0b',
          500: '#d97706',
          600: '#b45309',
          700: '#92400e',
          800: '#78350f',
          900: '#451a03',
        },
        // Retro game colors
        retro: {
          pico8: {
            pink: '#ff77a8',
            red: '#ff004d',
            orange: '#ffaa00',
            yellow: '#ffcc00',
            green: '#00e500',
            blue: '#00b4ff',
            purple: '#aa00ff',
            black: '#000000',
            dark: '#1d2b53',
            grey: '#7e2553',
            light: '#eaeaea',
            white: '#ffffff',
          },
          gameboy: {
            off: '#9bbc0f',
            light: '#8bac0f',
            medium: '#306230',
            dark: '#0f380f',
          },
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'cursive'],
        mono: ['"Courier New"', 'monospace'],
      },
      animation: {
        pixelate: 'pixelate 0.5s ease-in-out',
        glitch: 'glitch 1s infinite',
        float: 'float 3s ease-in-out infinite',
      },
      keyframes: {
        pixelate: {
          '0%, 100%': { filter: 'none' },
          '50%': { filter: 'blur(2px)' },
        },
        glitch: {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};
