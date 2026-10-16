/**
 * Pure data logic for the wallet page, kept out of the component so it can be
 * unit-tested and so the component only renders.
 */

export interface WalletBalance {
  currency: string;
  amount: number;
  /** Was missing from the original interface, though the code read it. */
  blockchain: string;
}

export interface FormattedWalletBalance extends WalletBalance {
  formatted: string;
}

/** USD price per currency. A currency can be missing while prices are still loading. */
export type Prices = Readonly<Partial<Record<string, number>>>;

/**
 * Display priority per supported chain (higher shows first). A lookup table instead of
 * the `switch`, so adding a chain is one line. It's a `Map` rather than a plain object
 * so that a key like "constructor" can't resolve to a prototype member.
 */
const BLOCKCHAIN_PRIORITY: ReadonlyMap<string, number> = new Map([
  ['Osmosis', 100],
  ['Ethereum', 50],
  ['Arbitrum', 30],
  ['Zilliqa', 20],
  ['Neo', 20],
]);

/** Priority of a supported chain, or `undefined` for one we don't show (was the magic -99). */
export function getPriority(blockchain: string): number | undefined {
  return BLOCKCHAIN_PRIORITY.get(blockchain);
}

// Truncate (never overstate a balance) and keep significant digits below 1, so that
// 0.0000004 doesn't collapse to "0" and 0.9999996 doesn't round up to "1".
const largeAmount = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 6,
  roundingMode: 'trunc',
});
const smallAmount = new Intl.NumberFormat('en-US', {
  maximumSignificantDigits: 6,
  roundingMode: 'trunc',
});

export function formatAmount(amount: number): string {
  return amount >= 1 ? largeAmount.format(amount) : smallAmount.format(amount);
}

/**
 * Balances to display: non-empty, on a supported chain, highest-priority chain first,
 * each formatted once.
 *
 * Priority is looked up once per balance and carried through the sort, so the comparator
 * is a plain subtraction. `Array#sort` is stable, so balances on chains with the same
 * priority keep their incoming order.
 */
export function selectDisplayBalances(
  balances: readonly WalletBalance[],
): FormattedWalletBalance[] {
  return balances
    .flatMap((balance) => {
      const priority = getPriority(balance.blockchain);
      return priority !== undefined && balance.amount > 0 ? [{ balance, priority }] : [];
    })
    .sort((a, b) => b.priority - a.priority)
    .map(({ balance }) => ({ ...balance, formatted: formatAmount(balance.amount) }));
}

/**
 * USD value of a balance, or `undefined` while its price is unknown. The original
 * produced NaN here; `?? 0` would be no better, because it shows "$0.00" as if it were fact.
 */
export function usdValueOf(balance: WalletBalance, prices: Prices): number | undefined {
  const price = prices[balance.currency];
  return price === undefined ? undefined : price * balance.amount;
}

/** Stable React key. A currency can exist on several chains, so the chain is part of it. */
export function balanceKey(balance: WalletBalance): string {
  return `${balance.blockchain}:${balance.currency}`;
}
