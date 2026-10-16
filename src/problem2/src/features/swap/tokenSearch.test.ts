import { describe, expect, it } from 'vitest';
import { token } from '../../test/fixtures';
import { rankTokens, searchTokens } from './tokenSearch';

const tokens = [
  token('ATOM', 10),
  token('ETH', 2000),
  token('stATOM', 11),
  token('SWTH', 0.5),
  token('wstETH', 2100),
];
const symbols = (list: { symbol: string }[]) => list.map((t) => t.symbol);

describe('rankTokens', () => {
  it('puts held tokens first by USD value and keeps the rest in order', () => {
    const ranked = rankTokens(tokens, { SWTH: 10_000, ETH: 1, ATOM: 0 });
    // SWTH $5,000 > ETH $2,000; the others keep their order.
    expect(symbols(ranked)).toEqual(['SWTH', 'ETH', 'ATOM', 'stATOM', 'wstETH']);
  });
});

describe('searchTokens', () => {
  it('returns everything for an empty query', () => {
    expect(searchTokens(tokens, '  ')).toHaveLength(tokens.length);
  });

  it('ranks exact, then prefix, then substring matches, ignoring case', () => {
    expect(symbols(searchTokens(tokens, 'atom'))).toEqual(['ATOM', 'stATOM']);
    expect(symbols(searchTokens(tokens, 'eth'))).toEqual(['ETH', 'wstETH']);
    expect(symbols(searchTokens(tokens, 'S'))).toEqual(['stATOM', 'SWTH', 'wstETH']);
  });

  it('returns nothing when no ticker matches', () => {
    expect(searchTokens(tokens, 'doge')).toEqual([]);
  });
});
