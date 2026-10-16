/*
 * Display formatters. Token quantities and sub-dollar prices truncate rather than round
 * to nearest, so a balance, a minimum received or a receipt never reads higher than the
 * real value. (A balance of 2.41839 shows as 2.4183, not 2.4184.)
 */

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const usdSmall = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumSignificantDigits: 4,
  roundingMode: 'trunc',
});
const amountLarge = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 4,
  roundingMode: 'trunc',
});
const amountSmall = new Intl.NumberFormat('en-US', {
  maximumSignificantDigits: 4,
  roundingMode: 'trunc',
});
const timestamp = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

/** Fiat value of a position, e.g. "$3,980.12". Tiny non-zero values read "< $0.01", not "$0.00". */
export function formatUsd(value: number): string {
  if (value > 0 && value < 0.01) return '< $0.01';
  return usd.format(value);
}

/** Unit price. Sub-dollar tokens keep 4 significant digits ("$0.004039") so they don't all read "$0.00". */
export function formatUnitPrice(value: number): string {
  return value < 1 ? usdSmall.format(value) : usd.format(value);
}

/** Human-readable token quantity, truncated: "1,645.9337", "0.0006074". */
export function formatTokenAmount(value: number): string {
  // Same float-noise snap as amount inputs, so 0.0035 doesn't truncate to 0.003499.
  const clean = Number(value.toPrecision(15));
  return Math.abs(clean) >= 1 ? amountLarge.format(clean) : amountSmall.format(clean);
}

export function formatTimestampUtc(iso: string): string {
  return `${timestamp.format(new Date(iso))} UTC`;
}
