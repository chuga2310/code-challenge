import { useMemo } from 'react';
import { Box, type BoxProps } from './app/Box';
import { usePrices, useWalletBalances } from './app/hooks';
import { WalletRow } from './app/WalletRow';
import { balanceKey, selectDisplayBalances, usdValueOf } from './walletBalances';
import styles from './WalletPage.module.css';

type WalletPageProps = BoxProps;

export function WalletPage({ children, ...rest }: WalletPageProps) {
  const balances = useWalletBalances();
  const prices = usePrices();

  // Filtering, sorting and formatting depend on balances only, so a price tick doesn't redo them.
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
