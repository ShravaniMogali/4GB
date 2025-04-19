/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Soil colors
        'soil-dark': '#1c2033',
        'soil-medium': '#2a2f45',
        'soil-light': '#343a56',
        
        // Leaf colors
        'leaf-primary': '#2fd18c',
        'leaf-light': '#4aeaa8',
        'leaf-dark': '#25a66e',
        
        // Harvest colors
        'harvest-yellow': '#f0c755',
        'harvest-orange': '#ff9138',
        'harvest-red': '#ff5e5b',
        
        // Sky colors
        'sky-light': '#e4f5ff',
        'sky-medium': '#a7ddf8',
        'sky-bright': '#56c4fc',
        
        // Blockchain accent colors
        'blockchain-blue': '#3d73ff',
        'blockchain-purple': '#9665ff',
        'blockchain-cyan': '#3dcaff',
        
        // Neutral palette
        'neutral-50': '#f9fafc',
        'neutral-100': '#f1f2f6',
        'neutral-200': '#dde0ea',
        'neutral-300': '#b7bcce',
        'neutral-400': '#8e94ad',
        'neutral-500': '#656c8c',
        'neutral-600': '#4d5370',
        'neutral-700': '#363b54',
        'neutral-800': '#232638',
        'neutral-900': '#121420',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        heading: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'sm': '4px',
        DEFAULT: '8px',
        'md': '8px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
      },
      boxShadow: {
        sm: '0px 1px 2px rgba(18, 20, 32, 0.08)',
        DEFAULT: '0px 4px 8px rgba(18, 20, 32, 0.12)',
        md: '0px 4px 8px rgba(18, 20, 32, 0.12)',
        lg: '0px 8px 16px rgba(18, 20, 32, 0.16)',
        xl: '0px 12px 24px rgba(18, 20, 32, 0.2)',
        'blockchain': '0 0 20px rgba(150, 101, 255, 0.4)',
        'leaf': '0 0 15px rgba(47, 209, 140, 0.35)',
        'harvest': '0 0 15px rgba(240, 199, 85, 0.35)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pulse': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      transitionTimingFunction: {
        'in-expo': 'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
        'out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
      },
      spacing: {
        '4xs': '0.125rem', // 2px
        '3xs': '0.25rem',  // 4px
        '2xs': '0.375rem', // 6px
        'xs': '0.5rem',    // 8px
        'sm': '0.75rem',   // 12px
        'md': '1rem',      // 16px
        'lg': '1.5rem',    // 24px
        'xl': '2rem',      // 32px
        '2xl': '2.5rem',   // 40px
        '3xl': '3rem',     // 48px
        '4xl': '4rem',     // 64px
      },
    },
  },
  plugins: [],
} 