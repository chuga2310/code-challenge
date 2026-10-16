import type { SwapReceipt } from '../../api/swap';
import { MAX_DECIMALS } from '../../lib/amount';

export type Balances = Readonly<Record<string, number>>;

/** Demo wallet. A real app would read these from the connected wallet or an indexer. */
export const DEMO_BALANCES: Balances = {
  ETH: 2.4183,
  USDC: 1250.5,
  SWTH: 184_000,
  ATOM: 36.2,
  OSMO: 410,
  WBTC: 0.0312,
  ZIL: 9800,
};

const PRECISION = 10 ** MAX_DECIMALS;
const round = (value: number) => Math.round(value * PRECISION) / PRECISION;

/** Balances after a settled swap. Rounded to field precision so float drift (0.1 + 0.2) never shows up. */
export function applyReceipt(balances: Balances, receipt: SwapReceipt): Balances {
  const { fromSymbol, toSymbol, amountIn, amountOut } = receipt;
  return {
    ...balances,
    [fromSymbol]: Math.max(0, round((balances[fromSymbol] ?? 0) - amountIn)),
    [toSymbol]: round((balances[toSymbol] ?? 0) + amountOut),
  };
}
