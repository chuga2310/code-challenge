import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WalletPage } from './WalletPage';

// The demo hooks return ETH 1.25 (Ethereum), OSMO 320 (Osmosis) and ZIL 0 (Zilliqa).
describe('WalletPage', () => {
  it('renders priority-sorted, non-empty balances with USD values', () => {
    const { container } = render(<WalletPage />);
    const rows = Array.from(container.firstElementChild?.children ?? [], (row) => row.textContent);
    expect(rows).toEqual(['320$121.60', '1.25$2,057.41']);
  });

  it('forwards Box props and renders children instead of dropping them', () => {
    render(
      <WalletPage aria-label="Wallet" data-testid="wallet">
        <p>Footer</p>
      </WalletPage>,
    );
    expect(screen.getByTestId('wallet')).toHaveAttribute('aria-label', 'Wallet');
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });
});
