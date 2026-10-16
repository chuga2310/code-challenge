# Problem 1 — Three ways to sum to n

Implementation: [`index.js`](./index.js) · Tests: [`index.test.js`](./index.test.js) · Benchmark: [`bench.js`](./bench.js)

```bash
npm test          # node:test — 15 cases, incl. the upper input bound, checked against a BigInt oracle
npm run bench     # rough timings per implementation
npm run typecheck # JSDoc types checked by tsc (// @ts-check)
```

## The three implementations

| Fn           | Approach                             | Time     | Space          | When to use                                     |
| ------------ | ------------------------------------ | -------- | -------------- | ----------------------------------------------- |
| `sum_to_n_a` | Closed form `n(n+1)/2` (Gauss)       | **O(1)** | O(1)           | Always — this is the production answer.         |
| `sum_to_n_b` | Iterative loop                       | O(n)     | O(1)           | Readable baseline / reference.                  |
| `sum_to_n_c` | Recursive halving (divide & conquer) | O(log n) | O(log n) stack | Shows recursion done safely, no formula needed. |

**C in one line:** split `1..2k` into odd and even terms, so `S(2k) = k² + 2·S(k)` and `S(2k+1) = S(2k) + 2k + 1`.
That is at most ~54 stack frames for any valid input.

Measured on Node 24, Apple Silicon (`npm run bench`):

| n           | A        | B       | C        |
| ----------- | -------- | ------- | -------- |
| 1 000       | ~0.01 µs | ~0.3 µs | ~0.05 µs |
| 10 000 000  | ~0.01 µs | ~5 ms   | ~0.2 µs  |
| 134 217 727 | ~0.01 µs | ~70 ms  | ~0.3 µs  |

## Assumptions

The task says "any integer" but only defines the positive case, so:

1. `sum_to_n(0) === 0` (empty sum).
2. **Negative input mirrors the positive case**: `sum_to_n(-n) === -sum_to_n(n)`, e.g. `sum_to_n(-3) === -6`.
   The other common reading (sum from `n` up to `1`, giving `-5`) is less symmetric. Either would be a one-line change.
3. Inputs are integers and the result is below `Number.MAX_SAFE_INTEGER`, as the task guarantees, so the functions
   don't validate input. The largest such `n` is `2^27 − 1 = 134 217 727`; the tests cover it.

## Decisions worth calling out

- **Why naive recursion is not one of the three.** `n + sum(n − 1)` needs `n` stack frames. V8 throws
  `RangeError: Maximum call stack size exceeded` around `n ≈ 10⁴`, well inside the allowed input range.
  It fails the contract, so it isn't a valid answer.
- **Why `Array.from({ length: n }).reduce(...)` is not one of the three.** It is the loop with an O(n) array
  allocated first. At the upper bound that is ~1 GB of memory for no benefit.
- **The closed form is exact at the boundary.** `n * (n + 1)` goes past `MAX_SAFE_INTEGER` for large `n`, but it
  stays below `2^54` and is always even, and every even integer below `2^54` is an exact double. So no
  "divide first" trick is needed. A test at `2^27 − 1` checks this against a BigInt reference.
- The skeleton uses `var` function expressions. I kept that signature so the file drops into any grader as-is.
  CommonJS exports are guarded, so the file also runs in a browser `<script>`.
