# Problem 3 — Messy React

| File                                                   | What                                                                                                                             |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| [`original/WalletPage.tsx`](./original/WalletPage.tsx) | The task's code, verbatim (not built)                                                                                            |
| [`src/WalletPage.tsx`](./src/WalletPage.tsx)           | Refactored component (render only)                                                                                               |
| [`src/walletBalances.ts`](./src/walletBalances.ts)     | Extracted pure logic: priority, filter, sort, format, USD value                                                                  |
| [`src/*.test.ts(x)`](./src)                            | 11 tests that pin down the fixed behaviour                                                                                       |
| [`src/app/`](./src/app)                                | Minimal stand-ins for code the snippet imports but doesn't show (`Box`, hooks, `WalletRow`) so the refactor type-checks and runs |

```bash
npm test && npm run typecheck && npm run lint
```

## Summary

The snippet has **runtime bugs, not just style issues**. As soon as there is at least one
balance, it throws a `ReferenceError` (`lhsPriority` is not defined). With an empty list, the
usual loading state, the callbacks never run, so the bug hides until data arrives. Patch that,
and it still shows the wrong balances (the filter is inverted), prints `undefined` amounts (it
maps the wrong array), and shows `NaN` USD values for unpriced tokens. On the efficiency side,
it redoes the filter and sort on every price update, even though prices don't affect either.

Compiled under `strict`, the original fails with 7 errors. For this I stubbed the imports the
snippet leaves out (`useMemo`, `BoxProps`, the two hooks, `WalletRow`) and left `classes` as
written. Output, trimmed:

```text
error TS2339: Property 'blockchain' does not exist on type 'WalletBalance'.        (×3)
error TS2304: Cannot find name 'lhsPriority'.
error TS2345: '(lhs, rhs) => 1 | -1 | undefined' is not assignable to '(a, b) => number'.
error TS2345: Property 'formatted' is missing in type '…' but required in type 'FormattedWalletBalance'.
error TS2304: Cannot find name 'classes'.
```

---

## Issues

Severity: 🔴 bug (wrong output or crash) · 🟠 inefficiency · 🟡 anti-pattern / maintainability.

### Correctness

**1. 🔴 `lhsPriority` is not defined.** Inside `filter`, the code computes `balancePriority` and then
checks `lhsPriority > -99`. That is a `ReferenceError` the first time the memo runs, so the page crashes.
→ Use the variable that was computed.

