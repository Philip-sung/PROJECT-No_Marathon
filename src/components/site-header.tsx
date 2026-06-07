'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

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
    <header className="sticky top-0 z-30 glass">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="text-sm font-extrabold tracking-tight">
          no-marathon<span className="text-accent">.kr</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-full px-3 py-1.5 transition-colors ${
                  active ? 'text-bg' : 'text-muted hover:text-fg'
                }`}
              >
                {active ? (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-accent shadow-glow"
                    transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                  />
                ) : null}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
