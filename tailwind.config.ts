import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Pretendard Variable',
          'Pretendard',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        // 다크 미래지향 팔레트
        bg: '#07080d',
        surface: '#0e1018',
        elevated: '#12141d',
        line: 'rgba(255,255,255,0.08)',
        fg: '#e7e9ee',
        muted: '#8b93a7',
        accent: '#22d3ee', // electric cyan
        accent2: '#f43f5e', // rose (분노/시간 강조)
        violet: '#8b5cf6',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(34,211,238,0.25), 0 0 24px -4px rgba(34,211,238,0.45)',
        'glow-rose':
          '0 0 0 1px rgba(244,63,94,0.25), 0 0 40px -6px rgba(244,63,94,0.5)',
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 30px -12px rgba(0,0,0,0.6)',
      },
      keyframes: {
        pulseGlow: {
          '0%,100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        pulseGlow: 'pulseGlow 3s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
