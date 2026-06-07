import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { Analytics } from '@/components/analytics';
import { env } from '@/lib/env';

// SEO/SNS 확산 기반(여론 조성 목적). Phase 3에서 OG 이미지·페이지별 메타 확장.
export const metadata: Metadata = {
  metadataBase: new URL('https://no-marathon.kr'),
  title: {
    default: 'no-marathon.kr — 주말 마라톤 교통 불편, 함께 기록합니다',
    template: '%s | no-marathon.kr',
  },
  description:
    '서울 주말 마라톤 교통통제로 인한 시민 불편을 기록하고, 대책을 요구하며, 우회 정보를 제공합니다.',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'no-marathon.kr',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-400">
          no-marathon.kr · 시민 교통 불편 기록 프로젝트
        </footer>
        <Analytics />
        {env.NEXT_PUBLIC_ADSENSE_CLIENT ? (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${env.NEXT_PUBLIC_ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
