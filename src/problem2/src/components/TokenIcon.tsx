import { useState, type CSSProperties } from 'react';
import type { Token } from '../api/prices';
import styles from './TokenIcon.module.css';

/** Shared across instances so a missing icon is requested once, not once per list row. */
const failedUrls = new Set<string>();

function hueFor(symbol: string): number {
  let hash = 0;
  for (const char of symbol) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}

interface TokenIconProps {
  token: Pick<Token, 'symbol' | 'iconUrl'>;
  size?: number;
}

/** Token logo with a generated monogram fallback when the icon repo has no matching file. */
export function TokenIcon({ token, size = 28 }: TokenIconProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const style = { '--size': `${size}px`, '--hue': hueFor(token.symbol) } as CSSProperties;

  if (failedUrl === token.iconUrl || failedUrls.has(token.iconUrl)) {
    return (
      <span className={styles.monogram} style={style} aria-hidden="true">
        {token.symbol.replace(/^[a-z]+/, '').charAt(0) || token.symbol.charAt(0)}
      </span>
    );
  }

  return (
    <img
      className={styles.icon}
      style={style}
      src={token.iconUrl}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => {
        failedUrls.add(token.iconUrl);
        setFailedUrl(token.iconUrl);
      }}
    />
  );
}
