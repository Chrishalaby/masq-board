import { HttpErrorResponse } from '@angular/common/http';

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POWER_BI_DOMAIN = 'powerbi.com';
const RENEW_BEFORE_EXPIRY_MS = 5 * 60_000;
const MIN_RENEWAL_DELAY_MS = 30_000;
const MAX_RENEWAL_DELAY_MS = 60 * 60_000;

export function isGuid(value: string): boolean {
  return GUID_PATTERN.test(value.trim());
}

export function buildEmbedUrl(reportId: string, groupId: string): string {
  return `https://app.${POWER_BI_DOMAIN}/reportEmbed?reportId=${encodeURIComponent(
    reportId.trim(),
  )}&groupId=${encodeURIComponent(groupId.trim())}`;
}

export function isPowerBiEmbedUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return false;
  }

  if (url.protocol !== 'https:' || url.username || url.password || url.port) {
    return false;
  }

  const host = url.hostname.toLowerCase();
  return host === POWER_BI_DOMAIN || host.endsWith(`.${POWER_BI_DOMAIN}`);
}

export function tokenRenewalDelayMs(expiresAt: string, now: number): number {
  const remaining = Date.parse(expiresAt) - now - RENEW_BEFORE_EXPIRY_MS;
  if (Number.isNaN(remaining)) return MIN_RENEWAL_DELAY_MS;
  return Math.min(Math.max(remaining, MIN_RENEWAL_DELAY_MS), MAX_RENEWAL_DELAY_MS);
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;
  if (error.status === 0) return 'Unable to connect to the server.';

  const body: unknown = error.error;
  const message =
    body && typeof body === 'object' ? (body as { message?: unknown }).message : undefined;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message) && message.length > 0) return message.join(', ');
  return fallback;
}
