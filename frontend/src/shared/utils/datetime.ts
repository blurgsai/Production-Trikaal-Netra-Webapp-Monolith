export function parseEventDate(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  if (typeof val !== 'string') return null;
  // Treat bare datetime strings (no timezone suffix) as UTC
  const utcString = /Z$|[+-]\d{2}:\d{2}$/.test(val) ? val : val + 'Z';
  const ms = new Date(utcString).getTime();
  return isNaN(ms) ? null : ms;
}

export function formatEventDate(val: string | number | null | undefined): string {
  const ms = parseEventDate(val);
  if (ms === null) return '—';
  return new Date(ms).toLocaleString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
}

export function formatEventDateShort(val: string | number | null | undefined): string {
  const ms = parseEventDate(val);
  if (ms === null) return '—';
  return new Date(ms).toLocaleString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}
