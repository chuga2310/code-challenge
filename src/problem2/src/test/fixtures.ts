import type { Token } from '../api/prices';

export const token = (symbol: string, priceUsd: number): Token => ({
  symbol,
  priceUsd,
  priceUpdatedAt: '2023-08-29T07:10:40.000Z',
  iconUrl: `https://icons.test/${symbol}.svg`,
});

/** Round numbers so expected amounts are easy to read: 1 ETH = 2000 USDC = 4000 SWTH. */
export const TOKENS: Token[] = [
  token('ATOM', 10),
  token('ETH', 2000),
  token('SWTH', 0.5),
  token('USDC', 1),
];

export const PRICE_FEED = TOKENS.map(({ symbol, priceUsd, priceUpdatedAt }) => ({
  currency: symbol,
  price: priceUsd,
  date: priceUpdatedAt,
}));
