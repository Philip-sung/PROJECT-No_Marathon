import type { Metadata } from 'next';
import { RecordView } from './record-view';

export const metadata: Metadata = {
  title: '불편 기록',
  description:
    '주말 마라톤 교통통제로 허비한 시간을 함께 기록합니다. 불편 시간 합계와 시민들의 목소리.',
  openGraph: {
    title: '불편 기록 | no-marathon.kr',
    description: '마라톤 교통통제로 허비한 시간, 함께 기록해요.',
  },
};

export default function RecordPage() {
  return <RecordView />;
}
