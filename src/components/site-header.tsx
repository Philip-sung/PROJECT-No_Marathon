'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: '취지' },
  { href: '/record', label: '불편 기록' },
  { href: '/detour', label: '우회 안내' },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="text-sm font-bold tracking-tight">
          no-marathon<span className="text-brand-accent">.kr</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive(pathname, item.href)
                  ? 'rounded-md bg-gray-900 px-3 py-1.5 font-medium text-white'
                  : 'rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-100'
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
