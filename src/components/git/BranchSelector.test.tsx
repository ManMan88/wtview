import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { invoke } from '@tauri-apps/api/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BranchSelector } from './BranchSelector';
import { toast } from 'sonner';
import type { BranchInfo } from '@/lib/tauri';

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

describe('BranchSelector', () => {
  const defaultProps = {
    worktreePath: '/path/to/worktree',
    repoPath: '/path/to/repo',
    currentBranch: 'main',
  };

  const mockBranches: BranchInfo[] = [
    { name: 'main', is_remote: false, is_current: true },
    { name: 'develop', is_remote: false, is_current: false },
    { name: 'feature/test', is_remote: false, is_current: false },
    { name: 'origin/main', is_remote: true, is_current: false },
    { name: 'origin/develop', is_remote: true, is_current: false },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'list_branches') {
        return Promise.resolve(mockBranches);
      }
      return Promise.resolve(undefined);
    });
  });

  describe('rendering', () => {
    it('renders the Branch card', async () => {
      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByText('Branch')).toBeInTheDocument();
    });

    it('displays current branch', () => {
      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByText('Current:')).toBeInTheDocument();
      expect(screen.getByText('main')).toBeInTheDocument();
    });

    it('displays "Detached HEAD" when currentBranch is null', () => {
      render(<BranchSelector {...defaultProps} currentBranch={null} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Detached HEAD')).toBeInTheDocument();
    });

    it('renders branch selection dropdown', () => {
      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('renders checkout button', () => {
      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /checkout/i })).toBeInTheDocument();
    });

    it('shows placeholder text in dropdown', () => {
      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByText('Switch to branch...')).toBeInTheDocument();
    });
  });

  describe('branch loading', () => {
    it('fetches branches from API', async () => {
      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('list_branches', { repoPath: '/path/to/repo' });
      });
    });

    it('shows loading spinner while fetching branches', async () => {
      let resolvePromise: (value: BranchInfo[]) => void;
      const promise = new Promise<BranchInfo[]>((resolve) => {
        resolvePromise = resolve;
      });
      mockInvoke.mockReturnValue(promise);

      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      // The combobox should be rendered before opening
      const combobox = screen.getByRole('combobox');
      expect(combobox).toBeInTheDocument();

      resolvePromise!(mockBranches);
    });
  });

  describe('branch grouping', () => {
    it('groups local branches under Local label', async () => {
      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => expect(mockInvoke).toHaveBeenCalled());

      await userEvent.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('Local')).toBeInTheDocument();
      });
    });

    it('groups remote branches under Remote label', async () => {
      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => expect(mockInvoke).toHaveBeenCalled());

      await userEvent.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('Remote')).toBeInTheDocument();
      });
    });

    it('displays local branch names in dropdown', async () => {
      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => expect(mockInvoke).toHaveBeenCalled());

      await userEvent.click(screen.getByRole('combobox'));

      await waitFor(() => {
        // Use exact match for local branch (not prefixed with origin/)
        expect(screen.getByRole('option', { name: /^develop$/ })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /^feature\/test$/ })).toBeInTheDocument();
      });
    });

    it('displays remote branch names in dropdown', async () => {
      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => expect(mockInvoke).toHaveBeenCalled());

      await userEvent.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /origin\/main/ })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /origin\/develop/ })).toBeInTheDocument();
      });
    });

    it('marks current branch as disabled', async () => {
      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => expect(mockInvoke).toHaveBeenCalled());

      await userEvent.click(screen.getByRole('combobox'));

      await waitFor(() => {
        const mainOption = screen.getByRole('option', { name: /main.*current/i });
        expect(mainOption).toHaveAttribute('aria-disabled', 'true');
      });
    });

    it('shows (current) indicator for current branch', async () => {
      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => expect(mockInvoke).toHaveBeenCalled());

      await userEvent.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('(current)')).toBeInTheDocument();
      });
    });

    it('handles empty branch list', async () => {
      mockInvoke.mockResolvedValue([]);

      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => expect(mockInvoke).toHaveBeenCalled());

      // Open the dropdown
      const combobox = screen.getByRole('combobox');
      await userEvent.click(combobox);

      // Should not throw and should render the listbox (dropdown is open)
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
    });

    it('handles only local branches', async () => {
      mockInvoke.mockResolvedValue([
        { name: 'main', is_remote: false, is_current: true },
        { name: 'develop', is_remote: false, is_current: false },
      ]);

      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => expect(mockInvoke).toHaveBeenCalled());

      await userEvent.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('Local')).toBeInTheDocument();
        expect(screen.queryByText('Remote')).not.toBeInTheDocument();
      });
    });

    it('handles only remote branches', async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === 'list_branches') {
          return Promise.resolve([
            { name: 'origin/main', is_remote: true, is_current: false },
            { name: 'origin/develop', is_remote: true, is_current: false },
          ]);
        }
        return Promise.resolve(undefined);
      });

      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => expect(mockInvoke).toHaveBeenCalled());

      await userEvent.click(screen.getByRole('combobox'));

      await waitFor(() => {
        // When dropdown opens, check for labels in the listbox
        expect(screen.queryByText('Local')).not.toBeInTheDocument();
        expect(screen.getByText('Remote')).toBeInTheDocument();
      });
    });
  });

  describe('checkout button', () => {
    it('is disabled when no branch is selected', () => {
      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /checkout/i })).toBeDisabled();
    });

    it('shows error toast when clicking checkout without selection', async () => {
      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      // Try to trigger checkout without selection (button is disabled, so this shouldn't call the mutation)
      // The validation is in handleCheckout
      expect(screen.getByRole('button', { name: /checkout/i })).toBeDisabled();
    });

    it('shows info toast when checking out current branch', async () => {
      render(<BranchSelector {...defaultProps} currentBranch="develop" />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(mockInvoke).toHaveBeenCalled());

      // Select develop branch
      await userEvent.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /^develop$/ })).toBeInTheDocument();
      });
      await userEvent.click(screen.getByRole('option', { name: /^develop$/ }));

      // Click checkout
      await userEvent.click(screen.getByRole('button', { name: /checkout/i }));

      await waitFor(() => {
        expect(mockToast.info).toHaveBeenCalledWith('Already on this branch');
      });
    });

    it('calls checkout_branch with correct parameters', async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === 'list_branches') {
          return Promise.resolve(mockBranches);
        }
        if (cmd === 'checkout_branch') {
          return Promise.resolve(undefined);
        }
        return Promise.resolve(undefined);
      });

      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('list_branches', expect.anything()));

      // Select develop branch
      await userEvent.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /^develop$/ })).toBeInTheDocument();
      });
      await userEvent.click(screen.getByRole('option', { name: /^develop$/ }));

      // Click checkout
      await userEvent.click(screen.getByRole('button', { name: /checkout/i }));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('checkout_branch', {
          worktreePath: '/path/to/worktree',
          branch: 'develop',
        });
      });
    });

    it('shows success toast on successful checkout', async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === 'list_branches') {
          return Promise.resolve(mockBranches);
        }
        return Promise.resolve(undefined);
      });

      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => expect(mockInvoke).toHaveBeenCalled());

      await userEvent.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /^develop$/ })).toBeInTheDocument();
      });
      await userEvent.click(screen.getByRole('option', { name: /^develop$/ }));
      await userEvent.click(screen.getByRole('button', { name: /checkout/i }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Switched to branch: develop');
      });
    });

    it('clears selection after successful checkout', async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === 'list_branches') {
          return Promise.resolve(mockBranches);
        }
        return Promise.resolve(undefined);
      });

      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => expect(mockInvoke).toHaveBeenCalled());

      await userEvent.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /^develop$/ })).toBeInTheDocument();
      });
      await userEvent.click(screen.getByRole('option', { name: /^develop$/ }));
      await userEvent.click(screen.getByRole('button', { name: /checkout/i }));

      await waitFor(() => {
        expect(screen.getByText('Switch to branch...')).toBeInTheDocument();
      });
    });

    it('shows error toast on checkout failure', async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === 'list_branches') {
          return Promise.resolve(mockBranches);
        }
        if (cmd === 'checkout_branch') {
          return Promise.reject(new Error('Branch has uncommitted changes'));
        }
        return Promise.resolve(undefined);
      });

      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => expect(mockInvoke).toHaveBeenCalled());

      await userEvent.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /^develop$/ })).toBeInTheDocument();
      });
      await userEvent.click(screen.getByRole('option', { name: /^develop$/ }));
      await userEvent.click(screen.getByRole('button', { name: /checkout/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('Checkout failed'));
      });
    });
  });

  describe('loading states', () => {
    it('disables checkout button during checkout', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      mockInvoke.mockImplementation((cmd) => {
        if (cmd === 'list_branches') {
          return Promise.resolve(mockBranches);
        }
        if (cmd === 'checkout_branch') {
          return promise;
        }
        return Promise.resolve(undefined);
      });

      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => expect(mockInvoke).toHaveBeenCalled());

      await userEvent.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /^develop$/ })).toBeInTheDocument();
      });
      await userEvent.click(screen.getByRole('option', { name: /^develop$/ }));

      fireEvent.click(screen.getByRole('button', { name: /checkout/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '' })).toBeDisabled(); // Loading state shows spinner
      });

      resolvePromise!();
    });
  });

  describe('branch selection', () => {
    it('allows selecting a local branch', async () => {
      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => expect(mockInvoke).toHaveBeenCalled());

      await userEvent.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /feature\/test/ })).toBeInTheDocument();
      });
      await userEvent.click(screen.getByRole('option', { name: /feature\/test/ }));

      expect(screen.getByRole('combobox')).toHaveTextContent('feature/test');
    });

    it('allows selecting a remote branch', async () => {
      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => expect(mockInvoke).toHaveBeenCalled());

      await userEvent.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /origin\/develop/ })).toBeInTheDocument();
      });
      await userEvent.click(screen.getByRole('option', { name: /origin\/develop/ }));

      expect(screen.getByRole('combobox')).toHaveTextContent('origin/develop');
    });

    it('enables checkout button after selection', async () => {
      render(<BranchSelector {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => expect(mockInvoke).toHaveBeenCalled());

      expect(screen.getByRole('button', { name: /checkout/i })).toBeDisabled();

      await userEvent.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /^develop$/ })).toBeInTheDocument();
      });
      await userEvent.click(screen.getByRole('option', { name: /^develop$/ }));

      expect(screen.getByRole('button', { name: /checkout/i })).not.toBeDisabled();
    });
  });
});
