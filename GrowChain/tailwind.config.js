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
        mono: ['Inter', 'monospace'],
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
        '2xl': '0px 24px 48px rgba(18, 20, 32, 0.25)',
        'blockchain': '0 0 20px rgba(150, 101, 255, 0.4)',
        'leaf': '0 0 15px rgba(47, 209, 140, 0.35)',
        'harvest': '0 0 15px rgba(240, 199, 85, 0.35)',
        'glow-sm': '0 0 5px currentColor',
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
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'rotate': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'scale': {
          '0%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' },
        },
        'ripple': {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '0' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'pan-background': {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '100% 100%' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'rotate': 'rotate 15s linear infinite',
        'rotate-slow': 'rotate 30s linear infinite',
        'scale': 'scale 0.3s ease-out',
        'ripple': 'ripple 1s cubic-bezier(0, 0, 0.2, 1) infinite',
        'bounce-soft': 'bounce-soft 2s ease-in-out infinite',
        'pan-background': 'pan-background 15s ease alternate infinite',
      },
      transitionTimingFunction: {
        'in-expo': 'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
        'out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
        'bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
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
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      backdropBlur: {
        'xs': '2px',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      const newUtilities = {
        '.text-shadow-sm': {
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
        },
        '.text-shadow': {
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        },
        '.text-shadow-md': {
          textShadow: '0 4px 8px rgba(0, 0, 0, 0.12)',
        },
        '.text-shadow-lg': {
          textShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
        },
        '.text-shadow-none': {
          textShadow: 'none',
        },
        '.rotate-y-180': {
          transform: 'rotateY(180deg)',
        },
        '.rotate-x-180': {
          transform: 'rotateX(180deg)',
        },
        '.backface-hidden': {
          backfaceVisibility: 'hidden',
        },
        '.preserve-3d': {
          transformStyle: 'preserve-3d',
        },
        '.perspective-1000': {
          perspective: '1000px',
        },
        '.backdrop-blur-2xl': {
          backdropFilter: 'blur(40px)',
        },
      };
      addUtilities(newUtilities);
    },
  ],
} 