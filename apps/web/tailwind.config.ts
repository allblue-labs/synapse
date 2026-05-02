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
        ink: '#101214',
        graphite: '#24282d',
        pearl: '#f7f7f4',
        mist: '#eef1f3',
        signal: '#1f9d8a',
        pulse: '#3867ff',
        ember: '#df6b3f'
      },
      boxShadow: {
        panel: '0 1px 2px rgba(16, 18, 20, 0.08), 0 10px 30px rgba(16, 18, 20, 0.06)'
      }
    }
  },
  plugins: []
};

export default config;
