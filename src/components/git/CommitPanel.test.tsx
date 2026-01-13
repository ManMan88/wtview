import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { invoke } from '@tauri-apps/api/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CommitPanel } from './CommitPanel';
import { toast } from 'sonner';
import type { FileStatus } from '@/lib/tauri';

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

describe('CommitPanel', () => {
  const defaultProps = {
    worktreePath: '/path/to/worktree',
    repoPath: '/path/to/repo',
    files: [] as FileStatus[],
  };

  const mockStagedFile: FileStatus = {
    path: 'staged-file.ts',
    status: 'modified',
    staged: true,
  };

  const mockUnstagedFile: FileStatus = {
    path: 'unstaged-file.ts',
    status: 'modified',
    staged: false,
  };

  const mockAddedFile: FileStatus = {
    path: 'new-file.ts',
    status: 'added',
    staged: true,
  };

  const mockDeletedFile: FileStatus = {
    path: 'deleted-file.ts',
    status: 'deleted',
    staged: false,
  };

  const mockUntrackedFile: FileStatus = {
    path: 'untracked-file.ts',
    status: 'untracked',
    staged: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the Changes card', () => {
      render(<CommitPanel {...defaultProps} files={[mockUnstagedFile]} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Changes')).toBeInTheDocument();
    });

    it('shows "No changes detected" when files array is empty', () => {
      render(<CommitPanel {...defaultProps} files={[]} />, { wrapper: createWrapper() });

      expect(screen.getByText('No changes detected')).toBeInTheDocument();
    });

    it('shows staged and unstaged sections when files exist', () => {
      render(<CommitPanel {...defaultProps} files={[mockUnstagedFile]} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/Staged/)).toBeInTheDocument();
      expect(screen.getByText(/Unstaged/)).toBeInTheDocument();
    });

    it('displays staged file count', () => {
      render(
        <CommitPanel {...defaultProps} files={[mockStagedFile, mockAddedFile]} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Staged (2)')).toBeInTheDocument();
    });

    it('displays unstaged file count', () => {
      render(
        <CommitPanel {...defaultProps} files={[mockUnstagedFile, mockDeletedFile]} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Unstaged (2)')).toBeInTheDocument();
    });

    it('shows commit message input', () => {
      render(<CommitPanel {...defaultProps} files={[mockStagedFile]} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByPlaceholderText('Enter commit message...')).toBeInTheDocument();
    });
  });

  describe('file status badges', () => {
    it('shows M badge for modified files', () => {
      render(<CommitPanel {...defaultProps} files={[mockStagedFile]} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('M')).toBeInTheDocument();
    });

    it('shows A badge for added files', () => {
      render(<CommitPanel {...defaultProps} files={[mockAddedFile]} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('shows D badge for deleted files', () => {
      render(<CommitPanel {...defaultProps} files={[mockDeletedFile]} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('D')).toBeInTheDocument();
    });

    it('shows ? badge for untracked files', () => {
      render(<CommitPanel {...defaultProps} files={[mockUntrackedFile]} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('shows R badge for renamed files', () => {
      const renamedFile: FileStatus = {
        path: 'renamed-file.ts',
        status: 'renamed',
        staged: true,
      };
      render(<CommitPanel {...defaultProps} files={[renamedFile]} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('R')).toBeInTheDocument();
    });
  });

  describe('file lists', () => {
    it('displays staged files in staged section', () => {
      render(<CommitPanel {...defaultProps} files={[mockStagedFile]} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('staged-file.ts')).toBeInTheDocument();
    });

    it('displays unstaged files in unstaged section', () => {
      render(<CommitPanel {...defaultProps} files={[mockUnstagedFile]} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('unstaged-file.ts')).toBeInTheDocument();
    });

    it('shows "No staged changes" when no staged files', () => {
      render(<CommitPanel {...defaultProps} files={[mockUnstagedFile]} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('No staged changes')).toBeInTheDocument();
    });

    it('shows "No unstaged changes" when no unstaged files', () => {
      render(<CommitPanel {...defaultProps} files={[mockStagedFile]} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('No unstaged changes')).toBeInTheDocument();
    });

    it('separates staged and unstaged files correctly', () => {
      const files = [mockStagedFile, mockUnstagedFile];
      render(<CommitPanel {...defaultProps} files={files} />, { wrapper: createWrapper() });

      expect(screen.getByText('staged-file.ts')).toBeInTheDocument();
      expect(screen.getByText('unstaged-file.ts')).toBeInTheDocument();
    });
  });

  describe('staging operations', () => {
    it('calls git_stage when staging a file', async () => {
      mockInvoke.mockResolvedValue(undefined);

      render(<CommitPanel {...defaultProps} files={[mockUnstagedFile]} />, {
        wrapper: createWrapper(),
      });

      // Find the unstaged file row and click its stage button
      const fileRow = screen.getByText('unstaged-file.ts').closest('div[class*="group"]');
      const stageButton = within(fileRow!).getByRole('button');
      await userEvent.click(stageButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('git_stage', {
          worktreePath: '/path/to/worktree',
          filePath: 'unstaged-file.ts',
        });
      });
    });

    it('shows error toast on staging failure', async () => {
      mockInvoke.mockRejectedValue(new Error('File not found'));

      render(<CommitPanel {...defaultProps} files={[mockUnstagedFile]} />, {
        wrapper: createWrapper(),
      });

      const fileRow = screen.getByText('unstaged-file.ts').closest('div[class*="group"]');
      const stageButton = within(fileRow!).getByRole('button');
      await userEvent.click(stageButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('Failed to stage'));
      });
    });
  });

  describe('unstaging operations', () => {
    it('calls git_unstage when unstaging a file', async () => {
      mockInvoke.mockResolvedValue(undefined);

      render(<CommitPanel {...defaultProps} files={[mockStagedFile]} />, {
        wrapper: createWrapper(),
      });

      // Find the staged file row and click its unstage button
      const fileRow = screen.getByText('staged-file.ts').closest('div[class*="group"]');
      const unstageButton = within(fileRow!).getByRole('button');
      await userEvent.click(unstageButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('git_unstage', {
          worktreePath: '/path/to/worktree',
          filePath: 'staged-file.ts',
        });
      });
    });

    it('shows error toast on unstaging failure', async () => {
      mockInvoke.mockRejectedValue(new Error('File not staged'));

      render(<CommitPanel {...defaultProps} files={[mockStagedFile]} />, {
        wrapper: createWrapper(),
      });

      const fileRow = screen.getByText('staged-file.ts').closest('div[class*="group"]');
      const unstageButton = within(fileRow!).getByRole('button');
      await userEvent.click(unstageButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('Failed to unstage'));
      });
    });
  });

  describe('stage all / unstage all', () => {
    it('shows Stage All button when unstaged files exist', () => {
      render(<CommitPanel {...defaultProps} files={[mockUnstagedFile]} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByRole('button', { name: /stage all/i })).toBeInTheDocument();
    });

    it('does not show Stage All button when no unstaged files', () => {
      render(<CommitPanel {...defaultProps} files={[mockStagedFile]} />, {
        wrapper: createWrapper(),
      });

      expect(screen.queryByRole('button', { name: /^stage all$/i })).not.toBeInTheDocument();
    });

    it('shows Unstage All button when staged files exist', () => {
      render(<CommitPanel {...defaultProps} files={[mockStagedFile]} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByRole('button', { name: /unstage all/i })).toBeInTheDocument();
    });

    it('does not show Unstage All button when no staged files', () => {
      render(<CommitPanel {...defaultProps} files={[mockUnstagedFile]} />, {
        wrapper: createWrapper(),
      });

      expect(screen.queryByRole('button', { name: /unstage all/i })).not.toBeInTheDocument();
    });

    it('stages all files when Stage All is clicked', async () => {
      const files = [
        { ...mockUnstagedFile, path: 'file1.ts' },
        { ...mockUnstagedFile, path: 'file2.ts' },
      ];
      mockInvoke.mockResolvedValue(undefined);

      render(<CommitPanel {...defaultProps} files={files} />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByRole('button', { name: /stage all/i }));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('git_stage', {
          worktreePath: '/path/to/worktree',
          filePath: 'file1.ts',
        });
        expect(mockInvoke).toHaveBeenCalledWith('git_stage', {
          worktreePath: '/path/to/worktree',
          filePath: 'file2.ts',
        });
      });
    });

    it('shows success toast after staging all', async () => {
      mockInvoke.mockResolvedValue(undefined);

      render(<CommitPanel {...defaultProps} files={[mockUnstagedFile]} />, {
        wrapper: createWrapper(),
      });

      await userEvent.click(screen.getByRole('button', { name: /stage all/i }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('All files staged');
      });
    });

    it('unstages all files when Unstage All is clicked', async () => {
      const files = [
        { ...mockStagedFile, path: 'file1.ts' },
        { ...mockStagedFile, path: 'file2.ts' },
      ];
      mockInvoke.mockResolvedValue(undefined);

      render(<CommitPanel {...defaultProps} files={files} />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByRole('button', { name: /unstage all/i }));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('git_unstage', {
          worktreePath: '/path/to/worktree',
          filePath: 'file1.ts',
        });
        expect(mockInvoke).toHaveBeenCalledWith('git_unstage', {
          worktreePath: '/path/to/worktree',
          filePath: 'file2.ts',
        });
      });
    });

    it('shows success toast after unstaging all', async () => {
      mockInvoke.mockResolvedValue(undefined);

      render(<CommitPanel {...defaultProps} files={[mockStagedFile]} />, {
        wrapper: createWrapper(),
      });

      await userEvent.click(screen.getByRole('button', { name: /unstage all/i }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('All files unstaged');
      });
    });
  });

  describe('commit operations', () => {
    it('allows typing in commit message input', async () => {
      render(<CommitPanel {...defaultProps} files={[mockStagedFile]} />, {
        wrapper: createWrapper(),
      });

      const input = screen.getByPlaceholderText('Enter commit message...');
      await userEvent.type(input, 'Test commit message');

      expect(input).toHaveValue('Test commit message');
    });

    it('disables commit button when no staged files', () => {
      render(<CommitPanel {...defaultProps} files={[mockUnstagedFile]} />, {
        wrapper: createWrapper(),
      });

      // Find the commit button by its containing the Send icon in the commit form area
      const commitForm = screen.getByPlaceholderText('Enter commit message...').parentElement;
      const commitButton = within(commitForm!).getByRole('button');
      expect(commitButton).toBeDisabled();
    });

    it('disables commit button when message is empty', () => {
      render(<CommitPanel {...defaultProps} files={[mockStagedFile]} />, {
        wrapper: createWrapper(),
      });

      const buttons = screen.getAllByRole('button');
      const commitButton = buttons.find(
        (btn) => btn.querySelector('svg.lucide-send') || btn.getAttribute('aria-label')?.includes('commit')
      );
      expect(commitButton).toBeDisabled();
    });

    it('shows error toast when committing with empty message', async () => {
      render(<CommitPanel {...defaultProps} files={[mockStagedFile]} />, {
        wrapper: createWrapper(),
      });

      const input = screen.getByPlaceholderText('Enter commit message...');
      // Trigger Enter without message
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Commit message is required');
      });
    });

    it('shows error toast when committing with no staged files', async () => {
      render(<CommitPanel {...defaultProps} files={[mockUnstagedFile]} />, {
        wrapper: createWrapper(),
      });

      const input = screen.getByPlaceholderText('Enter commit message...');
      await userEvent.type(input, 'Test message');
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('No files staged for commit');
      });
    });

    it('calls git_commit with correct parameters on Enter', async () => {
      mockInvoke.mockResolvedValue('[main abc123] Test commit');

      render(<CommitPanel {...defaultProps} files={[mockStagedFile]} />, {
        wrapper: createWrapper(),
      });

      const input = screen.getByPlaceholderText('Enter commit message...');
      await userEvent.type(input, 'Test commit message');
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('git_commit', {
          worktreePath: '/path/to/worktree',
          message: 'Test commit message',
        });
      });
    });

    it('shows success toast on successful commit', async () => {
      mockInvoke.mockResolvedValue('[main abc123] Test commit');

      render(<CommitPanel {...defaultProps} files={[mockStagedFile]} />, {
        wrapper: createWrapper(),
      });

      const input = screen.getByPlaceholderText('Enter commit message...');
      await userEvent.type(input, 'Test commit');
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Commit created successfully');
      });
    });

    it('clears commit message after successful commit', async () => {
      mockInvoke.mockResolvedValue('[main abc123] Test commit');

      render(<CommitPanel {...defaultProps} files={[mockStagedFile]} />, {
        wrapper: createWrapper(),
      });

      const input = screen.getByPlaceholderText('Enter commit message...');
      await userEvent.type(input, 'Test commit');
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('shows error toast on commit failure', async () => {
      mockInvoke.mockRejectedValue(new Error('Nothing to commit'));

      render(<CommitPanel {...defaultProps} files={[mockStagedFile]} />, {
        wrapper: createWrapper(),
      });

      const input = screen.getByPlaceholderText('Enter commit message...');
      await userEvent.type(input, 'Test commit');
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('Commit failed'));
      });
    });

    it('does not commit on Shift+Enter', async () => {
      render(<CommitPanel {...defaultProps} files={[mockStagedFile]} />, {
        wrapper: createWrapper(),
      });

      const input = screen.getByPlaceholderText('Enter commit message...');
      await userEvent.type(input, 'Test commit');
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

      expect(mockInvoke).not.toHaveBeenCalledWith('git_commit', expect.anything());
    });

    it('trims whitespace from commit message', async () => {
      mockInvoke.mockResolvedValue('Committed');

      render(<CommitPanel {...defaultProps} files={[mockStagedFile]} />, {
        wrapper: createWrapper(),
      });

      const input = screen.getByPlaceholderText('Enter commit message...');
      await userEvent.type(input, '  Test commit  ');
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('git_commit', {
          worktreePath: '/path/to/worktree',
          message: 'Test commit',
        });
      });
    });
  });

  describe('file path display', () => {
    it('displays full file path', () => {
      const fileWithPath: FileStatus = {
        path: 'src/components/test.tsx',
        status: 'modified',
        staged: false,
      };
      render(<CommitPanel {...defaultProps} files={[fileWithPath]} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('src/components/test.tsx')).toBeInTheDocument();
    });

    it('shows path as title attribute for truncated paths', () => {
      const fileWithLongPath: FileStatus = {
        path: 'very/long/path/to/some/deeply/nested/file.tsx',
        status: 'modified',
        staged: false,
      };
      render(<CommitPanel {...defaultProps} files={[fileWithLongPath]} />, {
        wrapper: createWrapper(),
      });

      const fileSpan = screen.getByTitle('very/long/path/to/some/deeply/nested/file.tsx');
      expect(fileSpan).toBeInTheDocument();
    });
  });

  describe('loading states', () => {
    it('disables input while committing', async () => {
      let resolvePromise: (value: string) => void;
      const promise = new Promise<string>((resolve) => {
        resolvePromise = resolve;
      });
      mockInvoke.mockReturnValue(promise);

      render(<CommitPanel {...defaultProps} files={[mockStagedFile]} />, {
        wrapper: createWrapper(),
      });

      const input = screen.getByPlaceholderText('Enter commit message...');
      await userEvent.type(input, 'Test commit');
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(input).toBeDisabled();
      });

      resolvePromise!('Done');
    });
  });
});
