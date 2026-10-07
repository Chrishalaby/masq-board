import {
  currentUtcOffsetMinutes,
  datePipeTimezone,
  formatDuration,
  monthRange,
  toDateOnly,
  utcOffsetLabel,
} from './attendance-format';

describe('formatDuration', () => {
  it('shows hours and zero-padded minutes', () => {
    expect(formatDuration(0)).toBe('0h 00m');
    expect(formatDuration(59)).toBe('0h 59m');
    expect(formatDuration(548)).toBe('9h 08m');
    expect(formatDuration(8450)).toBe('140h 50m');
  });

  it('is empty while there is no check-out', () => {
    expect(formatDuration(null)).toBe('');
  });
});

describe('utcOffsetLabel', () => {
  it('names the zone the way people read it', () => {
    expect(utcOffsetLabel(0)).toBe('GMT');
    expect(utcOffsetLabel(180)).toBe('GMT+3');
    expect(utcOffsetLabel(330)).toBe('GMT+5:30');
    expect(utcOffsetLabel(-300)).toBe('GMT-5');
  });
});

describe('datePipeTimezone', () => {
  it('produces the offset format Angular date formatting expects', () => {
    expect(datePipeTimezone(0)).toBe('+0000');
    expect(datePipeTimezone(180)).toBe('+0300');
    expect(datePipeTimezone(330)).toBe('+0530');
    expect(datePipeTimezone(-210)).toBe('-0330');
  });
});

describe('toDateOnly', () => {
  it('uses the local calendar date, not the UTC one', () => {
    expect(toDateOnly(new Date(2026, 9, 7, 0, 30))).toBe('2026-10-07');
    expect(toDateOnly(new Date(2026, 0, 1, 23, 59))).toBe('2026-01-01');
  });
});

describe('monthRange', () => {
  it('covers the whole month whatever day is passed', () => {
    expect(monthRange(new Date(2026, 9, 15))).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(monthRange(new Date(2026, 1, 1))).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(monthRange(new Date(2028, 1, 29))).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    expect(monthRange(new Date(2026, 11, 31))).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });
});

describe('currentUtcOffsetMinutes', () => {
  it('is positive east of UTC, the opposite sign of getTimezoneOffset', () => {
    const now = new Date(2026, 9, 7, 12, 0);
    expect(currentUtcOffsetMinutes(now)).toBe(-now.getTimezoneOffset());
  });
});
