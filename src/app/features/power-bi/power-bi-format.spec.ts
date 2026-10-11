import { HttpErrorResponse } from '@angular/common/http';
import {
  apiErrorMessage,
  buildEmbedUrl,
  isGuid,
  isPowerBiEmbedUrl,
  tokenRenewalDelayMs,
} from './power-bi-format';

const REPORT_ID = '7c3d7a0e-0f3b-4a63-9d55-1f0c2f1a8b11';
const GROUP_ID = '0b9a2d4c-51c7-4e0e-8a63-2f8d4c6b7a90';
const MINUTE = 60_000;

describe('isGuid', () => {
  it('accepts Power BI ids, ignoring surrounding spaces and letter case', () => {
    expect(isGuid(REPORT_ID)).toBe(true);
    expect(isGuid(`  ${REPORT_ID.toUpperCase()}  `)).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isGuid('')).toBe(false);
    expect(isGuid('7c3d7a0e')).toBe(false);
    expect(isGuid(`${REPORT_ID}/x`)).toBe(false);
    expect(isGuid(REPORT_ID.replace(/-/g, ''))).toBe(false);
  });
});

describe('buildEmbedUrl', () => {
  it('builds the address from the report id and group id', () => {
    expect(buildEmbedUrl(REPORT_ID, GROUP_ID)).toBe(
      `https://app.powerbi.com/reportEmbed?reportId=${REPORT_ID}&groupId=${GROUP_ID}`,
    );
  });

  it('ignores spaces pasted around the ids', () => {
    expect(buildEmbedUrl(` ${REPORT_ID}\n`, `\t${GROUP_ID} `)).toBe(
      `https://app.powerbi.com/reportEmbed?reportId=${REPORT_ID}&groupId=${GROUP_ID}`,
    );
  });

  it('produces an address that passes the embed address check', () => {
    expect(isPowerBiEmbedUrl(buildEmbedUrl(REPORT_ID, GROUP_ID))).toBe(true);
  });
});

describe('isPowerBiEmbedUrl', () => {
  it('accepts https addresses on powerbi.com', () => {
    expect(isPowerBiEmbedUrl('https://app.powerbi.com/reportEmbed?reportId=1&groupId=2')).toBe(
      true,
    );
    expect(isPowerBiEmbedUrl('  https://app.powerbi.com/reportEmbed?reportId=1  ')).toBe(true);
  });

  it('rejects other sites, look-alike hosts and plain http', () => {
    expect(isPowerBiEmbedUrl('https://example.com/reportEmbed')).toBe(false);
    expect(isPowerBiEmbedUrl('https://app.powerbi.com.example.com/reportEmbed')).toBe(false);
    expect(isPowerBiEmbedUrl('https://app.powerbi.com@example.com/reportEmbed')).toBe(false);
    expect(isPowerBiEmbedUrl('http://app.powerbi.com/reportEmbed')).toBe(false);
    expect(isPowerBiEmbedUrl('reportEmbed?reportId=1')).toBe(false);
    expect(isPowerBiEmbedUrl('')).toBe(false);
  });
});

describe('tokenRenewalDelayMs', () => {
  const now = Date.parse('2026-10-11T09:00:00Z');

  it('renews five minutes before the token expires', () => {
    expect(tokenRenewalDelayMs('2026-10-11T09:45:00Z', now)).toBe(40 * MINUTE);
  });

  it('waits at least thirty seconds, even for a token that is about to expire', () => {
    expect(tokenRenewalDelayMs('2026-10-11T09:04:00Z', now)).toBe(30_000);
    expect(tokenRenewalDelayMs('2026-10-11T08:00:00Z', now)).toBe(30_000);
    expect(tokenRenewalDelayMs('not a date', now)).toBe(30_000);
  });

  it('checks back within an hour for long-lived tokens', () => {
    expect(tokenRenewalDelayMs('2026-10-12T09:00:00Z', now)).toBe(60 * MINUTE);
  });
});

describe('apiErrorMessage', () => {
  it('uses the message the server sent', () => {
    const error = new HttpErrorResponse({
      status: 502,
      error: { statusCode: 502, message: 'Power BI could not start the refresh.' },
    });
    expect(apiErrorMessage(error, 'fallback')).toBe('Power BI could not start the refresh.');
  });

  it('joins validation messages', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { message: ['title should not be empty', 'reportId must be an ID'] },
    });
    expect(apiErrorMessage(error, 'fallback')).toBe(
      'title should not be empty, reportId must be an ID',
    );
  });

  it('explains a lost connection', () => {
    expect(apiErrorMessage(new HttpErrorResponse({ status: 0 }), 'fallback')).toBe(
      'Unable to connect to the server.',
    );
  });

  it('falls back when the server sent no usable message', () => {
    expect(
      apiErrorMessage(new HttpErrorResponse({ status: 502, error: '<html></html>' }), 'fallback'),
    ).toBe('fallback');
    expect(apiErrorMessage(new Error('boom'), 'fallback')).toBe('fallback');
  });
});
