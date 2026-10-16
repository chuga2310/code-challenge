import { describe, expect, it } from 'vitest';
import { formatTokenAmount, formatUnitPrice, formatUsd } from './format';

describe('formatTokenAmount', () => {
  it('truncates instead of rounding up, so balances never read high', () => {
    expect(formatTokenAmount(2.41839)).toBe('2.4183');
    expect(formatTokenAmount(1629.5155397)).toBe('1,629.5155');
    expect(formatTokenAmount(0.00060749)).toBe('0.0006074');
  });

  it('is not tripped up by float noise', () => {
    expect(formatTokenAmount((0.7 * 10) / 2000)).toBe('0.0035');
  });
});

describe('formatUnitPrice', () => {
  it('keeps significant digits for sub-dollar prices', () => {
    expect(formatUnitPrice(0.004039850455)).toBe('$0.004039');
    expect(formatUnitPrice(0.99999)).toBe('$0.9999');
    expect(formatUnitPrice(1645.9337)).toBe('$1,645.93');
  });
});

describe('formatUsd', () => {
  it('never shows a non-zero value as $0.00', () => {
    expect(formatUsd(0.004)).toBe('< $0.01');
    expect(formatUsd(0)).toBe('$0.00');
    expect(formatUsd(3980.123)).toBe('$3,980.12');
  });
});
