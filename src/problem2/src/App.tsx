import { useState } from 'react';
import styles from './App.module.css';
import { SwapFormSkeleton, SwapLoadError } from './features/swap/SwapCardStates';
import { SwapForm } from './features/swap/SwapForm';
import { useTokens } from './hooks/useTokens';

export function App() {
  const prices = useTokens();
  // After a retry the button that had focus is gone; hand focus to the form instead of <body>.
  const [retried, setRetried] = useState(false);

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <span className={styles.brand}>
          <svg className={styles.mark} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M5 9.5h11.5l-3-3M19 14.5H7.5l3 3" />
          </svg>
          Fancy Swap
        </span>
        <span className={styles.wallet} title="Balances are simulated">
          <span className={styles.walletDot} aria-hidden="true" />
          Demo wallet
        </span>
      </header>

      <main className={styles.main}>
        {prices.status === 'success' && (
          <SwapForm tokens={prices.tokens} autoFocusHeading={retried} />
        )}
        {prices.status === 'loading' && <SwapFormSkeleton />}
        {prices.status === 'error' && (
          <SwapLoadError
            onRetry={() => {
              setRetried(true);
              prices.retry();
            }}
          />
        )}
      </main>

      <footer className={styles.footer}>
        <p>
          Prices from <a href="https://interview.switcheo.com/prices.json">Switcheo’s price feed</a>
          . Swaps are simulated and no funds move.
        </p>
      </footer>
    </div>
  );
}
