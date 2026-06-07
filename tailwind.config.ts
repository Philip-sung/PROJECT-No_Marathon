import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // 공익 캠페인 톤(차분한 경고색 계열) — Phase 3에서 디자인 토큰 확장
        brand: {
          DEFAULT: '#1f2937',
          accent: '#dc2626',
        },
      },
    },
  },
  plugins: [],
};

export default config;
