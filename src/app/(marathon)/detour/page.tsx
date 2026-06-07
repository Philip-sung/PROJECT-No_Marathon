import type { Metadata } from 'next';
import { DetourView } from './detour-view';

export const metadata: Metadata = {
  title: '우회 안내',
  description:
    '마라톤 교통통제 구간을 피해 가는 지하철·대체 버스 등 간단한 우회 정보를 제공합니다.',
  openGraph: {
    title: '우회 안내 | no-marathon.kr',
    description: '교통통제 구간 우회·대중교통 안내.',
  },
};

export default function DetourPage() {
  return <DetourView />;
}
