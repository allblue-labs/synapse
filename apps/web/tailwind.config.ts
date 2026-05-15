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
        // Single source of truth for elevation.
        // - hairline      : nearly invisible — just a sub-pixel border on glass
        // - soft          : 1-line depth for tiles that sit on the ambient
        // - card          : day-to-day card depth, directional
        // - dock          : sticky floating chrome (cluster cards, hero stats)
        // - rail          : long vertical surfaces (sidebars, ticker)
        // - elevated      : transient elevation (dialogs, popovers)
        // - glass         : glass surface with thin inner highlight + soft drop
        // - glow / glow-lg: brand-glow accent for hero CTAs only
        'hairline':     '0 0 0 1px rgba(15,23,42,0.04)',
        'soft':         '0 1px 2px -1px rgba(15,23,42,0.04), 0 1px 2px 0 rgba(15,23,42,0.04)',
        'card':         '0 1px 0 0 rgba(15,23,42,0.04), 0 6px 18px -8px rgba(15,23,42,0.08), 0 2px 6px -2px rgba(15,23,42,0.04)',
        'dock':         '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -10px rgba(15,23,42,0.12), 0 2px 6px -2px rgba(15,23,42,0.06)',
        'rail':         '0 0 0 1px rgba(255,255,255,0.03) inset, 0 18px 48px -20px rgba(15,23,42,0.14)',
        'elevated':     '0 14px 40px -10px rgba(15,23,42,0.14), 0 4px 12px -4px rgba(15,23,42,0.06)',
        'glass':        '0 1px 0 0 rgba(255,255,255,0.50) inset, 0 1px 1px -1px rgba(15,23,42,0.05), 0 4px 12px -6px rgba(15,23,42,0.06)',
        'glass-dark':   '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 1px 1px -1px rgba(0,0,0,0.30), 0 4px 12px -6px rgba(0,0,0,0.35)',
        'glow':         '0 0 0 1px rgba(59,130,246,0.16), 0 6px 18px -6px rgba(59,130,246,0.24)',
        'glow-lg':      '0 0 0 1px rgba(59,130,246,0.20), 0 24px 60px -12px rgba(59,130,246,0.32)',
        'inner-border': 'inset 0 0 0 1px rgba(255,255,255,0.06)',
      },
      transitionTimingFunction: {
        'spring':  'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'snap':    'cubic-bezier(0.22, 1, 0.36, 1)',
        'soft':    'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        // Enter / exit
        'fade-in':       'fadeIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in-fast':  'fadeIn 0.22s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-out':      'fadeOut 0.22s cubic-bezier(0.4, 0, 0.2, 1) both',
        'slide-up':      'slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-down':    'slideDown 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-in-right':'slideInRight 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-in-left': 'slideInLeft 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
        'panel-in':      'panelIn 0.42s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pop-in':        'popIn 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        // Microinteraction
        'press':         'press 0.18s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'count-up':      'countUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        // Ambient / status
        'skeleton':      'skeleton 1.5s ease-in-out infinite',
        'pulse-glow':    'pulseGlow 3s ease-in-out infinite',
        'pulse-dot':     'pulseDot 1.6s ease-in-out infinite',
        'spinner':       'spinnerRotate 0.85s linear infinite',
        'gradient':      'gradient 12s ease infinite',
        'float':         'float 6s ease-in-out infinite',
        'shimmer':       'shimmer 2.4s linear infinite',
        'marquee':       'marquee 38s linear infinite',
        'ticker':        'ticker 18s linear infinite',
        'sweep':         'sweep 4.5s ease-in-out infinite',
        'orbit-slow':    'orbit 28s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   {opacity: '0', transform: 'translateY(6px)'},
          '100%': {opacity: '1', transform: 'translateY(0)'},
        },
        slideUp: {
          '0%':   {opacity: '0', transform: 'translateY(12px)'},
          '100%': {opacity: '1', transform: 'translateY(0)'},
        },
        slideDown: {
          '0%':   {opacity: '0', transform: 'translateY(-8px)'},
          '100%': {opacity: '1', transform: 'translateY(0)'},
        },
        slideInRight: {
          '0%':   {opacity: '0', transform: 'translateX(16px)'},
          '100%': {opacity: '1', transform: 'translateX(0)'},
        },
        slideInLeft: {
          '0%':   {opacity: '0', transform: 'translateX(-12px)'},
          '100%': {opacity: '1', transform: 'translateX(0)'},
        },
        fadeOut: {
          '0%':   {opacity: '1'},
          '100%': {opacity: '0'},
        },
        press: {
          '0%':   {transform: 'scale(1)'},
          '40%':  {transform: 'scale(0.96)'},
          '100%': {transform: 'scale(1)'},
        },
        countUp: {
          '0%':   {opacity: '0', transform: 'translateY(6px)'},
          '100%': {opacity: '1', transform: 'translateY(0)'},
        },
        spinnerRotate: {
          '0%':   {transform: 'rotate(0deg)'},
          '100%': {transform: 'rotate(360deg)'},
        },
        panelIn: {
          '0%':   {opacity: '0', transform: 'translateY(8px) scale(0.985)', filter: 'blur(2px)'},
          '60%':  {opacity: '1', filter: 'blur(0)'},
          '100%': {opacity: '1', transform: 'translateY(0) scale(1)', filter: 'blur(0)'},
        },
        popIn: {
          '0%':   {opacity: '0', transform: 'scale(0.92)'},
          '100%': {opacity: '1', transform: 'scale(1)'},
        },
        skeleton: {
          '0%, 100%': {opacity: '1'},
          '50%':      {opacity: '0.4'},
        },
        pulseGlow: {
          '0%, 100%': {opacity: '0.55'},
          '50%':      {opacity: '1'},
        },
        pulseDot: {
          '0%, 100%': {opacity: '1', transform: 'scale(1)'},
          '50%':      {opacity: '0.4', transform: 'scale(0.85)'},
        },
        gradient: {
          '0%, 100%': {backgroundPosition: '0% 50%'},
          '50%':      {backgroundPosition: '100% 50%'},
        },
        float: {
          '0%, 100%': {transform: 'translateY(0px)'},
          '50%':      {transform: 'translateY(-8px)'},
        },
        shimmer: {
          '0%':   {transform: 'translateX(-100%)'},
          '100%': {transform: 'translateX(100%)'},
        },
        marquee: {
          '0%':   {transform: 'translateX(0)'},
          '100%': {transform: 'translateX(-50%)'},
        },
        ticker: {
          '0%':   {transform: 'translateY(0)'},
          '100%': {transform: 'translateY(-50%)'},
        },
        sweep: {
          '0%':   {transform: 'translateX(-100%)', opacity: '0'},
          '40%':  {opacity: '1'},
          '100%': {transform: 'translateX(120%)', opacity: '0'},
        },
        orbit: {
          '0%':   {transform: 'rotate(0deg)'},
          '100%': {transform: 'rotate(360deg)'},
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
