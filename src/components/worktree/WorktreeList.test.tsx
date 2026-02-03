import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorktreeList } from './WorktreeList';
import { useAppStore } from '@/stores/appStore';
import type { WorktreeInfo } from '@/lib/tauri';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
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

describe('WorktreeList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      currentRepo: null,
      selectedWorktreePath: null,
      recentRepos: [],
    });
  });

  it('shows loading spinner while fetching', async () => {
    mockInvoke.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { container } = render(<WorktreeList repoPath="/repo" />, { wrapper: createWrapper() });

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error message when fetch fails', async () => {
    mockInvoke.mockRejectedValue(new Error('Repository not found'));

    render(<WorktreeList repoPath="/invalid" />, { wrapper: createWrapper() });

    expect(await screen.findByText('Failed to load worktrees')).toBeInTheDocument();
  });

  it('shows empty message when no worktrees found', async () => {
    mockInvoke.mockResolvedValue([]);

    render(<WorktreeList repoPath="/empty-repo" />, { wrapper: createWrapper() });

    expect(await screen.findByText('No worktrees found')).toBeInTheDocument();
  });

  it('renders worktree cards when data is loaded', async () => {
    const mockWorktrees: WorktreeInfo[] = [
      { path: '/repo', branch: 'main', is_main: true, is_locked: false },
      { path: '/repo-feature', branch: 'feature', is_main: false, is_locked: false },
    ];
    mockInvoke.mockResolvedValue(mockWorktrees);

    render(<WorktreeList repoPath="/repo" />, { wrapper: createWrapper() });

    expect(await screen.findByText('main')).toBeInTheDocument();
    expect(screen.getByText('feature')).toBeInTheDocument();
  });

  it('marks the selected worktree as selected', async () => {
    const mockWorktrees: WorktreeInfo[] = [
      { path: '/repo', branch: 'main', is_main: true, is_locked: false },
      { path: '/repo-feature', branch: 'feature', is_main: false, is_locked: false },
    ];
    mockInvoke.mockResolvedValue(mockWorktrees);
    useAppStore.setState({ selectedWorktreePath: '/repo-feature' });

    render(<WorktreeList repoPath="/repo" />, { wrapper: createWrapper() });

    await screen.findByText('main');

    const buttons = screen.getAllByRole('button');
    const featureButton = buttons.find((btn) => btn.textContent?.includes('feature'));
    expect(featureButton).toHaveClass('border-primary/50');
  });

  it('calls selectWorktree when a worktree card is clicked', async () => {
    const mockWorktrees: WorktreeInfo[] = [
      { path: '/repo', branch: 'main', is_main: true, is_locked: false },
    ];
    mockInvoke.mockResolvedValue(mockWorktrees);

    render(<WorktreeList repoPath="/repo" />, { wrapper: createWrapper() });

    await screen.findByText('main');

    fireEvent.click(screen.getByRole('button'));

    expect(useAppStore.getState().selectedWorktreePath).toBe('/repo');
  });

  it('renders multiple worktrees in order', async () => {
    const mockWorktrees: WorktreeInfo[] = [
      { path: '/repo', branch: 'main', is_main: true, is_locked: false },
      { path: '/repo-alpha', branch: 'alpha', is_main: false, is_locked: false },
      { path: '/repo-beta', branch: 'beta', is_main: false, is_locked: true },
    ];
    mockInvoke.mockResolvedValue(mockWorktrees);

    render(<WorktreeList repoPath="/repo" />, { wrapper: createWrapper() });

    await screen.findByText('main');

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });
});