**2. 🔴 The filter logic is inverted.** It keeps balances where `amount <= 0` and drops every positive
balance. So the page lists only empty or negative balances.
→ Keep `priority !== undefined && amount > 0`. _(Assumption: the intent is "show non-empty balances on
supported chains", which is the only reading where the priority check makes sense.)_

**3. 🔴 Rows are built from the wrong array.** `formattedBalances` is computed and then ignored.
`rows` maps over `sortedBalances`, so `balance.formatted` is always `undefined` and `WalletRow` gets no
formatted amount. The `(balance: FormattedWalletBalance)` annotation only hides this: it claims a shape
the data doesn't have.
→ One pipeline that filters, sorts and formats once, and render from its output.

**4. 🔴 `WalletBalance` has no `blockchain` field**, but the code reads `balance.blockchain` in three places
(a type error, and the reason for the `any`).
→ Add `blockchain: string` to the interface.

**5. 🔴 `classes` is not defined** in the snippet. Other omitted names (`useMemo`, the hooks, `WalletRow`)
are obviously imports, and `classes` could be one too (`import classes from './x.module.css'`). But
nothing in the code says so, and if it is a leftover `useStyles()` it is a `ReferenceError` on the first
row. → Make the dependency explicit: the refactor imports a CSS module. _(If it was just an omitted
import, ignore this one.)_

**6. 🔴 `NaN` USD values.** `prices[balance.currency] * balance.amount` is `NaN` when a currency has no
price (missing from the feed, or prices still loading).
→ Type `Prices` as `Partial<Record<…>>` so the compiler forces the missing case to be handled, and
return `undefined` for it, which the row renders as "—". Defaulting to `?? 0` would be wrong in a
quieter way: it shows "$0.00" as if that were the value.

**7. 🔴 `toFixed()` with no argument rounds to an integer.** `0.5 ETH` displays as `"1"` and `0.4` as `"0"`.
That is wrong for crypto amounts. → `Intl.NumberFormat`, which also adds grouping (`1,234.567891`). It
**truncates** (a balance should never read higher than it is) and keeps significant digits below 1, so
`0.0000004` doesn't collapse to `"0"`.

**8. 🔴 `children` is destructured and then dropped.** Pulling `children` out of `props` stops it from
reaching `...rest`, but it is never rendered either. Anything passed between `<WalletPage>…</WalletPage>`
silently disappears. → Render it (refactor), or remove it from the props type.

**9. 🟡 The comparator never returns 0.** Equal priorities fall through and return `undefined`. The spec
turns that into `NaN` and then `+0`, so at runtime it behaves. But it depends on a coercion most readers
won't know about, and it is a type error under `strict`. → `(a, b) => b.priority - a.priority`. It
covers all three cases and is obviously right.

### Performance

**10. 🟠 Wrong `useMemo` dependencies.** The memo depends on `[balances, prices]` but never reads
`prices`. Prices usually tick much more often than balances change, so every tick re-filters and
re-sorts the whole list for nothing. → Depend on `[balances]` only. USD values, which really do depend
on prices, are a cheap multiply in render.

**11. 🟠 `getPriority` runs inside the comparator.** A sort makes O(n log n) comparisons and each one calls
`getPriority` twice, on top of n calls in the filter. → Look up the priority **once per item** and sort
on the cached number. Lookups go from ~2·n·log n to n. To be fair: with a 5-case `switch` and a
wallet-sized list, the speed-up is small, and carrying `{ balance, priority }` costs one small
allocation per item. The real gain is clarity: priority is decided in one place, and the comparator
becomes a subtraction.

**12. 🟠 Derived arrays rebuilt on every render.** `formattedBalances` (unused anyway) and `rows` are
rebuilt on every render, including renders that change neither input. → Filtering, sorting and formatting
happen inside the memo. Only the price-dependent part runs per render.

**13. 🟠 / 🟡 `getPriority` is redefined on every render.** It is a pure function with no dependency on
props or state, yet it is defined inside the component. That allocates a new function each render and
leaves the memo with an un-listed dependency (`react-hooks/exhaustive-deps` flags it).
→ Move it to module scope, as a `Map` lookup instead of a `switch`.

### Type safety & React anti-patterns

**14. 🟡 `blockchain: any`** turns off type checking exactly where the typo in #1 and the missing field
in #4 would have been caught. → `string` input, with a typed lookup table.

**15. 🟡 `key={index}`.** The list is filtered and sorted, so indexes don't identify items. When order
changes, React matches the wrong rows, re-renders more than needed, and can attach row state to the wrong
balance. → A stable key from the data: `${blockchain}:${currency}`. The same currency can exist on
several chains, so the chain is part of the key.

**16. 🟡 `BoxProps` spread onto a plain `<div>`.** Props meant for a design-system `Box` (`sx`,
`component`, …) end up on a DOM node. React warns about unknown props and the styling is lost.
→ Render `<Box {...rest}>`.

**17. 🟡 Magic sentinel `-99`** for "unsupported chain". It is compared against in a different place than
it is defined, which is how #1 slipped in. → Return `undefined`; the type system then forces the caller
to handle it.

**18. 🟡 Small things a linter or formatter catches.** An empty `interface Props extends BoxProps {}`
(→ `type Props = BoxProps`), redundant `React.FC<Props> = (props: Props)` double typing,
`FormattedWalletBalance` repeating `WalletBalance`'s fields (→ `extends`), and mixed tabs and spaces
with missing semicolons (→ Prettier).

**19. 🟡 Logic mixed into the component.** Filtering, ranking and formatting live inside the
component, so none of it can be tested without rendering. → Extract it to `walletBalances.ts`
(pure, 100% unit-tested). The component is left with wiring and markup.

---

## Refactor

```tsx
// src/walletBalances.ts (excerpt)
const BLOCKCHAIN_PRIORITY: ReadonlyMap<string, number> = new Map([
  ['Osmosis', 100],
  ['Ethereum', 50],
  ['Arbitrum', 30],
  ['Zilliqa', 20],
  ['Neo', 20],
]);

export const getPriority = (blockchain: string) => BLOCKCHAIN_PRIORITY.get(blockchain);

export function selectDisplayBalances(
  balances: readonly WalletBalance[],
): FormattedWalletBalance[] {
  return balances
    .flatMap((balance) => {
      const priority = getPriority(balance.blockchain);
      return priority !== undefined && balance.amount > 0 ? [{ balance, priority }] : [];
    })
    .sort((a, b) => b.priority - a.priority)
    .map(({ balance }) => ({ ...balance, formatted: formatAmount(balance.amount) }));
}

/** undefined while unpriced; the row shows "—". */
export function usdValueOf(balance: WalletBalance, prices: Prices): number | undefined {
  const price = prices[balance.currency];
  return price === undefined ? undefined : price * balance.amount;
}
```

```tsx
// src/WalletPage.tsx
export function WalletPage({ children, ...rest }: WalletPageProps) {
  const balances = useWalletBalances();
  const prices = usePrices();
  const displayBalances = useMemo(() => selectDisplayBalances(balances), [balances]);

  return (
    <Box {...rest}>
      {displayBalances.map((balance) => (
        <WalletRow
          key={balanceKey(balance)}
          className={styles.row}
          amount={balance.amount}
          usdValue={usdValueOf(balance, prices)}
          formattedAmount={balance.formatted}
        />
      ))}
      {children}
    </Box>
  );
}
```

### Notes on the refactor

- **The lookup is a `Map`, not an object literal.** With `PRIORITY[chain]` on a plain object, a key like
  `"constructor"` resolves to `Object.prototype.constructor` instead of `undefined`. There's a test for it.
- **`WalletRow`'s `usdValue` is widened to `number | undefined`.** Then "price unknown" reaches the UI
  as "—" instead of a fake number. In a real codebase that is a small, deliberate API change to the row.

### What I would add in a real codebase

- **If prices tick often and rows are heavy**, wrap `WalletRow` in `React.memo`. Each row then
  re-renders only when its own `usdValue` changes. It isn't worth it before profiling shows a need.
- **The memo is only as good as `useWalletBalances`.** It works when that hook returns a referentially
  stable array (e.g. from a query cache). If it builds a new array every call, the fix belongs in the hook.
- **Priority belongs with the chain config** (or comes from the backend), not hard-coded in a page
  component. The lookup table is the step towards that.
