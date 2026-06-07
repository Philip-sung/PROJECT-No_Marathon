// AdSense 자리(공익 컨셉 비침습). Phase 8/9 에서 실제 슬롯/스크립트로 교체.
export function AdSlot({ label = '광고 영역' }: { label?: string }) {
  return (
    <div className="my-8 flex h-24 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-xs text-gray-300">
      {label} (AdSense placeholder)
    </div>
  );
}
