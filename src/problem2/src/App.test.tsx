import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { PRICE_FEED } from './test/fixtures';

describe('App', () => {
  it('shows a skeleton, then the form once prices load', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(PRICE_FEED)));
    render(<App />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading token prices…');
    expect(await screen.findByRole('heading', { name: 'Swap' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'You pay: ETH. Change token' })).toBeInTheDocument();
  });

  it('recovers from a failed price request via retry', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(Response.json(PRICE_FEED));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Prices are unavailable');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    // Focus lands on the form, not <body>, once the Retry button is gone.
    expect(await screen.findByRole('heading', { name: 'Swap' })).toHaveFocus();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
