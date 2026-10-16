import {
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import type { Token } from '../../api/prices';
import { Icon } from '../../components/Icon';
import { TokenIcon } from '../../components/TokenIcon';
import { formatTokenAmount, formatUnitPrice, formatUsd } from '../../lib/format';
import type { Side } from './swapState';
import { rankTokens, searchTokens } from './tokenSearch';
import styles from './TokenPicker.module.css';
import type { Balances } from './wallet';

interface TokenPickerProps {
  side: Side;
  tokens: readonly Token[];
  balances: Balances;
  selectedSymbol: string | null;
  onSelect: (symbol: string) => void;
  onClose: () => void;
}

/**
 * Token picker shown as a sheet over the swap card, not a page-level modal.
 * The user keeps their place, and it reads as part of the same task.
 * Built on the WAI-ARIA combobox + listbox pattern: focus stays in the search box,
 * arrow keys move the active option, Enter picks it, Escape goes back.
 * It behaves as a modal: the form behind it is inert, Tab cycles inside it, and
 * Escape closes it even if a pointer click moved focus elsewhere.
 */
export function TokenPicker({
  side,
  tokens,
  balances,
  selectedSymbol,
  onSelect,
  onClose,
}: TokenPickerProps) {
  const titleId = useId();
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const ranked = useMemo(() => rankTokens(tokens, balances), [tokens, balances]);
  const [query, setQuery] = useState('');
  // Start on the current token, so opening the picker and pressing Enter changes nothing.
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      ranked.findIndex((token) => token.symbol === selectedSymbol),
    ),
  );
  // The focus ring on the active option is for keyboard users; pointer hover only tints it.
  const [navigation, setNavigation] = useState<'keyboard' | 'pointer'>('keyboard');

  const results = useMemo(() => searchTokens(ranked, query), [ranked, query]);
  const active = Math.max(0, Math.min(activeIndex, results.length - 1));
  const optionId = (symbol: string) => `${listId}-${symbol}`;
  const activeToken = results[active];

  const closeOnEscape = useEffectEvent((event: globalThis.KeyboardEvent) => {
    if (event.key === 'Escape' && !event.isComposing) onClose();
  });
  useEffect(() => {
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const moveTo = (index: number) => {
    setNavigation('keyboard');
    setActiveIndex(index);
    listRef.current?.children[index]?.scrollIntoView({ block: 'nearest' });
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Enter also confirms an IME composition; it must not pick a token.
    if (results.length === 0 || event.nativeEvent.isComposing) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveTo(Math.min(active + 1, results.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveTo(Math.max(active - 1, 0));
        break;
      case 'Enter':
        event.preventDefault();
        if (activeToken) onSelect(activeToken.symbol);
        break;
    }
  };

  /** Keeps Tab inside the sheet. Its only tab stops are the back button and the search box. */
  const trapTab = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const [first, last] = [backRef.current, searchRef.current];
    if (event.shiftKey ? document.activeElement === first : document.activeElement === last) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    }
  };

  return (
    <div
      className={styles.sheet}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={trapTab}
    >
      <header className={styles.header}>
        <button
          ref={backRef}
          type="button"
          className={styles.back}
          onClick={onClose}
          aria-label="Back to swap"
        >
          <Icon name="arrowLeft" />
        </button>
        <h2 id={titleId} className={styles.title}>
          {side === 'from' ? 'Pay with' : 'Receive'}
        </h2>
      </header>

      <div className={styles.search}>
        <Icon name="search" size={18} className={styles.searchIcon} />
        <input
          ref={searchRef}
          className={styles.searchInput}
          type="search"
          role="combobox"
          aria-label="Search tokens"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeToken ? optionId(activeToken.symbol) : undefined}
          placeholder="Search by ticker"
          autoComplete="off"
          spellCheck={false}
          // The sheet opens because the user asked to pick a token, so typing is the next step.
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setNavigation('keyboard');
            setActiveIndex(0);
          }}
          onKeyDown={handleSearchKeyDown}
        />
      </div>

      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label="Tokens"
        className={styles.list}
        data-navigation={navigation}
      >
        {results.map((token, index) => {
          const balance = balances[token.symbol] ?? 0;
          const isCurrent = token.symbol === selectedSymbol;
          return (
            <li
              key={token.symbol}
              id={optionId(token.symbol)}
              role="option"
              aria-selected={index === active}
              data-active={index === active || undefined}
              className={styles.option}
              onMouseMove={() => {
                setNavigation('pointer');
                setActiveIndex(index);
              }}
              onClick={() => {
                onSelect(token.symbol);
              }}
            >
              <TokenIcon token={token} size={32} />
              <span className={styles.identity}>
                <span className={styles.symbol}>
                  {token.symbol}
                  {isCurrent && <span className="visually-hidden">, current selection</span>}
                </span>
                <span className={styles.price}>{formatUnitPrice(token.priceUsd)}</span>
              </span>
              {balance > 0 && (
                <span className={styles.holding}>
                  <span className={styles.holdingAmount}>{formatTokenAmount(balance)}</span>
                  <span className={styles.holdingValue}>{formatUsd(balance * token.priceUsd)}</span>
                </span>
              )}
              {isCurrent && <Icon name="check" size={18} className={styles.check} />}
            </li>
          );
        })}
      </ul>

      {/* Always mounted so screen readers announce result changes as the user types. */}
      <p role="status" className={results.length > 0 ? 'visually-hidden' : styles.empty}>
        {results.length > 0
          ? `${results.length} ${results.length === 1 ? 'token' : 'tokens'}`
          : `No token matches “${query.trim()}”. Try a ticker such as ETH or ATOM.`}
      </p>
    </div>
  );
}
