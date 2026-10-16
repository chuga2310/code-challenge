import { useId } from 'react';
import { Icon } from '../../components/Icon';
import formStyles from './SwapForm.module.css';
import styles from './SwapCardStates.module.css';

/** Same footprint as the loaded form, so nothing jumps when prices arrive. */
export function SwapFormSkeleton() {
  return (
    <section className={formStyles.card} aria-busy="true" aria-label="Swap">
      <div className={styles.skeleton}>
        <span className={styles.bone} data-shape="title" />
        <span className={styles.bone} data-shape="line" />
        {(['from', 'to'] as const).map((leg) => (
          <div key={leg} className={styles.leg}>
            <span className={styles.bone} data-shape="label" />
            <div className={styles.entry}>
              <span className={styles.bone} data-shape="amount" />
              <span className={styles.bone} data-shape="pill" />
            </div>
          </div>
        ))}
        <span className={styles.bone} data-shape="button" />
      </div>
      <p className="visually-hidden" role="status">
        Loading token prices…
      </p>
    </section>
  );
}

export function SwapLoadError({ onRetry }: { onRetry: () => void }) {
  const titleId = useId();
  return (
    <section className={formStyles.card} aria-labelledby={titleId}>
      <div className={styles.error} role="alert">
        <span className={styles.errorIcon}>
          <Icon name="alert" size={22} />
        </span>
        <h1 id={titleId} className={styles.errorTitle}>
          Prices are unavailable
        </h1>
        <p className={styles.errorText}>
          We couldn’t load exchange rates, so swapping is paused. Check your connection and try
          again.
        </p>
        <button type="button" className={formStyles.submit} onClick={onRetry}>
          Try again
        </button>
      </div>
    </section>
  );
}
