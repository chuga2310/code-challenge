import type { HTMLAttributes } from 'react';

/*
 * Stand-ins for app code the task references but doesn't show (design-system Box,
 * data hooks, WalletRow). They exist only so the refactor type-checks and can be tested.
 */

export type BoxProps = HTMLAttributes<HTMLDivElement>;

/** Minimal stand-in for a design-system layout primitive such as MUI's `Box`. */
export function Box(props: BoxProps) {
  return <div {...props} />;
}
