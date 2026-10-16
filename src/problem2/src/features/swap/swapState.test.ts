import { describe, expect, it } from 'vitest';
import { TOKENS, token } from '../../test/fixtures';
import {
  createInitialState,
  deriveQuote,
  minimumReceived,
  swapReducer,
  validateSwap,
  type SwapState,
} from './swapState';
import { applyReceipt } from './wallet';

const prices = new Map(TOKENS.map((t) => [t.symbol, t.priceUsd]));
const priceOf = (symbol: string) => prices.get(symbol);

const state = (overrides: Partial<SwapState> = {}): SwapState => ({
  fromSymbol: 'ETH',
  toSymbol: 'USDC',
  exactSide: 'from',
  exactAmount: '',
  ...overrides,
});

describe('createInitialState', () => {
  it('defaults to ETH → USDC when available', () => {
    expect(createInitialState(TOKENS)).toMatchObject({ fromSymbol: 'ETH', toSymbol: 'USDC' });
  });

  it('falls back to the first two tokens, or nothing', () => {
    expect(createInitialState([token('A', 1), token('B', 2)])).toMatchObject({
      fromSymbol: 'A',
      toSymbol: 'B',
    });
    expect(createInitialState([])).toMatchObject({ fromSymbol: null, toSymbol: null });
  });

  it('never pairs a token with itself', () => {
    expect(createInitialState([token('ATOM', 1), token('ETH', 2)])).toMatchObject({
      fromSymbol: 'ETH',
      toSymbol: 'ATOM',
    });
    expect(createInitialState([token('ETH', 2)])).toMatchObject({
      fromSymbol: 'ETH',
      toSymbol: null,
    });
  });
});

describe('swapReducer', () => {
  it('records which side the user typed in', () => {
    const next = swapReducer(state(), { type: 'amountChanged', side: 'to', amount: '50' });
    expect(next).toMatchObject({ exactSide: 'to', exactAmount: '50' });
  });

  it('flips tokens and keeps the typed amount attached to its token', () => {
    const next = swapReducer(state({ exactAmount: '1' }), { type: 'flipped' });
    expect(next).toEqual(
      state({ fromSymbol: 'USDC', toSymbol: 'ETH', exactSide: 'to', exactAmount: '1' }),
    );
  });

  it('swaps sides when the token picked is already on the other side', () => {
    const next = swapReducer(state(), { type: 'tokenSelected', side: 'from', symbol: 'USDC' });
    expect(next).toMatchObject({ fromSymbol: 'USDC', toSymbol: 'ETH' });
  });

  it('replaces the token on the chosen side', () => {
    const next = swapReducer(state(), { type: 'tokenSelected', side: 'to', symbol: 'SWTH' });
    expect(next).toMatchObject({ fromSymbol: 'ETH', toSymbol: 'SWTH' });
  });

  it('returns the same object when re-selecting the current token', () => {
    const current = state();
    expect(swapReducer(current, { type: 'tokenSelected', side: 'from', symbol: 'ETH' })).toBe(
      current,
    );
  });

  it('clears the amount but keeps the pair', () => {
    const next = swapReducer(state({ exactAmount: '3' }), { type: 'amountCleared' });
    expect(next).toEqual(state({ exactAmount: '' }));
  });
});

describe('deriveQuote', () => {
  it('derives the receive amount from the pay amount', () => {
    expect(deriveQuote(state({ exactAmount: '1.5' }), priceOf)).toEqual({
      fromAmount: '1.5',
      toAmount: '3000',
      rate: 2000,
    });
  });

  it('derives the pay amount from the receive amount', () => {
    const quote = deriveQuote(state({ exactSide: 'to', exactAmount: '1000' }), priceOf);
    expect(quote).toMatchObject({ fromAmount: '0.5', toAmount: '1000' });
  });

  it('rounds the receive side down and the pay side up', () => {
    // 1 USDC → ETH at 1/2000 is exact; use prices that produce repeating decimals.
    const odd = (symbol: string) => ({ A: 3, B: 7 })[symbol];
    const receive = deriveQuote(
      state({ fromSymbol: 'A', toSymbol: 'B', exactAmount: '1' }),
      odd,
    ).toAmount;
    const pay = deriveQuote(
      state({ fromSymbol: 'A', toSymbol: 'B', exactSide: 'to', exactAmount: '1' }),
      odd,
    ).fromAmount;
    expect(receive).toBe('0.42857142'); // 3/7 = 0.428571428…
    expect(pay).toBe('2.3333334'); // 7/3 = 2.333333…
  });

  it('has no rate until both tokens are priced', () => {
    expect(deriveQuote(state({ toSymbol: null, exactAmount: '1' }), priceOf)).toEqual({
      fromAmount: '1',
      toAmount: '',
      rate: null,
    });
  });
});

describe('validateSwap', () => {
  const balances = { ETH: 2, USDC: 100 };
  const check = (s: SwapState) => validateSwap(s, deriveQuote(s, priceOf), balances);

  it('asks for a token first', () => {
    expect(check(state({ fromSymbol: null, exactAmount: '1' }))).toEqual({ kind: 'selectToken' });
  });

  it('asks for an amount', () => {
    expect(check(state())).toEqual({ kind: 'enterAmount' });
    expect(check(state({ exactAmount: '0.' }))).toEqual({ kind: 'enterAmount' });
  });

  it('flags amounts that convert to zero', () => {
    const dust = state({ fromSymbol: 'SWTH', toSymbol: 'ETH', exactAmount: '0.00000001' });
    expect(check(dust)).toEqual({ kind: 'amountTooSmall', side: 'from' });
  });

  it('flags insufficient balance, including when the user typed the receive side', () => {
    expect(check(state({ exactAmount: '2.5' }))).toEqual({
      kind: 'insufficientBalance',
      symbol: 'ETH',
      balance: 2,
    });
    expect(check(state({ exactSide: 'to', exactAmount: '4001' }))).toMatchObject({
      kind: 'insufficientBalance',
    });
  });

  it('accepts spending the exact balance', () => {
    expect(check(state({ exactAmount: '2' }))).toBeNull();
  });

  it('accepts the exact balance when the pay side is derived (no float-noise round-up)', () => {
    // 0.07 ATOM at $10 = $0.70 = 0.00035 ETH; raw float is 0.00035000000000000005.
    const derived = state({ toSymbol: 'ATOM', exactSide: 'to', exactAmount: '0.07' });
    expect(validateSwap(derived, deriveQuote(derived, priceOf), { ETH: 0.00035 })).toBeNull();
  });
});

describe('minimumReceived', () => {
  it('applies the 0.5% slippage tolerance', () => {
    expect(minimumReceived('1000')).toBeCloseTo(995);
    expect(minimumReceived('')).toBe(0);
  });
});

describe('applyReceipt', () => {
  it('moves funds between balances without float drift', () => {
    const next = applyReceipt(
      { ETH: 0.3, USDC: 0.1 },
      {
        id: 'x',
        executedAt: '',
        fromSymbol: 'ETH',
        toSymbol: 'USDC',
        amountIn: 0.1,
        amountOut: 0.2,
        minAmountOut: 0.199,
      },
    );
    expect(next).toEqual({ ETH: 0.2, USDC: 0.3 });
  });
});
