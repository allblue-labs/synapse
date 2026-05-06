import type {Config} from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        display: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          '"SF Mono"',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      fontSize: {
        '2xs':       ['0.6875rem', {lineHeight: '1rem'}],
        'display':   ['clamp(2.75rem, 6vw, 4.5rem)', {lineHeight: '1.05', letterSpacing: '-0.04em', fontWeight: '700'}],
        'display-sm':['clamp(2rem, 4vw, 3rem)',      {lineHeight: '1.1',  letterSpacing: '-0.035em', fontWeight: '700'}],
        'eyebrow':   ['0.75rem', {lineHeight: '1rem', letterSpacing: '0.12em', fontWeight: '600'}],
      },
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Accent (cyan/teal) — used sparingly for gradients
        accent: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        // Neutral surface tokens
        surface: {
          base:    '#fafafa',
          subtle:  '#f4f4f5',
          elevated:'#ffffff',
        },
      },
      backgroundImage: {
        'brand-gradient':  'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
        'brand-radial':    'radial-gradient(circle at 30% 30%, rgba(59,130,246,0.18) 0%, transparent 50%)',
        'mesh-1':          'radial-gradient(at 20% 0%,  rgba(59,130,246,0.18) 0px, transparent 50%), radial-gradient(at 80% 30%, rgba(34,211,238,0.12) 0px, transparent 50%), radial-gradient(at 30% 80%, rgba(99,102,241,0.10) 0px, transparent 50%)',
        'mesh-dark':       'radial-gradient(at 20% 0%,  rgba(59,130,246,0.30) 0px, transparent 50%), radial-gradient(at 80% 20%, rgba(34,211,238,0.18) 0px, transparent 50%), radial-gradient(at 40% 90%, rgba(99,102,241,0.20) 0px, transparent 50%)',
        'grid-light':      'linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)',
        'grid-dark':       'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
        'fade-bottom':     'linear-gradient(to bottom, transparent 0%, rgb(255 255 255) 100%)',
        'fade-bottom-dark':'linear-gradient(to bottom, transparent 0%, rgb(9 9 11) 100%)',
      },
      boxShadow: {
        'soft':    '0 1px 2px 0 rgba(0,0,0,0.04), 0 1px 3px 0 rgba(0,0,0,0.06)',
        'card':    '0 4px 16px -2px rgba(0,0,0,0.06), 0 2px 4px -1px rgba(0,0,0,0.04)',
        'elevated':'0 20px 60px -10px rgba(0,0,0,0.12), 0 8px 24px -8px rgba(0,0,0,0.08)',
        'glow':    '0 0 0 1px rgba(59,130,246,0.18), 0 8px 24px -4px rgba(59,130,246,0.30)',
        'glow-lg': '0 0 0 1px rgba(59,130,246,0.20), 0 24px 60px -12px rgba(59,130,246,0.35)',
        'inner-border': 'inset 0 0 0 1px rgba(255,255,255,0.06)',
      },
      animation: {
        'fade-in':     'fadeIn 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up':    'slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'skeleton':    'skeleton 1.5s ease-in-out infinite',
        'pulse-glow':  'pulseGlow 3s ease-in-out infinite',
        'gradient':    'gradient 12s ease infinite',
        'float':       'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   {opacity: '0', transform: 'translateY(8px)'},
          '100%': {opacity: '1', transform: 'translateY(0)'},
        },
        slideUp: {
          '0%':   {opacity: '0', transform: 'translateY(12px)'},
          '100%': {opacity: '1', transform: 'translateY(0)'},
        },
        skeleton: {
          '0%, 100%': {opacity: '1'},
          '50%':      {opacity: '0.4'},
        },
        pulseGlow: {
          '0%, 100%': {opacity: '0.6'},
          '50%':      {opacity: '1'},
        },
        gradient: {
          '0%, 100%': {backgroundPosition: '0% 50%'},
          '50%':      {backgroundPosition: '100% 50%'},
        },
        float: {
          '0%, 100%': {transform: 'translateY(0px)'},
          '50%':      {transform: 'translateY(-8px)'},
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};

export default config;
