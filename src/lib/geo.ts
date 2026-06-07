/**
 * 좌표 → 대략적 서울 권역(휴리스틱). 정밀 역지오코딩이 아니라 bounding-box 근사.
 * 위치 권한이 이미 허용된 경우에만 사용(비침습). 불명확하면 null.
 */
export function coarseSeoulRegion(lat: number, lng: number): string | null {
  // 서울 대략 범위 밖이면 '수도권 외' 처리.
  if (lat < 37.42 || lat > 37.7 || lng < 126.76 || lng > 127.18) {
    return '서울 외';
  }
  const ns = lat >= 37.55 ? '강북' : '강남';
  if (lng >= 126.94 && lng <= 127.02 && lat >= 37.55 && lat <= 37.59) {
    return '도심';
  }
  if (lng < 126.94) {
    return '서부';
  }
  if (lng > 127.05) {
    return '동부';
  }
  return ns;
}

/**
 * 위치 권한이 이미 허용된 경우에만 좌표를 얻어 대략 권역 반환(비침습 휴리스틱).
 * 권한 미허용/미지원/실패 시 null.
 */
export async function getHeuristicRegion(): Promise<string | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return null;
  }
  try {
    if (navigator.permissions) {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      if (status.state !== 'granted') {
        return null;
      }
    } else {
      return null;
    }
    return await new Promise<string | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve(coarseSeoulRegion(pos.coords.latitude, pos.coords.longitude)),
        () => resolve(null),
        { timeout: 3000, maximumAge: 600000 },
      );
    });
  } catch {
    return null;
  }
}

/**
 * 위치 권한을 적극 요청(브라우저 프롬프트 표시)해 대략 권역 반환.
 * 우회로 공유처럼 "위치 공유한 사람만" 허용하는 흐름에서 사용.
 */
export async function requestRegionInteractive(): Promise<string | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return null;
  }
  return new Promise<string | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve(coarseSeoulRegion(pos.coords.latitude, pos.coords.longitude)),
      () => resolve(null),
      { timeout: 7000, maximumAge: 600000 },
    );
  });
}
