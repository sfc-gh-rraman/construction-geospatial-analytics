/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // GroundTruth Construction color palette - Earth tones with tech accents
        earth: {
          900: '#1a1614',
          800: '#292420',
          700: '#3d352e',
          600: '#534a41',
          500: '#6b5f54',
          400: '#8c7f73',
        },
        stone: {
          400: '#a8a29e',
          300: '#d6d3d1',
          200: '#e7e5e4',
        },
        accent: {
          amber: '#f59e0b',
          emerald: '#10b981',
          cyan: '#06b6d4',
          red: '#ef4444',
          orange: '#f97316',
          lime: '#84cc16',
        },
        // Safety colors
        safety: {
          green: '#22c55e',
          yellow: '#eab308',
          red: '#dc2626',
          orange: '#ea580c',
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'truck-move': 'truckMove 8s linear infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        truckMove: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(100px)' },
        }
      },
      backgroundImage: {
        'topography': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cg fill='none' stroke='%23292420' stroke-width='1'%3E%3Cpath d='M0 100c20-20 40-40 100-40s80 20 100 40'/%3E%3Cpath d='M0 60c20-10 40-20 100-20s80 10 100 20'/%3E%3Cpath d='M0 140c20 10 40 20 100 20s80-10 100-20'/%3E%3C/g%3E%3C/svg%3E\")",
      }
    },
  },
  plugins: [],
}
