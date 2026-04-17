import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ["class"],
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
        // Semantic colors for status/type badges
        semantic: {
          success: '#10b981', // emerald-500
          warning: '#f59e0b', // amber-500
          danger: '#ef4444', // red-500
          info: '#3b82f6', // blue-500
          purple: '#a855f7', // purple-600
        },
        // Stat card gradient accents
        'stat-success': '#10b98133',
        'stat-warning': '#f59e0b33',
        'stat-danger': '#ef444433',
        'stat-info': '#3b82f633',
        'stat-purple': '#a855f733',
      },
      fontFamily: {
        sans: ['var(--font-outfit)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.05)',
        'glass-hover': '0 8px 32px rgba(0, 0, 0, 0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'gradient': 'gradient 6s ease infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'scale-in': 'scaleIn 0.3s ease-out',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        shimmer: {
          '0%': { opacity: '0.5' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0.5' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        bounceSubtle: {
          '0%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-6px)' },
          '60%': { transform: 'translateY(-3px)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
    },
  },
}
export default config
