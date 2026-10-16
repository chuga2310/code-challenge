import type { Token } from '../../api/prices';
import type { Balances } from './wallet';

/** Tokens you hold come first (largest USD value first), then the rest in alphabetical order. */
export function rankTokens(tokens: readonly Token[], balances: Balances): Token[] {
  const valueOf = (token: Token) => (balances[token.symbol] ?? 0) * token.priceUsd;
  // Array#sort is stable, so equal values keep the feed's alphabetical order.
  return [...tokens].sort((a, b) => valueOf(b) - valueOf(a));
}

/**
 * Case-insensitive ticker search: exact match, then prefix matches, then substring
 * matches. Within each group the incoming order is kept.
 */
export function searchTokens(tokens: readonly Token[], query: string): Token[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return [...tokens];

  const score = (symbol: string) => {
    const haystack = symbol.toLowerCase();
    if (haystack === needle) return 0;
    if (haystack.startsWith(needle)) return 1;
    return haystack.includes(needle) ? 2 : -1;
  };

  return tokens
    .map((token) => ({ token, score: score(token.symbol) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => a.score - b.score)
    .map((entry) => entry.token);
}
