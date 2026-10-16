import { describe, expect, it } from 'vitest';
import {
  balanceKey,
  formatAmount,
  getPriority,
  selectDisplayBalances,
  usdValueOf,
  type WalletBalance,
} from './walletBalances';

const balance = (currency: string, amount: number, blockchain: string): WalletBalance => ({
  currency,
  amount,
  blockchain,
});

describe('getPriority', () => {
  it('ranks supported chains and returns undefined for the rest', () => {
    expect(getPriority('Osmosis')).toBe(100);
    expect(getPriority('Neo')).toBe(20);
    expect(getPriority('Solana')).toBeUndefined();
  });

  it('is not fooled by Object.prototype keys', () => {
    expect(getPriority('constructor')).toBeUndefined();
    expect(getPriority('toString')).toBeUndefined();
  });
});

describe('selectDisplayBalances', () => {
  it('keeps only positive balances on supported chains (the original kept amount <= 0)', () => {
    const result = selectDisplayBalances([
      balance('ETH', 1, 'Ethereum'),
      balance('ZIL', 0, 'Zilliqa'),
      balance('ARB', -3, 'Arbitrum'),
      balance('SOL', 5, 'Solana'),
    ]);
    expect(result.map((b) => b.currency)).toEqual(['ETH']);
  });

  it('sorts by chain priority, highest first, keeping order within a tie', () => {
    const result = selectDisplayBalances([
      balance('NEO', 1, 'Neo'),
      balance('ETH', 1, 'Ethereum'),
      balance('ZIL', 1, 'Zilliqa'),
      balance('OSMO', 1, 'Osmosis'),
      balance('ARB', 1, 'Arbitrum'),
    ]);
    expect(result.map((b) => b.currency)).toEqual(['OSMO', 'ETH', 'ARB', 'NEO', 'ZIL']);
  });

  it('formats amounts without dropping decimals (toFixed() rounded to an integer)', () => {
    const [eth] = selectDisplayBalances([balance('ETH', 1234.5678912, 'Ethereum')]);
    expect(eth?.formatted).toBe('1,234.567891');
  });

  it('does not mutate its input', () => {
    const input = Object.freeze([balance('A', 1, 'Neo'), balance('B', 1, 'Osmosis')]);
    expect(() => selectDisplayBalances(input)).not.toThrow();
    expect(input.map((b) => b.currency)).toEqual(['A', 'B']);
  });
});

describe('formatAmount', () => {
  it('truncates and keeps small amounts visible', () => {
    expect(formatAmount(0.0000004)).toBe('0.0000004');
    expect(formatAmount(0.9999996)).toBe('0.999999');
    expect(formatAmount(2.0000009)).toBe('2');
  });
});

describe('usdValueOf', () => {
  it('multiplies by price, and is undefined (not NaN or a fake $0) when unpriced', () => {
    expect(usdValueOf(balance('ETH', 2, 'Ethereum'), { ETH: 1500 })).toBe(3000);
    expect(usdValueOf(balance('XYZ', 2, 'Ethereum'), {})).toBeUndefined();
  });
});

describe('balanceKey', () => {
  it('distinguishes the same currency on different chains', () => {
    expect(balanceKey(balance('USDC', 1, 'Ethereum'))).not.toBe(
      balanceKey(balance('USDC', 1, 'Osmosis')),
    );
  });
});
