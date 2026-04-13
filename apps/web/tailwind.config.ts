import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdfa', // teal-50
          100: '#ccfbf1',
          500: '#14b8a6', // teal-500
          600: '#0d9488',
          700: '#0f766e',
          900: '#134e4a',
        },
        // premium dark mode / secondary
        slate: {
          850: '#151e2e',
          900: '#0f172a',
        },
        // IUT green accent
        iut: {
          green: '#006633',
          'green-light': '#e6f4ed',
        },
        admin: {
          purple: '#8b5cf6', // violet-500
        },
        cr: {
          amber: '#f59e0b', // amber-500
        },
      },
      fontFamily: {
        sans: ['Outfit', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.05)',
        'glass-hover': '0 8px 32px rgba(0, 0, 0, 0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
}
export default config
