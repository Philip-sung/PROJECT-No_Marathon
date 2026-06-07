/**
 * 구조적 로깅(관측성 L1). JSON 한 줄 = 수집/검색 용이(stdout→ELK/CloudWatch).
 */
type Level = 'info' | 'warn' | 'error';

function emit(level: Level, event: string, fields: Record<string, unknown>) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  });
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (event: string, fields: Record<string, unknown> = {}) =>
    emit('info', event, fields),
  warn: (event: string, fields: Record<string, unknown> = {}) =>
    emit('warn', event, fields),
  error: (event: string, fields: Record<string, unknown> = {}) =>
    emit('error', event, fields),
};
