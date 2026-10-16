import { describe, expect, it, vi } from 'vitest';
import { fetchTokens, iconUrlFor, normalizePrices, PRICES_URL } from './prices';

const row = (currency: string, price: unknown, date = '2023-08-29T07:10:40.000Z') => ({
  currency,
  date,
  price,
});

describe('normalizePrices', () => {
  it('keeps the most recent quote for duplicated tickers', () => {
    const tokens = normalizePrices([
      row('USDC', 1, '2023-08-29T07:10:30.000Z'),
      row('USDC', 0.9898, '2023-08-29T07:10:40.000Z'),
      row('USDC', 1, '2023-08-29T07:10:30.000Z'),
    ]);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.priceUsd).toBe(0.9898);
  });

  it('lets the later row win when timestamps tie', () => {
    const [token] = normalizePrices([row('BUSD', 0.9991), row('BUSD', 0.9998)]);
    expect(token?.priceUsd).toBe(0.9998);
  });

  it('drops rows without a usable price, and malformed rows', () => {
    const tokens = normalizePrices([
      row('ETH', 1645.93),
      row('ZERO', 0),
      row('NEG', -1),
      row('NAN', Number.NaN),
      row('STR', '12'),
      row('', 1),
      { currency: 'NODATE', price: 1 },
      row('BADDATE', 1, 'not-a-date'),
      null,
      'ETH',
    ]);
    expect(tokens.map((token) => token.symbol)).toEqual(['ETH']);
  });

  it('sorts tickers alphabetically, ignoring case', () => {
    const tokens = normalizePrices([
      row('USDC', 1),
      row('bNEO', 7),
      row('ATOM', 7),
      row('ampLUNA', 1),
    ]);
    expect(tokens.map((token) => token.symbol)).toEqual(['ampLUNA', 'ATOM', 'bNEO', 'USDC']);
  });

  it('rejects a payload that is not an array', () => {
    expect(() => normalizePrices({ data: [] })).toThrow(/expected an array/);
  });
});

describe('iconUrlFor', () => {
  it('maps tickers whose icon file uses different casing', () => {
    expect(iconUrlFor('STATOM')).toMatch(/\/stATOM\.svg$/);
    expect(iconUrlFor('ETH')).toMatch(/\/ETH\.svg$/);
  });
});

describe('fetchTokens', () => {
  it('fetches and normalises the feed', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json([row('ETH', 1645.93)]));
    vi.stubGlobal('fetch', fetchMock);

    const tokens = await fetchTokens(new AbortController().signal);

    expect(fetchMock).toHaveBeenCalledWith(PRICES_URL, expect.objectContaining({}));
    expect(tokens).toEqual([expect.objectContaining({ symbol: 'ETH', priceUsd: 1645.93 })]);
  });

  it('surfaces HTTP errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 503 })));
    await expect(fetchTokens(new AbortController().signal)).rejects.toThrow('HTTP 503');
  });
});
