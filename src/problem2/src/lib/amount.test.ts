import { describe, expect, it } from 'vitest';
import { parseAmount, sanitizeAmountInput, toAmountInput, toDerivedAmount } from './amount';

describe('sanitizeAmountInput', () => {
  it.each([
    ['', ''],
    ['12', '12'],
    ['12.5', '12.5'],
    ['0.', '0.'],
    ['.', '0.'],
    ['.5', '0.5'],
    ['007', '7'],
    ['00.5', '0.5'],
    ['0', '0'],
    [' 3.2 ', '3.2'],
    // Comma as decimal separator (non-English keyboards)…
    ['1,5', '1.5'],
    ['12,34', '12.34'],
    ['0,500', '0.500'],
    // …and as en-US grouping, e.g. a balance pasted from the UI.
    ['184,000', '184000'],
    ['1,250.5', '1250.5'],
    ['1,000,000', '1000000'],
  ])('accepts %j as %j', (raw, expected) => {
    expect(sanitizeAmountInput(raw)).toBe(expected);
  });

  it.each(['abc', '1.2.3', '-1', '1e5', '1.000,5', '1,2,3', '$5', '1 000'])('rejects %j', (raw) => {
    expect(sanitizeAmountInput(raw)).toBeNull();
  });

  it('truncates fractional digits past the limit (typing or pasting)', () => {
    expect(sanitizeAmountInput('1.123456789')).toBe('1.12345678');
    expect(sanitizeAmountInput('1.239', 2)).toBe('1.23');
  });
});

describe('parseAmount', () => {
  it('treats empty and partial input as zero', () => {
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('0.')).toBe(0);
    expect(parseAmount('2.50')).toBe(2.5);
  });
});

describe('toAmountInput', () => {
  it('never uses exponent notation', () => {
    expect(toAmountInput(1e-7, 'down')).toBe('0.0000001');
    expect(toAmountInput(1e21, 'down')).toBe('1000000000000000000000');
  });

  it('rounds toward the user-safe direction', () => {
    expect(toAmountInput(1.123456789, 'down')).toBe('1.12345678');
    expect(toAmountInput(1.123456781, 'up')).toBe('1.12345679');
  });

  it('returns an empty field for zero, negative or non-finite values', () => {
    expect(toAmountInput(0, 'down')).toBe('');
    expect(toAmountInput(-1, 'down')).toBe('');
    expect(toAmountInput(Number.NaN, 'down')).toBe('');
    expect(toAmountInput(Number.POSITIVE_INFINITY, 'up')).toBe('');
  });
});

describe('toDerivedAmount', () => {
  it('keeps about 8 significant digits', () => {
    expect(toDerivedAmount(2057.66766987, 'down')).toBe('2057.6676');
    expect(toDerivedAmount(184_000.123, 'down')).toBe('184000.12');
    expect(toDerivedAmount(123_456_789.9, 'down')).toBe('123456789');
  });

  it('is capped at 8 decimals for small values', () => {
    expect(toDerivedAmount(0.000607491234, 'down')).toBe('0.00060749');
    expect(toDerivedAmount(0.000607491234, 'up')).toBe('0.0006075');
  });

  it('ignores float noise before rounding directionally', () => {
    expect(toDerivedAmount((0.7 * 10) / 2000, 'down')).toBe('0.0035'); // raw: 0.0034999999999999996
    expect(toDerivedAmount((0.07 * 10) / 2000, 'up')).toBe('0.00035'); // raw: 0.00035000000000000005
  });

  it('can round a dust amount down to zero, which validation then flags', () => {
    expect(toDerivedAmount(1e-12, 'down')).toBe('0');
  });
});
