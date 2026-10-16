export const PRICES_URL = 'https://interview.switcheo.com/prices.json';

const ICON_BASE_URL = 'https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens';

/**
 * Tickers where the price feed and the icon repo disagree on casing
 * (the feed says `STATOM`, the icon is `stATOM.svg`). Found by checking every feed
 * ticker against the repo. Anything missing still falls back to a monogram at runtime.
 */
const ICON_FILE_OVERRIDES: Readonly<Record<string, string>> = {
  RATOM: 'rATOM',
  STATOM: 'stATOM',
  STEVMOS: 'stEVMOS',
  STLUNA: 'stLUNA',
  STOSMO: 'stOSMO',
};

export interface Token {
  symbol: string;
  priceUsd: number;
  /** ISO timestamp of the price quote. */
  priceUpdatedAt: string;
  iconUrl: string;
}

interface PriceEntry {
  currency: string;
  date: string;
  price: number;
}

function isPriceEntry(value: unknown): value is PriceEntry {
  if (typeof value !== 'object' || value === null) return false;
  const { currency, date, price } = value as Record<string, unknown>;
  return (
    typeof currency === 'string' &&
    currency.length > 0 &&
    typeof date === 'string' &&
    !Number.isNaN(Date.parse(date)) &&
    typeof price === 'number' &&
    Number.isFinite(price) &&
    price > 0
  );
}

export function iconUrlFor(symbol: string): string {
  return `${ICON_BASE_URL}/${encodeURIComponent(ICON_FILE_OVERRIDES[symbol] ?? symbol)}.svg`;
}

/**
 * Turns the raw feed into one priced token per ticker.
 *
 * - The feed has duplicate tickers (USDC ×4, BUSD ×2). The most recent quote wins.
 *   On a timestamp tie, the later row wins.
 * - Rows without a usable price are dropped, as the task allows ("those that do not can be omitted").
 * - The payload is treated as untrusted: anything malformed is skipped, not trusted.
 */
export function normalizePrices(payload: unknown): Token[] {
  if (!Array.isArray(payload)) {
    throw new TypeError('Unexpected price feed format: expected an array.');
  }

  const latest = new Map<string, PriceEntry>();
  for (const entry of payload) {
    if (!isPriceEntry(entry)) continue;
    const current = latest.get(entry.currency);
    if (!current || Date.parse(entry.date) >= Date.parse(current.date)) {
      latest.set(entry.currency, entry);
    }
  }

  return Array.from(latest.values(), ({ currency, date, price }) => ({
    symbol: currency,
    priceUsd: price,
    priceUpdatedAt: date,
    iconUrl: iconUrlFor(currency),
  })).sort((a, b) => a.symbol.localeCompare(b.symbol, 'en', { sensitivity: 'base' }));
}

export async function fetchTokens(signal: AbortSignal): Promise<Token[]> {
  const response = await fetch(PRICES_URL, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Price feed responded with HTTP ${response.status}.`);
  }
  return normalizePrices(await response.json());
}
