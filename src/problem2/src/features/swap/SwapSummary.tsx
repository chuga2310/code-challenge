import { useState } from 'react';
import type { Token } from '../../api/prices';
import { Icon } from '../../components/Icon';
import { formatTimestampUtc, formatTokenAmount } from '../../lib/format';
import { SLIPPAGE_TOLERANCE } from './swapState';
import styles from './SwapSummary.module.css';

interface SwapSummaryProps {
  fromToken: Token;
  toToken: Token;
  /** Units of `toToken` per one `fromToken`. */
  rate: number;
  minimumReceived: number;
}

export function SwapSummary({ fromToken, toToken, rate, minimumReceived }: SwapSummaryProps) {
  const [inverted, setInverted] = useState(false);
  const [base, quote, shownRate] = inverted
    ? [toToken, fromToken, 1 / rate]
    : [fromToken, toToken, rate];
  const rateText = `1 ${base.symbol} = ${formatTokenAmount(shownRate)} ${quote.symbol}`;
  // Quote freshness is bounded by the staler of the two prices.
  const quotedAt =
    fromToken.priceUpdatedAt < toToken.priceUpdatedAt
      ? fromToken.priceUpdatedAt
      : toToken.priceUpdatedAt;

  return (
    <dl className={styles.summary}>
      <div className={styles.row}>
        <dt>Rate</dt>
        <dd>
          <button
            type="button"
            className={styles.rate}
            onClick={() => {
              setInverted((value) => !value);
            }}
            aria-label={`${rateText}. Show rate in ${base.symbol}`}
          >
            <span className={styles.numeric}>{rateText}</span>
            <Icon name="invert" size={14} />
          </button>
        </dd>
      </div>
      {minimumReceived > 0 && (
        <div className={styles.row}>
          <dt>
            Minimum received
            <span className={styles.hint}> · {SLIPPAGE_TOLERANCE * 100}% slippage</span>
          </dt>
          <dd className={styles.numeric}>
            {formatTokenAmount(minimumReceived)} {toToken.symbol}
          </dd>
        </div>
      )}
      <div className={styles.row}>
        <dt>Prices as of</dt>
        <dd>
          <time dateTime={quotedAt}>{formatTimestampUtc(quotedAt)}</time>
        </dd>
      </div>
    </dl>
  );
}
