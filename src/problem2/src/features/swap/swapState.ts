import type { Token } from '../../api/prices';
import { parseAmount, toDerivedAmount } from '../../lib/amount';
import type { Balances } from './wallet';

export type Side = 'from' | 'to';

/** Accepted price drift between quote and execution, used for "minimum received". */
export const SLIPPAGE_TOLERANCE = 0.005;

/**
 * Minimal form state. Only the field the user last typed in is stored (`exactSide`).
 * The other field is always derived from the rate, so the two can never disagree.
 */
export interface SwapState {
  fromSymbol: string | null;
  toSymbol: string | null;
  exactSide: Side;
  exactAmount: string;
}

export type SwapAction =
  | { type: 'amountChanged'; side: Side; amount: string }
  | { type: 'tokenSelected'; side: Side; symbol: string }
  | { type: 'flipped' }
  | { type: 'amountCleared' };

const opposite = (side: Side): Side => (side === 'from' ? 'to' : 'from');

/** Pre-selects a sensible default pair (ETH → USDC when available), never X → X. */
export function createInitialState(tokens: readonly Token[]): SwapState {
  const pick = (preferred: string, exclude: string | null) =>
    tokens.find((token) => token.symbol === preferred && token.symbol !== exclude)?.symbol ??
    tokens.find((token) => token.symbol !== exclude)?.symbol ??
    null;
  const fromSymbol = pick('ETH', null);
  return {
    fromSymbol,
    toSymbol: fromSymbol === null ? null : pick('USDC', fromSymbol),
    exactSide: 'from',
    exactAmount: '',
  };
}

function flip(state: SwapState): SwapState {
  // The typed amount stays with its token: "pay 1 ETH" becomes "receive 1 ETH".
  return {
    ...state,
    fromSymbol: state.toSymbol,
    toSymbol: state.fromSymbol,
    exactSide: opposite(state.exactSide),
  };
}

export function swapReducer(state: SwapState, action: SwapAction): SwapState {
  switch (action.type) {
    case 'amountChanged':
      return { ...state, exactSide: action.side, exactAmount: action.amount };
    case 'tokenSelected': {
      const current = action.side === 'from' ? state.fromSymbol : state.toSymbol;
      const other = action.side === 'from' ? state.toSymbol : state.fromSymbol;
      if (action.symbol === current) return state;
      // Picking the token already on the other side swaps the pair instead of making X → X.
      if (action.symbol === other) return flip(state);
      return action.side === 'from'
        ? { ...state, fromSymbol: action.symbol }
        : { ...state, toSymbol: action.symbol };
    }
    case 'flipped':
      return flip(state);
    case 'amountCleared':
      return { ...state, exactAmount: '' };
  }
}

export interface Quote {
  /** Field values, as shown in the inputs. */
  fromAmount: string;
  toAmount: string;
  /** Units of the `to` token per one `from` token, or null until both sides are priced. */
  rate: number | null;
}

export type PriceLookup = (symbol: string) => number | undefined;

export function deriveQuote(state: SwapState, priceOf: PriceLookup): Quote {
  const fromPrice = state.fromSymbol === null ? undefined : priceOf(state.fromSymbol);
  const toPrice = state.toSymbol === null ? undefined : priceOf(state.toSymbol);
  const rate = fromPrice && toPrice ? fromPrice / toPrice : null;
  const exact = parseAmount(state.exactAmount);

  if (state.exactSide === 'from') {
    return {
      fromAmount: state.exactAmount,
      toAmount: rate === null ? '' : toDerivedAmount(exact * rate, 'down'),
      rate,
    };
  }
  return {
    fromAmount: rate === null ? '' : toDerivedAmount(exact / rate, 'up'),
    toAmount: state.exactAmount,
    rate,
  };
}

export type SwapIssue =
  | { kind: 'selectToken' }
  | { kind: 'enterAmount' }
  | { kind: 'amountTooSmall'; side: Side }
  | { kind: 'insufficientBalance'; symbol: string; balance: number };

/** First thing stopping the swap from going ahead, or null when it can be submitted. */
export function validateSwap(state: SwapState, quote: Quote, balances: Balances): SwapIssue | null {
  if (state.fromSymbol === null || state.toSymbol === null || quote.rate === null) {
    return { kind: 'selectToken' };
  }
  if (parseAmount(state.exactAmount) <= 0) return { kind: 'enterAmount' };

  // The derived side can round to zero when converting a dust amount.
  const derivedSide = opposite(state.exactSide);
  const derived = derivedSide === 'from' ? quote.fromAmount : quote.toAmount;
  if (parseAmount(derived) <= 0) return { kind: 'amountTooSmall', side: state.exactSide };

  const balance = balances[state.fromSymbol] ?? 0;
  if (parseAmount(quote.fromAmount) > balance) {
    return { kind: 'insufficientBalance', symbol: state.fromSymbol, balance };
  }
  return null;
}

export function minimumReceived(toAmount: string): number {
  return parseAmount(toAmount) * (1 - SLIPPAGE_TOLERANCE);
}
