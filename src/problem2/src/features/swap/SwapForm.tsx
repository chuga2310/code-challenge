import { useEffect, useId, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import type { Token } from '../../api/prices';
import { submitSwap, type SwapReceipt, type SwapRequest } from '../../api/swap';
import { Icon } from '../../components/Icon';
import { Spinner } from '../../components/Spinner';
import { parseAmount, toAmountInput } from '../../lib/amount';
import { formatTokenAmount } from '../../lib/format';
import { AmountField } from './AmountField';
import styles from './SwapForm.module.css';
import {
  createInitialState,
  deriveQuote,
  minimumReceived,
  swapReducer,
  validateSwap,
  type Side,
  type SwapAction,
  type SwapIssue,
} from './swapState';
import { SwapSummary } from './SwapSummary';
import { TokenPicker } from './TokenPicker';
import { applyReceipt, DEMO_BALANCES, type Balances } from './wallet';

type Submission =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; receipt: SwapReceipt }
  | { status: 'error'; message: string };

interface SwapFormProps {
  tokens: readonly Token[];
  /** Injectable for tests and for swapping the mock for a real client. */
  onSwap?: (request: SwapRequest) => Promise<SwapReceipt>;
  initialBalances?: Balances;
  /** Move focus to the heading on mount, e.g. after a retry replaced the button that had focus. */
  autoFocusHeading?: boolean;
}

function submitLabel(issue: SwapIssue | null, pending: boolean): string {
  if (pending) return 'Swapping…';
  switch (issue?.kind) {
    case 'selectToken':
      return 'Select a token';
    case 'enterAmount':
      return 'Enter an amount';
    case 'amountTooSmall':
      return 'Amount too small';
    case 'insufficientBalance':
      return `Insufficient ${issue.symbol} balance`;
    case undefined:
      return 'Swap';
  }
}

function fieldError(issue: SwapIssue | null, side: Side): string | null {
  if (issue?.kind === 'insufficientBalance' && side === 'from') {
    return `Exceeds your balance of ${formatTokenAmount(issue.balance)} ${issue.symbol}.`;
  }
  if (issue?.kind === 'amountTooSmall' && issue.side === side) {
    return 'Too small to convert. Try a larger amount.';
  }
  return null;
}

