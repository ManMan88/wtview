import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { invoke } from '@tauri-apps/api/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RemoteActions } from './RemoteActions';
import { toast } from 'sonner';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockInvoke = vi.mocked(invoke);
const mockToast = vi.mocked(toast);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('RemoteActions', () => {
  const defaultProps = {
    worktreePath: '/path/to/worktree',
    repoPath: '/path/to/repo',
    ahead: 0,
    behind: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the Remote Operations card', () => {
      render(<RemoteActions {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByText('Remote Operations')).toBeInTheDocument();
    });

    it('renders Fetch, Pull, and Push buttons', () => {
      render(<RemoteActions {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /fetch/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /pull/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /push/i })).toBeInTheDocument();
    });

    it('does not show output area initially', () => {
      render(<RemoteActions {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.queryByRole('pre')).not.toBeInTheDocument();
    });
  });

  describe('ahead/behind badges', () => {
    it('shows behind badge on Pull button when behind > 0', () => {
      render(<RemoteActions {...defaultProps} behind={3} />, { wrapper: createWrapper() });

      const pullButton = screen.getByRole('button', { name: /pull/i });
      expect(pullButton).toHaveTextContent('3');
    });

    it('does not show behind badge when behind is 0', () => {
      render(<RemoteActions {...defaultProps} behind={0} />, { wrapper: createWrapper() });

      const pullButton = screen.getByRole('button', { name: /pull/i });
      expect(pullButton).not.toHaveTextContent(/\d/);
    });

    it('shows ahead badge on Push button when ahead > 0', () => {
      render(<RemoteActions {...defaultProps} ahead={5} />, { wrapper: createWrapper() });

      const pushButton = screen.getByRole('button', { name: /push/i });
      expect(pushButton).toHaveTextContent('5');
    });

    it('does not show ahead badge when ahead is 0', () => {
      render(<RemoteActions {...defaultProps} ahead={0} />, { wrapper: createWrapper() });

      const pushButton = screen.getByRole('button', { name: /push/i });
      expect(pushButton).not.toHaveTextContent(/\d/);
    });

    it('shows both badges when ahead and behind', () => {
      render(<RemoteActions {...defaultProps} ahead={2} behind={4} />, { wrapper: createWrapper() });

      const pullButton = screen.getByRole('button', { name: /pull/i });
      const pushButton = screen.getByRole('button', { name: /push/i });

      expect(pullButton).toHaveTextContent('4');
      expect(pushButton).toHaveTextContent('2');
    });
  });

  describe('fetch operation', () => {
    it('calls git_fetch with correct parameters', async () => {
      mockInvoke.mockResolvedValue('Fetched successfully');

      render(<RemoteActions {...defaultProps} />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByRole('button', { name: /fetch/i }));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('git_fetch', { worktreePath: '/path/to/worktree' });
      });
    });

    it('shows success toast on successful fetch', async () => {
      mockInvoke.mockResolvedValue('Fetched successfully');

      render(<RemoteActions {...defaultProps} />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByRole('button', { name: /fetch/i }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Fetch completed');
      });
    });

    it('shows output after successful fetch', async () => {
      mockInvoke.mockResolvedValue('Fetched from origin');

      render(<RemoteActions {...defaultProps} />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByRole('button', { name: /fetch/i }));

      await waitFor(() => {
        expect(screen.getByText('Fetched from origin')).toBeInTheDocument();
      });
    });

    it('shows default message when fetch returns empty', async () => {
      mockInvoke.mockResolvedValue('');

      render(<RemoteActions {...defaultProps} />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByRole('button', { name: /fetch/i }));

      await waitFor(() => {
        expect(screen.getByText('Fetch completed successfully')).toBeInTheDocument();
      });
    });

    it('shows error toast on failed fetch', async () => {
      mockInvoke.mockRejectedValue(new Error('No remote configured'));

      render(<RemoteActions {...defaultProps} />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByRole('button', { name: /fetch/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('Fetch failed'));
      });
    });
  });

  describe('pull operation', () => {
    it('calls git_pull with correct parameters', async () => {
      mockInvoke.mockResolvedValue('Already up to date');

      render(<RemoteActions {...defaultProps} />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByRole('button', { name: /pull/i }));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('git_pull', { worktreePath: '/path/to/worktree' });
      });
    });

    it('shows success toast on successful pull', async () => {
      mockInvoke.mockResolvedValue('Already up to date');

      render(<RemoteActions {...defaultProps} />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByRole('button', { name: /pull/i }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Pull completed');
      });
    });

    it('shows output after successful pull', async () => {
      mockInvoke.mockResolvedValue('Updating abc123..def456');

      render(<RemoteActions {...defaultProps} />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByRole('button', { name: /pull/i }));

      await waitFor(() => {
        expect(screen.getByText('Updating abc123..def456')).toBeInTheDocument();
      });
    });

    it('shows error toast on failed pull', async () => {
      mockInvoke.mockRejectedValue(new Error('Merge conflict'));

      render(<RemoteActions {...defaultProps} />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByRole('button', { name: /pull/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('Pull failed'));
      });
    });
  });

  describe('push operation', () => {
    it('calls git_push with correct parameters', async () => {
      mockInvoke.mockResolvedValue('Pushed to origin/main');

      render(<RemoteActions {...defaultProps} />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByRole('button', { name: /push/i }));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('git_push', { worktreePath: '/path/to/worktree' });
      });
    });

    it('shows success toast on successful push', async () => {
      mockInvoke.mockResolvedValue('Pushed to origin/main');

      render(<RemoteActions {...defaultProps} />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByRole('button', { name: /push/i }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Push completed');
      });
    });

    it('shows output after successful push', async () => {
      mockInvoke.mockResolvedValue('Everything up-to-date');

      render(<RemoteActions {...defaultProps} />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByRole('button', { name: /push/i }));

      await waitFor(() => {
        expect(screen.getByText('Everything up-to-date')).toBeInTheDocument();
      });
    });

    it('shows error toast on failed push', async () => {
      mockInvoke.mockRejectedValue(new Error('Push rejected'));

      render(<RemoteActions {...defaultProps} />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByRole('button', { name: /push/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('Push failed'));
      });
    });
  });

  describe('loading states', () => {
    it('disables all buttons during fetch', async () => {
      let resolvePromise: (value: string) => void;
      const promise = new Promise<string>((resolve) => {
        resolvePromise = resolve;
      });
      mockInvoke.mockReturnValue(promise);

      render(<RemoteActions {...defaultProps} />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByRole('button', { name: /fetch/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /fetch/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /pull/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /push/i })).toBeDisabled();
      });

      resolvePromise!('Done');
    });

    it('disables all buttons during pull', async () => {
      let resolvePromise: (value: string) => void;
      const promise = new Promise<string>((resolve) => {
        resolvePromise = resolve;
      });
      mockInvoke.mockReturnValue(promise);

      render(<RemoteActions {...defaultProps} />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByRole('button', { name: /pull/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /fetch/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /pull/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /push/i })).toBeDisabled();
      });

      resolvePromise!('Done');
    });

    it('disables all buttons during push', async () => {
      let resolvePromise: (value: string) => void;
      const promise = new Promise<string>((resolve) => {
        resolvePromise = resolve;
      });
      mockInvoke.mockReturnValue(promise);

      render(<RemoteActions {...defaultProps} />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByRole('button', { name: /push/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /fetch/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /pull/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /push/i })).toBeDisabled();
      });

      resolvePromise!('Done');
    });

    it('re-enables buttons after operation completes', async () => {
      mockInvoke.mockResolvedValue('Done');

      render(<RemoteActions {...defaultProps} />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByRole('button', { name: /fetch/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /fetch/i })).not.toBeDisabled();
        expect(screen.getByRole('button', { name: /pull/i })).not.toBeDisabled();
        expect(screen.getByRole('button', { name: /push/i })).not.toBeDisabled();
      });
    });
  });

  describe('output display', () => {
    it('updates output on subsequent operations', async () => {
      mockInvoke
        .mockResolvedValueOnce('First output')
        .mockResolvedValueOnce('Second output');

      render(<RemoteActions {...defaultProps} />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByRole('button', { name: /fetch/i }));

      await waitFor(() => {
        expect(screen.getByText('First output')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /pull/i }));

      await waitFor(() => {
        expect(screen.getByText('Second output')).toBeInTheDocument();
        expect(screen.queryByText('First output')).not.toBeInTheDocument();
      });
    });

    it('preserves whitespace in output', async () => {
      mockInvoke.mockResolvedValue('Line 1\nLine 2\n  Indented');

      render(<RemoteActions {...defaultProps} />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByRole('button', { name: /fetch/i }));

      await waitFor(() => {
        const preElement = screen.getByText(/Line 1/);
        expect(preElement).toHaveClass('whitespace-pre-wrap');
      });
    });
  });
});
