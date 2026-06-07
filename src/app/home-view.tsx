'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Measure } from '@/lib/data/measures';
import { CountUp } from '@/components/ui/count-up';
import { Reveal } from '@/components/ui/reveal';
import { formatDurationKo, formatNumber } from '@/lib/format';

export function HomeView({
  totalMinutes,
  totalEntries,
  measures,
}: {
  totalMinutes: number;
  totalEntries: number;
  measures: Measure[];
}) {
  return (
    <main className="mx-auto max-w-2xl px-6 pb-20 pt-16">
      {/* Hero */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm font-semibold uppercase tracking-[0.2em] text-accent"
      >
        no-marathon.kr
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mt-3 text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl"
      >
        주말 마라톤 교통통제,
        <br />
        <span className="text-gradient">시민의 시간을 기록</span>합니다.
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-5 text-lg leading-relaxed text-muted"
      >
        마라톤을 막자는 것이 아닙니다. 충분한 교통 대책과 사전 공지로,{' '}
        <span className="font-semibold text-fg">불편을 겪는 시민이 없도록</span>{' '}
        하자는 것입니다.
      </motion.p>

      {/* 데이터+스토리 카운터 */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="glass mt-10 overflow-hidden rounded-3xl p-7 shadow-card"
      >
        <p className="text-xs uppercase tracking-wider text-muted">
          지금까지 기록된 불편
        </p>
        <CountUp
          value={totalMinutes}
          format={formatDurationKo}
          className="mt-2 block text-5xl font-extrabold tracking-tight text-gradient"
        />
        <p className="mt-2 text-sm text-muted">
          <CountUp value={totalEntries} format={formatNumber} />
          건의 기록이 모였습니다. 당신의 시간도 함께 기록해 주세요.
        </p>
        <Link
          href="/record"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-bg transition hover:shadow-glow"
        >
          내 불편 기록하기 →
        </Link>
      </motion.section>

      {/* 여론 기반 대책 */}
      <section className="mt-16">
        <Reveal>
          <h2 className="text-2xl font-bold">우리가 요구하는 대책</h2>
          <p className="mt-1 text-sm text-muted">
            뉴스 댓글 등 여론에서 자주 제기된 현실적인 요구입니다.
          </p>
        </Reveal>
        <ul className="mt-6 space-y-3">
          {measures.map((m, i) => (
            <Reveal key={m.id} delay={i * 0.06}>
              <motion.li
                whileHover={{ y: -3 }}
                className="glass rounded-2xl p-5 transition hover:border-accent/40"
              >
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-xl bg-accent/15 text-sm font-bold text-accent">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold">{m.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {m.description}
                    </p>
                    {m.source_hint ? (
                      <p className="mt-1.5 text-xs text-muted/70">
                        {m.source_hint}
                      </p>
                    ) : null}
                  </div>
                </div>
              </motion.li>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="mt-14 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/record"
          className="flex-1 rounded-full bg-accent px-5 py-3.5 text-center font-semibold text-bg transition hover:shadow-glow"
        >
          불편 기록하기
        </Link>
        <Link
          href="/detour"
          className="glass flex-1 rounded-full px-5 py-3.5 text-center font-semibold transition hover:border-accent/40"
        >
          우회 안내 보기
        </Link>
      </section>
    </main>
  );
}