export function SwapForm({
  tokens,
  onSwap = submitSwap,
  initialBalances = DEMO_BALANCES,
  autoFocusHeading = false,
}: SwapFormProps) {
  const [state, dispatch] = useReducer(swapReducer, tokens, createInitialState);
  const [balances, setBalances] = useState(initialBalances);
  const [submission, setSubmission] = useState<Submission>({ status: 'idle' });
  const [pickerSide, setPickerSide] = useState<Side | null>(null);
  const [flipTurns, setFlipTurns] = useState(0);
  const fromButtonRef = useRef<HTMLButtonElement>(null);
  const toButtonRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (autoFocusHeading) headingRef.current?.focus();
  }, [autoFocusHeading]);

  const tokenBySymbol = useMemo(
    () => new Map(tokens.map((token) => [token.symbol, token])),
    [tokens],
  );
  const tokenFor = (symbol: string | null) =>
    symbol === null ? null : (tokenBySymbol.get(symbol) ?? null);
  const balanceOf = (symbol: string | null) => (symbol === null ? 0 : (balances[symbol] ?? 0));

  const fromToken = tokenFor(state.fromSymbol);
  const toToken = tokenFor(state.toSymbol);
  const quote = deriveQuote(state, (symbol) => tokenBySymbol.get(symbol)?.priceUsd);
  const issue = validateSwap(state, quote, balances);
  const isPending = submission.status === 'pending';
  const canSubmit = issue === null && !isPending;

  /** Any edit starts a new swap, so the previous receipt or error goes away. */
  const edit = (action: SwapAction) => {
    dispatch(action);
    if (submission.status === 'success' || submission.status === 'error') {
      setSubmission({ status: 'idle' });
    }
  };

  const closePicker = (side: Side) => {
    // Commit synchronously so the form is no longer inert before focus goes back to it.
    flushSync(() => {
      setPickerSide(null);
    });
    (side === 'from' ? fromButtonRef : toButtonRef).current?.focus();
  };

  const handleSubmit = async () => {
    if (!canSubmit || !state.fromSymbol || !state.toSymbol) return;
    const request: SwapRequest = {
      fromSymbol: state.fromSymbol,
      toSymbol: state.toSymbol,
      amountIn: parseAmount(quote.fromAmount),
      amountOut: parseAmount(quote.toAmount),
      minAmountOut: minimumReceived(quote.toAmount),
    };

    setSubmission({ status: 'pending' });
    try {
      const receipt = await onSwap(request);
      setBalances((current) => applyReceipt(current, receipt));
      dispatch({ type: 'amountCleared' });
      setSubmission({ status: 'success', receipt });
    } catch (error) {
      setSubmission({
        status: 'error',
        message: error instanceof Error ? error.message : 'The swap could not be completed.',
      });
    }
  };

  return (
    <section className={styles.card} aria-labelledby={titleId}>
      <form
        className={styles.form}
        noValidate
        inert={pickerSide !== null}
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <header className={styles.header}>
          <h1 ref={headingRef} id={titleId} className={styles.title} tabIndex={-1}>
            Swap
          </h1>
          <p className={styles.subtitle}>Trade any listed token at the latest USD price.</p>
        </header>

        <div className={styles.legs}>
          <AmountField
            side="from"
            label="You pay"
            token={fromToken}
            amount={quote.fromAmount}
            balance={balanceOf(state.fromSymbol)}
            error={fieldError(issue, 'from')}
            locked={isPending}
            tokenButtonRef={fromButtonRef}
            onAmountChange={(side, amount) => {
              edit({ type: 'amountChanged', side, amount });
            }}
            onTokenClick={setPickerSide}
            onMax={() => {
              const amount = toAmountInput(balanceOf(state.fromSymbol), 'down');
              edit({ type: 'amountChanged', side: 'from', amount });
            }}
          />

          <div className={styles.divider}>
            <button
              type="button"
              className={styles.flip}
              style={{ '--turns': flipTurns } as CSSProperties}
              disabled={isPending}
              aria-label="Switch pay and receive tokens"
              onClick={() => {
                setFlipTurns((turns) => turns + 1);
                edit({ type: 'flipped' });
              }}
            >
              <Icon name="flip" size={18} />
            </button>
          </div>

          <AmountField
            side="to"
            label="You receive"
            token={toToken}
            amount={quote.toAmount}
            balance={balanceOf(state.toSymbol)}
            error={fieldError(issue, 'to')}
            locked={isPending}
            tokenButtonRef={toButtonRef}
            onAmountChange={(side, amount) => {
              edit({ type: 'amountChanged', side, amount });
            }}
            onTokenClick={setPickerSide}
          />
        </div>

        {fromToken && toToken && quote.rate !== null && (
          <SwapSummary
            fromToken={fromToken}
            toToken={toToken}
            rate={quote.rate}
            minimumReceived={minimumReceived(quote.toAmount)}
          />
        )}

        <div className={styles.footer}>
          <button
            type="submit"
            className={styles.submit}
            aria-disabled={!canSubmit}
            data-pending={isPending || undefined}
          >
            {isPending && <Spinner size={18} />}
            {submitLabel(issue, isPending)}
          </button>

          <div className={styles.status} role="status">
            {submission.status === 'success' && (
              <p className={styles.success}>
                <Icon name="check" size={16} />
                <span>
                  Swapped {formatTokenAmount(submission.receipt.amountIn)}{' '}
                  {submission.receipt.fromSymbol} for{' '}
                  {formatTokenAmount(submission.receipt.amountOut)} {submission.receipt.toSymbol}.
                </span>
              </p>
            )}
            {submission.status === 'error' && (
              <p className={styles.failure}>
                <Icon name="alert" size={16} />
                <span>{submission.message} Nothing was swapped. Please try again.</span>
              </p>
            )}
          </div>
        </div>
      </form>

      {pickerSide !== null && (
        <TokenPicker
          side={pickerSide}
          tokens={tokens}
          balances={balances}
          selectedSymbol={pickerSide === 'from' ? state.fromSymbol : state.toSymbol}
          onSelect={(symbol) => {
            edit({ type: 'tokenSelected', side: pickerSide, symbol });
            closePicker(pickerSide);
          }}
          onClose={() => {
            closePicker(pickerSide);
          }}
        />
      )}
    </section>
  );
}
