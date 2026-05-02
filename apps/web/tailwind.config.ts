import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#111312',
        graphite: '#2b302f',
        pearl: '#f6f5ef',
        mist: '#ebe9df',
        bone: '#fffdf7',
        line: '#dad7cb',
        signal: '#148f77',
        pulse: '#3157d5',
        ember: '#c95f3b',
        gold: '#b98924'
      },
      boxShadow: {
        panel: '0 1px 2px rgba(17, 19, 18, 0.08), 0 24px 70px rgba(17, 19, 18, 0.08)',
        lift: '0 18px 60px rgba(17, 19, 18, 0.12)'
      }
    }
  },
  plugins: []
};

export default config;
