import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { invoke } from '@tauri-apps/api/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeleteWorktreeDialog } from './DeleteWorktreeDialog';
import { useAppStore } from '@/stores/appStore';
import type { WorktreeInfo } from '@/lib/tauri';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockInvoke = vi.mocked(invoke);

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

describe('DeleteWorktreeDialog', () => {
  const mockWorktree: WorktreeInfo = {
    path: '/path/to/worktree',
    branch: 'feature-branch',
    is_main: false,
    is_locked: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      currentRepo: null,
      selectedWorktreePath: '/path/to/worktree',
      recentRepos: [],
    });
  });

  it('renders when open is true and worktree is provided', () => {
    render(
      <DeleteWorktreeDialog
        open={true}
        onOpenChange={vi.fn()}
        worktree={mockWorktree}
        repoPath="/repo"
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete Worktree')).toBeInTheDocument();
  });

  it('does not render when worktree is null', () => {
    render(
      <DeleteWorktreeDialog open={true} onOpenChange={vi.fn()} worktree={null} repoPath="/repo" />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(
      <DeleteWorktreeDialog
        open={false}
        onOpenChange={vi.fn()}
        worktree={mockWorktree}
        repoPath="/repo"
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the worktree folder name', () => {
    render(
      <DeleteWorktreeDialog
        open={true}
        onOpenChange={vi.fn()}
        worktree={mockWorktree}
        repoPath="/repo"
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('worktree')).toBeInTheDocument();
  });

  it('shows the worktree branch', () => {
    render(
      <DeleteWorktreeDialog
        open={true}
        onOpenChange={vi.fn()}
        worktree={mockWorktree}
        repoPath="/repo"
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('feature-branch')).toBeInTheDocument();
  });

  it('shows the worktree full path', () => {
    render(
      <DeleteWorktreeDialog
        open={true}
        onOpenChange={vi.fn()}
        worktree={mockWorktree}
        repoPath="/repo"
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('/path/to/worktree')).toBeInTheDocument();
  });

  it('shows "detached HEAD" for worktrees without a branch', () => {
    const detachedWorktree: WorktreeInfo = {
      ...mockWorktree,
      branch: null,
    };

    render(
      <DeleteWorktreeDialog
        open={true}
        onOpenChange={vi.fn()}
        worktree={detachedWorktree}
        repoPath="/repo"
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('detached HEAD')).toBeInTheDocument();
  });

  it('calls onOpenChange when cancel is clicked', async () => {
    const onOpenChange = vi.fn();
    render(
      <DeleteWorktreeDialog
        open={true}
        onOpenChange={onOpenChange}
        worktree={mockWorktree}
        repoPath="/repo"
      />,
      { wrapper: createWrapper() }
    );

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls removeWorktree when delete is clicked', async () => {
    mockInvoke.mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <DeleteWorktreeDialog
        open={true}
        onOpenChange={onOpenChange}
        worktree={mockWorktree}
        repoPath="/repo"
      />,
      { wrapper: createWrapper() }
    );

    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('remove_worktree', {
        repoPath: '/repo',
        worktreePath: '/path/to/worktree',
        force: false,
      });
    });
  });

  it('clears selected worktree after successful deletion', async () => {
    mockInvoke.mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <DeleteWorktreeDialog
        open={true}
        onOpenChange={onOpenChange}
        worktree={mockWorktree}
        repoPath="/repo"
      />,
      { wrapper: createWrapper() }
    );

    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(useAppStore.getState().selectedWorktreePath).toBeNull();
    });
  });

  it('shows force delete warning when deletion fails with uncommitted changes', async () => {
    mockInvoke.mockRejectedValue(new Error('uncommitted changes'));
    const onOpenChange = vi.fn();

    render(
      <DeleteWorktreeDialog
        open={true}
        onOpenChange={onOpenChange}
        worktree={mockWorktree}
        repoPath="/repo"
      />,
      { wrapper: createWrapper() }
    );

    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(screen.getByText(/force delete is enabled/i)).toBeInTheDocument();
    });
  });

  it('changes button text to "Force Delete" when force is enabled', async () => {
    mockInvoke.mockRejectedValue(new Error('uncommitted changes'));

    render(
      <DeleteWorktreeDialog
        open={true}
        onOpenChange={vi.fn()}
        worktree={mockWorktree}
        repoPath="/repo"
      />,
      { wrapper: createWrapper() }
    );

    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /force delete/i })).toBeInTheDocument();
    });
  });

  it('calls removeWorktree with force=true after enabling force delete', async () => {
    let callCount = 0;
    mockInvoke.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error('uncommitted changes'));
      }
      return Promise.resolve(undefined);
    });

    const onOpenChange = vi.fn();

    render(
      <DeleteWorktreeDialog
        open={true}
        onOpenChange={onOpenChange}
        worktree={mockWorktree}
        repoPath="/repo"
      />,
      { wrapper: createWrapper() }
    );

    // First click - triggers force mode
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /force delete/i })).toBeInTheDocument();
    });

    // Second click - force delete
    await userEvent.click(screen.getByRole('button', { name: /force delete/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('remove_worktree', {
        repoPath: '/repo',
        worktreePath: '/path/to/worktree',
        force: true,
      });
    });
  });

  it('shows loading spinner when deleting', async () => {
    mockInvoke.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <DeleteWorktreeDialog
        open={true}
        onOpenChange={vi.fn()}
        worktree={mockWorktree}
        repoPath="/repo"
      />,
      { wrapper: createWrapper() }
    );

    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  it('disables buttons while deleting', async () => {
    mockInvoke.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <DeleteWorktreeDialog
        open={true}
        onOpenChange={vi.fn()}
        worktree={mockWorktree}
        repoPath="/repo"
      />,
      { wrapper: createWrapper() }
    );

    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });
  });
});
