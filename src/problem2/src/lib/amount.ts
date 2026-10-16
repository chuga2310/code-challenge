/**
 * Amount fields hold canonical decimal strings ("12.5") rather than numbers, so
 * partial input ("0.", "1.50") is kept exactly as typed.
 */

/** Max fractional digits accepted in an amount field. Keeps long token decimals readable. */
export const MAX_DECIMALS = 8;

const DECIMAL_PATTERN = /^\d*\.?\d*$/;
/** en-US thousands grouping, as the app displays balances: "184,000", "1,250.5". */
const GROUPED_PATTERN = /^\d{1,3}(,\d{3})+(\.\d*)?$/;
const COMMA_DECIMAL_PATTERN = /^\d*,\d*$/;

/**
 * Resolves what a comma means. Grouped numbers ("184,000", e.g. pasted from the balance)
 * lose their commas. A single comma with no dot is a decimal separator for non-English
 * keyboards ("1,5", "0,500"). Anything else is left as-is and rejected by the caller.
 */
function normalizeSeparators(value: string): string {
  if (GROUPED_PATTERN.test(value) && !value.startsWith('0,')) return value.replaceAll(',', '');
  if (COMMA_DECIMAL_PATTERN.test(value)) return value.replace(',', '.');
  return value;
}

/**
 * Turns raw input into a canonical decimal string, or `null` when the edit should be
 * rejected (letters, a second separator, …). Extra fractional digits are truncated,
 * which also covers pasting.
 */
export function sanitizeAmountInput(raw: string, maxDecimals = MAX_DECIMALS): string | null {
  const value = normalizeSeparators(raw.trim());
  if (!DECIMAL_PATTERN.test(value)) return null;

  const [rawInteger = '', fraction] = value.split('.');
  const integer = rawInteger.replace(/^0+(?=\d)/, '') || (fraction === undefined ? '' : '0');
  return fraction === undefined ? integer : `${integer}.${fraction.slice(0, maxDecimals)}`;
}

/** Numeric value of a canonical amount string; empty or partial input counts as 0. */
export function parseAmount(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

type Rounding = 'down' | 'up';

const formatters = new Map<string, Intl.NumberFormat>();

function inputFormatter(rounding: Rounding, maxDecimals: number): Intl.NumberFormat {
  const key = `${rounding}:${maxDecimals}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      useGrouping: false,
      maximumFractionDigits: maxDecimals,
      roundingMode: rounding === 'down' ? 'trunc' : 'ceil',
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

/**
 * Formats a computed amount for display in an input. Never uses exponent notation
 * (unlike `String(1e-7)`), and rounds in the direction the caller asks for:
 * `down` for amounts the user receives, `up` for amounts the user must pay. That way
 * the UI never promises more than the rate gives.
 */
export function toAmountInput(value: number, rounding: Rounding, maxDecimals = MAX_DECIMALS) {
  if (!Number.isFinite(value) || value <= 0) return '';
  // Snap away float noise before rounding directionally. Otherwise 0.7 × 10 / 2000 =
  // 0.0034999999999999996 would truncate to 0.00349999 instead of reading 0.0035.
  const clean = Number(value.toPrecision(15));
  return inputFormatter(rounding, maxDecimals).format(clean);
}

/** Significant digits kept in a computed field: precise enough to trust, short enough to read. */
const DERIVED_SIGNIFICANT_DIGITS = 8;

/**
 * Like `toAmountInput`, but for a value computed from the rate. Shows about 8 significant
 * digits ("2057.6676" rather than "2057.66766987"). Never more than MAX_DECIMALS.
 */
export function toDerivedAmount(value: number, rounding: Rounding): string {
  const integerDigits = value >= 1 ? Math.floor(Math.log10(value)) + 1 : 0;
  const decimals = Math.max(0, DERIVED_SIGNIFICANT_DIGITS - integerDigits);
  return toAmountInput(value, rounding, Math.min(MAX_DECIMALS, decimals));
}
