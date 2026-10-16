import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SwapReceipt, SwapRequest } from '../../api/swap';
import { TOKENS } from '../../test/fixtures';
import { SwapForm } from './SwapForm';

const BALANCES = { ETH: 2, USDC: 500 };

const receiptFor = (request: SwapRequest): SwapReceipt => ({
  ...request,
  id: 'receipt-1',
  executedAt: '2023-08-29T07:11:00.000Z',
});

function setup(onSwap = vi.fn((request: SwapRequest) => Promise.resolve(receiptFor(request)))) {
  const user = userEvent.setup();
  render(<SwapForm tokens={TOKENS} initialBalances={BALANCES} onSwap={onSwap} />);
  return {
    user,
    onSwap,
    payInput: () => screen.getByRole('textbox', { name: 'You pay' }),
    receiveInput: () => screen.getByRole('textbox', { name: 'You receive' }),
  };
}

/** The submit button's label doubles as its state, so match any of them. */
const submitButton = () =>
  screen.getByRole('button', {
    name: /^(Swap|Swapping…|Enter an amount|Insufficient .+ balance|Amount too small|Select a token)$/,
  });

describe('SwapForm', () => {
  it('starts on ETH → USDC and asks for an amount', () => {
    setup();
    expect(screen.getByRole('button', { name: 'You pay: ETH. Change token' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'You receive: USDC. Change token' }),
    ).toBeInTheDocument();
    expect(submitButton()).toHaveTextContent('Enter an amount');
    expect(submitButton()).toHaveAttribute('aria-disabled', 'true');
  });

  it('quotes in both directions', async () => {
    const { user, payInput, receiveInput } = setup();

    await user.type(payInput(), '1.5');
    expect(receiveInput()).toHaveValue('3000');
    expect(screen.getAllByText('≈ $3,000.00')).toHaveLength(2);
    expect(screen.getByText('1 ETH = 2,000 USDC')).toBeInTheDocument();

    await user.clear(receiveInput());
    await user.type(receiveInput(), '500');
    expect(payInput()).toHaveValue('0.25');
  });

  it('ignores characters that are not part of a number', async () => {
    const { user, payInput } = setup();
    await user.type(payInput(), '1a.2.5');
    expect(payInput()).toHaveValue('1.25');
  });

  it('explains an insufficient balance inline and on the button', async () => {
    const { user, payInput } = setup();
    await user.type(payInput(), '3');

    expect(payInput()).toHaveAccessibleDescription('Exceeds your balance of 2 ETH.');
    expect(payInput()).toHaveAttribute('aria-invalid', 'true');
    expect(submitButton()).toHaveTextContent('Insufficient ETH balance');
  });

  it('fills the full balance with Max', async () => {
    const { user, payInput } = setup();
    await user.click(screen.getByRole('button', { name: /^Max: use your full balance/ }));
    expect(payInput()).toHaveValue('2');
  });

  it('flips the pair, keeping the typed amount with its token', async () => {
    const { user, payInput, receiveInput } = setup();
    await user.type(payInput(), '1');
    await user.click(screen.getByRole('button', { name: 'Switch pay and receive tokens' }));

    expect(screen.getByRole('button', { name: 'You pay: USDC. Change token' })).toBeInTheDocument();
    expect(receiveInput()).toHaveValue('1');
    expect(payInput()).toHaveValue('2000');
  });

  it('picks a token with the keyboard and returns focus to the trigger', async () => {
    const { user } = setup();
    const trigger = screen.getByRole('button', { name: 'You receive: USDC. Change token' });
    await user.click(trigger);

    const picker = screen.getByRole('dialog', { name: 'Receive' });
    const search = within(picker).getByRole('combobox', { name: 'Search tokens' });
    expect(search).toHaveFocus();

    await user.type(search, 'sw');
    expect(within(picker).getAllByRole('option')).toHaveLength(1);
    await user.keyboard('{Enter}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const updated = screen.getByRole('button', { name: 'You receive: SWTH. Change token' });
    expect(updated).toHaveFocus();
  });

  it('keeps Tab inside the picker and starts on the current token', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'You pay: ETH. Change token' }));
    const picker = screen.getByRole('dialog', { name: 'Pay with' });
    const search = within(picker).getByRole('combobox', { name: 'Search tokens' });
    const back = within(picker).getByRole('button', { name: 'Back to swap' });

    expect(picker).toHaveAttribute('aria-modal', 'true');
    expect(within(picker).getByRole('option', { selected: true })).toHaveTextContent('ETH');

    await user.tab();
    expect(back).toHaveFocus();
    await user.tab();
    expect(search).toHaveFocus();
    await user.tab({ shift: true });
    expect(back).toHaveFocus();
  });

  it('closes the picker with Escape and shows an empty state for no matches', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'You pay: ETH. Change token' }));

    await user.keyboard('doge');
    const picker = screen.getByRole('dialog', { name: 'Pay with' });
    expect(within(picker).getByRole('status')).toHaveTextContent('No token matches “doge”');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'You pay: ETH. Change token' })).toHaveFocus();
  });

  it('submits, shows progress, then settles balances and confirms', async () => {
    let settle: () => void = () => undefined;
    const onSwap = vi.fn(
      (request: SwapRequest) =>
        new Promise<SwapReceipt>((resolve) => {
          settle = () => {
            resolve(receiptFor(request));
          };
        }),
    );
    const { user, payInput } = setup(onSwap);

    await user.type(payInput(), '0.5');
    await user.click(submitButton());

    expect(onSwap).toHaveBeenCalledWith({
      fromSymbol: 'ETH',
      toSymbol: 'USDC',
      amountIn: 0.5,
      amountOut: 1000,
      minAmountOut: 995,
    });
    expect(submitButton()).toHaveTextContent('Swapping…');
    expect(payInput()).toHaveAttribute('readonly');

    // A second click while pending must not submit twice.
    await user.click(submitButton());
    expect(onSwap).toHaveBeenCalledTimes(1);

    settle();

    expect(await screen.findByText('Swapped 0.5 ETH for 1,000 USDC.')).toBeInTheDocument();
    expect(payInput()).toHaveValue('');
    expect(screen.getByText('1.5', { selector: 'span' })).toBeInTheDocument(); // ETH balance 2 → 1.5
  });

  it('keeps the amounts and reports a failed swap', async () => {
    const onSwap = vi.fn(() => Promise.reject(new Error('Network unreachable.')));
    const { user, payInput } = setup(onSwap);

    await user.type(payInput(), '1');
    await user.click(submitButton());

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Network unreachable. Nothing was swapped. Please try again.',
      );
    });
    expect(payInput()).toHaveValue('1');
  });

  it('does not submit while the form is invalid', async () => {
    const { user, onSwap, payInput } = setup();
    await user.type(payInput(), '5{Enter}');
    expect(onSwap).not.toHaveBeenCalled();
  });
});
