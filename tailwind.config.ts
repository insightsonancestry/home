import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      container: {
        padding: '1rem',
        center: true,
      },
      colors: {
        primary: {
          DEFAULT: '#3B82F6',
          50: '#f5f3ff',
          100: '#e0e7ff',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
      },
      animation: {
        'gradient': 'gradient-shift 8s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite',
        'text-glow': 'text-glow 3s ease-in-out infinite',
        'border-dance': 'border-dance 3s linear infinite',
        'star-twinkle': 'star-twinkle 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;