// @ts-check
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sum_to_n_a, sum_to_n_b, sum_to_n_c } = require('./index.js');

const implementations = { sum_to_n_a, sum_to_n_b, sum_to_n_c };

/** Exact reference using BigInt so the oracle itself can never lose precision. */
const expected = (/** @type {number} */ n) => {
  const m = BigInt(Math.abs(n));
  const sum = (m * (m + 1n)) / 2n;
  return Number(n < 0 ? -sum : sum);
};

/** Largest n whose sum is still below Number.MAX_SAFE_INTEGER: (2^27 − 1)·2^26 = 2^53 − 2^26. */
const MAX_VALID_N = 2 ** 27 - 1;

for (const [name, sumToN] of Object.entries(implementations)) {
  describe(name, () => {
    it('matches the example from the task', () => {
      assert.equal(sumToN(5), 15);
    });

    it('handles the base cases', () => {
      assert.equal(sumToN(0), 0);
      assert.equal(sumToN(1), 1);
      assert.equal(sumToN(2), 3);
    });

    it('mirrors positive results for negative input', () => {
      assert.equal(sumToN(-1), -1);
      assert.equal(sumToN(-5), -15);
    });

    it('agrees with the exact reference for every n in [-2000, 2000]', () => {
      for (let n = -2000; n <= 2000; n++) {
        assert.equal(sumToN(n), expected(n), `n = ${n}`);
      }
    });

    it('stays exact at the upper bound of valid input', () => {
      assert.ok(expected(MAX_VALID_N) < Number.MAX_SAFE_INTEGER);
      assert.ok(expected(MAX_VALID_N + 1) > Number.MAX_SAFE_INTEGER);
      assert.equal(sumToN(MAX_VALID_N), expected(MAX_VALID_N));
      assert.equal(sumToN(-MAX_VALID_N), expected(-MAX_VALID_N));
    });
  });
}
