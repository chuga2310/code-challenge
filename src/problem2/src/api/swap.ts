/**
 * Mock swap backend. Stands in for a real endpoint: it adds latency so the
 * pending state can be seen, and returns a receipt shaped like a real one.
 */

export interface SwapRequest {
  fromSymbol: string;
  toSymbol: string;
  amountIn: number;
  /** Quoted output at submit time. */
  amountOut: number;
  /** Least output the user accepts after slippage. A real backend reverts below this. */
  minAmountOut: number;
}

export interface SwapReceipt extends SwapRequest {
  id: string;
  executedAt: string;
}

export const SIMULATED_LATENCY_MS = 1400;

export function submitSwap(request: SwapRequest): Promise<SwapReceipt> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ ...request, id: crypto.randomUUID(), executedAt: new Date().toISOString() });
    }, SIMULATED_LATENCY_MS);
  });
}
