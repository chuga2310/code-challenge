import type { Prices, WalletBalance } from '../walletBalances';

// Stand-ins for the app's data hooks (see Box.tsx). A real implementation would return
// referentially stable data, e.g. from a query cache, so `useMemo` deps behave.

const DEMO_BALANCES: readonly WalletBalance[] = [
  { currency: 'ETH', amount: 1.25, blockchain: 'Ethereum' },
  { currency: 'OSMO', amount: 320, blockchain: 'Osmosis' },
  { currency: 'ZIL', amount: 0, blockchain: 'Zilliqa' },
];

const DEMO_PRICES: Prices = { ETH: 1645.93, OSMO: 0.38 };

export function useWalletBalances(): readonly WalletBalance[] {
  return DEMO_BALANCES;
}

export function usePrices(): Prices {
  return DEMO_PRICES;
}
