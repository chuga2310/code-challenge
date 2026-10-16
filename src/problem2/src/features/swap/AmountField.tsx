import { useId, type Ref } from 'react';
import type { Token } from '../../api/prices';
import { Icon } from '../../components/Icon';
import { TokenIcon } from '../../components/TokenIcon';
import { parseAmount, sanitizeAmountInput } from '../../lib/amount';
import { formatTokenAmount, formatUsd } from '../../lib/format';
import styles from './AmountField.module.css';
import type { Side } from './swapState';

interface AmountFieldProps {
  side: Side;
  label: string;
  token: Token | null;
  amount: string;
  balance: number;
  error: string | null;
  /** True while a swap is in flight. The field stays focusable but read-only. */
  locked: boolean;
  tokenButtonRef: Ref<HTMLButtonElement>;
  onAmountChange: (side: Side, amount: string) => void;
  onTokenClick: (side: Side) => void;
  onMax?: () => void;
}

/** Long numbers step the font down instead of scrolling out of view. */
function lengthBucket(amount: string): 'long' | 'longer' | undefined {
  if (amount.length > 16) return 'longer';
  if (amount.length > 11) return 'long';
  return undefined;
}

export function AmountField({
  side,
  label,
  token,
  amount,
  balance,
  error,
  locked,
  tokenButtonRef,
  onAmountChange,
  onTokenClick,
  onMax,
}: AmountFieldProps) {
  const inputId = useId();
  const errorId = useId();
  const value = parseAmount(amount);

  return (
    <div className={styles.field} data-invalid={error !== null || undefined}>
      <div className={styles.meta}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
        {token && (
          <span className={styles.balance}>
            Balance <span className={styles.numeric}>{formatTokenAmount(balance)}</span>
            {onMax && balance > 0 && (
              <button
                type="button"
                className={styles.max}
                onClick={onMax}
                disabled={locked}
                aria-label={`Max: use your full balance of ${formatTokenAmount(balance)} ${token.symbol}`}
              >
                Max
              </button>
            )}
          </span>
        )}
      </div>

      <div className={styles.entry}>
        <input
          id={inputId}
          className={styles.input}
          data-length={lengthBucket(amount)}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="0"
          value={amount}
          readOnly={locked}
          aria-invalid={error !== null}
          aria-describedby={error === null ? undefined : errorId}
          onChange={(event) => {
            const next = sanitizeAmountInput(event.target.value);
            if (next !== null) onAmountChange(side, next);
          }}
        />
        <button
          ref={tokenButtonRef}
          type="button"
          className={styles.tokenButton}
          data-empty={token === null || undefined}
          disabled={locked}
          aria-haspopup="dialog"
          aria-label={
            token
              ? `${label}: ${token.symbol}. Change token`
              : `Select a token to ${side === 'from' ? 'pay with' : 'receive'}`
          }
          onClick={() => {
            onTokenClick(side);
          }}
        >
          {token ? (
            <>
              <TokenIcon token={token} size={24} />
              <span className={styles.symbol}>{token.symbol}</span>
            </>
          ) : (
            <span className={styles.symbol}>Select token</span>
          )}
          <Icon name="chevronDown" size={16} className={styles.chevron} />
        </button>
      </div>

      <p className={styles.fiat}>
        {token && value > 0 ? `≈ ${formatUsd(value * token.priceUsd)}` : null}
      </p>

      {/* Always mounted, so the message is announced when it appears, wherever focus is. */}
      <div className={styles.errorRegion} aria-live="polite">
        {error !== null && (
          <p id={errorId} className={styles.error}>
            <Icon name="alert" size={16} />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
