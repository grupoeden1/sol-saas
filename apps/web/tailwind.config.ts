import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Solar - Tema Dark
        background: {
          DEFAULT: '#0a0a0a', // Preto profundo
          secondary: '#1a1a1a', // Cinza escuro
        },
        foreground: {
          DEFAULT: '#fafaf9', // Off-white
          muted: '#a8a29e', // Cinza claro
        },
        solar: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d', // Amarelo solar
          400: '#fbbf24',
          500: '#f59e0b', // Âmbar principal
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        accent: {
          DEFAULT: '#f59e0b', // Âmbar
          hover: '#d97706',
        },
        border: '#1c1917', // stone-900 (dark border)
        input: '#1c1917',
        ring: '#f59e0b',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
