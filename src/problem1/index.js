// @ts-check
'use strict';

/**
 * Problem 1 — Three ways to sum to n.
 *
 * Contract (see README.md for the reasoning behind each assumption):
 * - `n` is any integer and the result is below `Number.MAX_SAFE_INTEGER` (given by the task).
 * - `sum_to_n(0) === 0`.
 * - Negative input mirrors the positive case: `sum_to_n(-n) === -sum_to_n(n)`,
 *   e.g. `sum_to_n(-3) === -1 + -2 + -3 === -6`.
 *
 * All three implementations return identical results for every valid input.
 */

/**
 * A — Closed form (Gauss): n(n + 1) / 2.
 *
 * Time O(1), space O(1). The default choice.
 *
 * `n * (n + 1)` can exceed MAX_SAFE_INTEGER for the largest valid inputs, but it stays
 * below 2^54 and is always even, and every even integer below 2^54 is exactly
 * representable as a double — so the product and the halving are both exact.
 *
 * @param {number} n
 * @returns {number}
 */
var sum_to_n_a = function (n) {
  var m = Math.abs(n);
  var sum = (m * (m + 1)) / 2;
  return n < 0 ? -sum : sum;
};

/**
 * B — Iterative accumulation.
 *
 * Time O(n), space O(1). The most literal reading of the definition; no recursion,
 * so no stack limits, but ~1.3e8 iterations at the largest valid input (~70 ms on an M-series Mac).
 *
 * @param {number} n
 * @returns {number}
 */
var sum_to_n_b = function (n) {
  var m = Math.abs(n);
  var sum = 0;
  for (var i = 1; i <= m; i++) {
    sum += i;
  }
  return n < 0 ? -sum : sum;
};

/**
 * C — Recursive halving (divide and conquer), no closed form needed.
 *
 * Time O(log n), space O(log n) call stack (≤ ~54 frames for any valid input).
 *
 * Splitting 1..2k into odds and evens gives:
 *   S(2k)     = (1 + 3 + … + (2k − 1)) + (2 + 4 + … + 2k) = k² + 2·S(k)
 *   S(2k + 1) = S(2k) + (2k + 1)
 *
 * A naive `n + sum(n - 1)` recursion was rejected: it needs n stack frames and throws
 * `RangeError: Maximum call stack size exceeded` at around n ≈ 10⁴, far below the
 * inputs the task allows. Every intermediate value here is ≤ the final result, so
 * there is no overflow risk either.
 *
 * @param {number} n
 * @returns {number}
 */
var sum_to_n_c = function (n) {
  if (n < 0) return -sum_to_n_c(-n);
  if (n <= 1) return n;
  if (n % 2 === 1) return sum_to_n_c(n - 1) + n;
  var half = n / 2;
  return half * half + 2 * sum_to_n_c(half);
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { sum_to_n_a, sum_to_n_b, sum_to_n_c };
}
