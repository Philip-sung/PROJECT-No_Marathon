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

      {/* 공익 이용 안내 */}
      <Reveal>
        <p className="mt-14 rounded-2xl border border-line/70 px-5 py-4 text-center text-sm leading-relaxed text-muted">
          이 페이지의 정보는 공익성 목적으로 누구나 가져가서 사용할 수 있습니다.
        </p>
      </Reveal>

      {/* 고지 및 면책 안내 */}
      <Reveal>
        <section className="mt-8 space-y-2.5 text-xs leading-relaxed text-muted/70">
          <h2 className="text-sm font-semibold text-muted">
            고지 및 면책 안내
          </h2>
          <p>
            본 사이트는 공익을 목적으로 한 시민 참여형 기록 플랫폼입니다. 특정
            행사나 주최자를 반대·비방하려는 것이 아니며, 마라톤 문화 자체는
            존중합니다. 충분한 교통 대책과 사전 공지를 통해 시민 불편을 줄이자는
            의견을 표명할 뿐입니다.
          </p>
          <p>
            게시된 불편 기록과 댓글은 각 작성자의 개인적 경험과 의견이며, 그
            내용에 대한 책임은 작성자 본인에게 있습니다. 운영자는 중립적인 게시
            공간을 제공할 뿐, 개별 게시물의 사실 여부를 보증하지 않습니다.
          </p>
          <p>
            집계된 수치는 참여자의 자발적 자기보고에 기반한 것으로 공식 통계가
            아니며, 실제와 차이가 있을 수 있습니다.
          </p>
          <p>
            표기된 주최측 정보는 공개된 자료를 바탕으로 소통을 위해 정리한
            것입니다. 교통 불편의 책임 소재는 행사 허가·교통 통제·사전 안내 등
            제도 전반에 걸쳐 있으며, 본 사이트는 특정 주최자의 위법 행위나
            고의·과실을 단정하지 않습니다. 다만 시민 불편을 줄이기 위한 대책
            마련을 정중히 요청합니다.
          </p>
          <p>
            사실과 다른 내용이나 정정이 필요한 부분이 있으면 언제든 알려
            주십시오. 신속히 검토하여 수정하겠습니다.
          </p>
        </section>
      </Reveal>
    </main>
  );
}
