// @ts-check
'use strict';

// Rough timing to back up the complexity notes in README.md. Run: `npm run bench`.
const { sum_to_n_a, sum_to_n_b, sum_to_n_c } = require('./index.js');

const inputs = [1e3, 1e5, 1e7, 2 ** 27 - 1];
const implementations = { sum_to_n_a, sum_to_n_b, sum_to_n_c };

for (const [name, sumToN] of Object.entries(implementations)) {
  for (const n of inputs) {
    const runs = n > 1e6 && name === 'sum_to_n_b' ? 3 : 10_000;
    const start = process.hrtime.bigint();
    for (let i = 0; i < runs; i++) sumToN(n);
    const nsPerCall = Number(process.hrtime.bigint() - start) / runs;
    console.log(
      `${name}  n=${String(n).padEnd(9)}  ${(nsPerCall / 1e3).toFixed(3).padStart(12)} µs/call`,
    );
  }
}
