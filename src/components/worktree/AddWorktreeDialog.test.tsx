import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { invoke } from '@tauri-apps/api/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddWorktreeDialog } from './AddWorktreeDialog';
import type { BranchInfo } from '@/lib/tauri';

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
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('AddWorktreeDialog', () => {
  const mockBranches: BranchInfo[] = [
    { name: 'main', is_remote: false, is_current: true },
    { name: 'develop', is_remote: false, is_current: false },
    { name: 'origin/main', is_remote: true, is_current: false },
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

  it('renders when open is true', () => {
    render(
      <AddWorktreeDialog open={true} onOpenChange={vi.fn()} repoPath="/repo" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add Worktree')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(
      <AddWorktreeDialog open={false} onOpenChange={vi.fn()} repoPath="/repo" />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows worktree path input', () => {
    render(
      <AddWorktreeDialog open={true} onOpenChange={vi.fn()} repoPath="/repo" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByLabelText('Worktree Path')).toBeInTheDocument();
  });

  it('shows branch label', () => {
    render(
      <AddWorktreeDialog open={true} onOpenChange={vi.fn()} repoPath="/repo" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Branch')).toBeInTheDocument();
  });

  it('loads branches from API', async () => {
    render(
      <AddWorktreeDialog open={true} onOpenChange={vi.fn()} repoPath="/repo" />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('list_branches', { repoPath: '/repo' });
    });
  });

  it('disables create button when form is incomplete', () => {
    render(
      <AddWorktreeDialog open={true} onOpenChange={vi.fn()} repoPath="/repo" />,
      { wrapper: createWrapper() }
    );

    const createButton = screen.getByRole('button', { name: /create worktree/i });
    expect(createButton).toBeDisabled();
  });

  it('calls onOpenChange when cancel is clicked', async () => {
    const onOpenChange = vi.fn();
    render(
      <AddWorktreeDialog open={true} onOpenChange={onOpenChange} repoPath="/repo" />,
      { wrapper: createWrapper() }
    );

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('allows typing in worktree path input', async () => {
    render(
      <AddWorktreeDialog open={true} onOpenChange={vi.fn()} repoPath="/repo" />,
      { wrapper: createWrapper() }
    );

    const input = screen.getByLabelText('Worktree Path');
    await userEvent.type(input, '/path/to/worktree');

    expect(input).toHaveValue('/path/to/worktree');
  });

  it('shows dialog title and description', () => {
    render(
      <AddWorktreeDialog open={true} onOpenChange={vi.fn()} repoPath="/repo" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Add Worktree')).toBeInTheDocument();
    expect(screen.getByText(/create a new git worktree/i)).toBeInTheDocument();
  });

  it('has cancel and create buttons', () => {
    render(
      <AddWorktreeDialog open={true} onOpenChange={vi.fn()} repoPath="/repo" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create worktree/i })).toBeInTheDocument();
  });

  it('has branch mode and branch selection comboboxes', () => {
    render(
      <AddWorktreeDialog open={true} onOpenChange={vi.fn()} repoPath="/repo" />,
      { wrapper: createWrapper() }
    );

    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes.length).toBeGreaterThanOrEqual(1);
  });
});
