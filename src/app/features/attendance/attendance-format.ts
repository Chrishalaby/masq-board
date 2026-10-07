export function formatDuration(minutes: number | null): string {
  if (minutes === null) return '';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${String(rest).padStart(2, '0')}m`;
}

export function utcOffsetLabel(utcOffsetMinutes: number): string {
  if (utcOffsetMinutes === 0) return 'GMT';
  const sign = utcOffsetMinutes > 0 ? '+' : '-';
  const absolute = Math.abs(utcOffsetMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return minutes === 0
    ? `GMT${sign}${hours}`
    : `GMT${sign}${hours}:${String(minutes).padStart(2, '0')}`;
}

export function datePipeTimezone(utcOffsetMinutes: number): string {
  const sign = utcOffsetMinutes < 0 ? '-' : '+';
  const absolute = Math.abs(utcOffsetMinutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, '0');
  const minutes = String(absolute % 60).padStart(2, '0');
  return `${sign}${hours}${minutes}`;
}

export function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function monthRange(month: Date): { from: string; to: string } {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  return { from: toDateOnly(first), to: toDateOnly(last) };
}

export function currentUtcOffsetMinutes(now: Date = new Date()): number {
  return -now.getTimezoneOffset();
}
