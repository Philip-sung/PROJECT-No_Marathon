// 정적 OG 이미지 생성기 (일회성).
// next/og(Satori) + Windows 맑은 고딕 임베드로 한글이 깨지지 않는 PNG를 만든다.
// 디자인 토큰은 tailwind.config.ts의 다크/시안/로즈 팔레트에 맞춤.
// 실행: node scripts/generate-og.mjs  → public/og.png
import og from 'next/og.js';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const { ImageResponse } = og;
import { createElement as h } from 'react';

const fontRegular = readFileSync('C:/Windows/Fonts/malgun.ttf');
const fontBold = readFileSync('C:/Windows/Fonts/malgunbd.ttf');

const BG = '#07080d';
const FG = '#e7e9ee';
const MUTED = '#8b93a7';
const ACCENT = '#22d3ee'; // electric cyan
const ROSE = '#f43f5e'; // 분노/시간 강조

const tree = h(
  'div',
  {
    style: {
      width: '1200px',
      height: '630px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '72px 80px',
      backgroundColor: BG,
      backgroundImage:
        'radial-gradient(circle at 50% 0%, rgba(34,211,238,0.18), transparent 55%), radial-gradient(circle at 100% 8%, rgba(139,92,246,0.16), transparent 50%)',
      fontFamily: 'Malgun',
      color: FG,
      position: 'relative',
    },
  },
  // 상단 미션 라벨
  h(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        fontSize: '54px',
        color: ACCENT,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        letterSpacing: '-0.015em',
      },
    },
    '모두가 행복한 성숙한 마라톤 문화를 위해',
  ),
  // 중앙 타이틀
  h(
    'div',
    { style: { display: 'flex', flexDirection: 'column' } },
    h(
      'div',
      {
        style: {
          fontSize: '94px',
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
          color: FG,
        },
      },
      '마라톤 교통불편으로',
    ),
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'baseline',
          fontSize: '94px',
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
        },
      },
      h('div', { style: { color: FG } }, '손해본 시간'),
      h('div', { style: { color: MUTED, margin: '0 14px' } }, ':'),
      h('div', { style: { color: ROSE } }, '기록중..'),
    ),
  ),
  // 하단 행: 도메인 + 로즈 강조바
  h(
    'div',
    { style: { display: 'flex', alignItems: 'center' } },
    h('div', {
      style: {
        width: '8px',
        height: '40px',
        borderRadius: '9999px',
        backgroundColor: ROSE,
        marginRight: '20px',
      },
    }),
    h(
      'div',
      { style: { fontSize: '40px', fontWeight: 700, color: FG } },
      'no-marathon.kr',
    ),
  ),
);

const img = new ImageResponse(tree, {
  width: 1200,
  height: 630,
  fonts: [
    { name: 'Malgun', data: fontRegular, weight: 400, style: 'normal' },
    { name: 'Malgun', data: fontBold, weight: 700, style: 'normal' },
  ],
});

const buf = Buffer.from(await img.arrayBuffer());
mkdirSync('public', { recursive: true });
writeFileSync('public/og.png', buf);
console.log(`✓ public/og.png 생성 완료 (${buf.length} bytes)`);
