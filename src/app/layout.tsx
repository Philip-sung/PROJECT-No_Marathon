import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { Analytics } from '@/components/analytics';
import { ToastProvider } from '@/components/ui/toast';
import { env } from '@/lib/env';

// SEO/SNS 확산 기반(여론 조성 목적). OG 이미지(public/og.png)는 scripts/generate-og.mjs 로 생성.
const SITE_TITLE = 'no-marathon.kr — 주말 마라톤 교통 불편, 함께 기록합니다';
const SITE_DESC =
  '서울 주말 마라톤 교통통제로 인한 시민 불편을 기록하고, 대책을 요구하며, 우회 정보를 제공합니다.';

export const metadata: Metadata = {
  metadataBase: new URL('https://no-marathon.kr'),
  title: {
    default: SITE_TITLE,
    template: '%s | no-marathon.kr',
  },
  description: SITE_DESC,
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'no-marathon.kr',
    title: SITE_TITLE,
    description: SITE_DESC,
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: '마라톤 교통불편으로 손해본 시간 : 기록중.. — no-marathon.kr',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESC,
    images: ['/og.png'],
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
      <body className="flex min-h-screen flex-col font-sans">
        <ToastProvider>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <footer className="border-t border-line py-8 text-center text-xs text-muted">
            no-marathon.kr · 시민 교통 불편 기록 프로젝트
          </footer>
        </ToastProvider>
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
