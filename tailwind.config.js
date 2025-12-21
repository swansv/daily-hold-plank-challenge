/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          teal: '#006466',
          ocean: '#0f4c75',
          turquoise: '#20b2aa',
          green: '#2e8b57',
          purple: '#4d194d',
          slate: '#483d8b',
          cyan: '#008b8b',
          darkblue: '#144552',
        },
        ocean: {
          600: '#0f4c75',
        },
        success: {
          50: '#f0fdf4',
          600: '#2e8b57',
        },
        dark: {
          50: '#f8f9fa',
          800: '#495057',
          900: '#212529',
        },
      },
      fontFamily: {
        sans: [
          'Inter var',
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        display: [
          'Poppins',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'brand-sm': '0 1px 2px 0 rgba(0, 100, 102, 0.05)',
        'brand': '0 4px 6px -1px rgba(0, 100, 102, 0.1), 0 2px 4px -1px rgba(0, 100, 102, 0.06)',
        'brand-md': '0 10px 15px -3px rgba(0, 100, 102, 0.1), 0 4px 6px -2px rgba(0, 100, 102, 0.05)',
        'brand-lg': '0 20px 25px -5px rgba(0, 100, 102, 0.1), 0 10px 10px -5px rgba(0, 100, 102, 0.04)',
        'brand-xl': '0 25px 50px -12px rgba(0, 100, 102, 0.25)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #006466 0%, #0f4c75 100%)',
        'gradient-accent': 'linear-gradient(135deg, #20b2aa 0%, #006466 100%)',
        'gradient-success': 'linear-gradient(135deg, #2e8b57 0%, #20b2aa 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
