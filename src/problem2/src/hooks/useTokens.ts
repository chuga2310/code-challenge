import { useCallback, useEffect, useState } from 'react';
import { fetchTokens, type Token } from '../api/prices';

export type TokensState =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'success'; tokens: Token[] };

/**
 * Loads the priced token list once, with abort-on-unmount and manual retry.
 * The data is a one-off snapshot, so a query library would be more machinery than it's worth.
 */
export function useTokens(): TokensState & { retry: () => void } {
  const [state, setState] = useState<TokensState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchTokens(controller.signal).then(
      (tokens) => {
        setState({ status: 'success', tokens });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: 'error',
          error: error instanceof Error ? error : new Error('Could not load prices.'),
        });
      },
    );
    return () => {
      controller.abort();
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((count) => count + 1);
  }, []);

  return { ...state, retry };
}
