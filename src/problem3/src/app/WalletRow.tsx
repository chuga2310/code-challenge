// Stand-in for the app's row component (see Box.tsx).

export interface WalletRowProps {
  className?: string | undefined;
  amount: number;
  /** Undefined while the price is unknown. */
  usdValue: number | undefined;
  formattedAmount: string;
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function WalletRow({ className, formattedAmount, usdValue }: WalletRowProps) {
  return (
    <div className={className}>
      <span>{formattedAmount}</span>
      <span>{usdValue === undefined ? '—' : usd.format(usdValue)}</span>
    </div>
  );
}
