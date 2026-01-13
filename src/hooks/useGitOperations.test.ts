import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import {
  useGitStatus,
  useGitFetch,
  useGitPull,
  useGitPush,
  useGitCommit,
  useGitStage,
  useGitUnstage,
} from './useGitOperations';
import { createQueryWrapper } from '@/test/test-utils';
import type { GitStatusResult } from '@/lib/tauri';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

describe('useGitOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useGitStatus hook', () => {
    it('fetches status when worktreePath is provided', async () => {
      const mockStatus: GitStatusResult = {
        branch: 'main',
        files: [
          { path: 'file.ts', status: 'modified', staged: false },
        ],
        ahead: 1,
        behind: 0,
      };
      mockInvoke.mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useGitStatus('/worktree'), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockInvoke).toHaveBeenCalledWith('git_status', { worktreePath: '/worktree' });
      expect(result.current.data).toEqual(mockStatus);
    });

    it('does not fetch when worktreePath is null', () => {
      const { result } = renderHook(() => useGitStatus(null), {
        wrapper: createQueryWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('handles clean repository', async () => {
      const mockStatus: GitStatusResult = {
        branch: 'main',
        files: [],
        ahead: 0,
        behind: 0,
      };
      mockInvoke.mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useGitStatus('/clean-repo'), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.files).toHaveLength(0);
    });

    it('handles detached HEAD', async () => {
      const mockStatus: GitStatusResult = {
        branch: null,
        files: [],
        ahead: 0,
        behind: 0,
      };
      mockInvoke.mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useGitStatus('/detached-repo'), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.branch).toBeNull();
    });

    it('handles fetch errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Not a git repository'));

      const { result } = renderHook(() => useGitStatus('/invalid'), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(new Error('Not a git repository'));
    });
  });

  describe('useGitFetch hook', () => {
    it('calls gitFetch with correct parameters', async () => {
      mockInvoke.mockResolvedValue('Fetched from origin');

      const { result } = renderHook(() => useGitFetch(), {
        wrapper: createQueryWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          worktreePath: '/worktree',
          repoPath: '/repo',
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('git_fetch', { worktreePath: '/worktree' });
    });

    it('handles fetch errors', async () => {
      mockInvoke.mockRejectedValue(new Error('No remote configured'));

      const { result } = renderHook(() => useGitFetch(), {
        wrapper: createQueryWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          worktreePath: '/worktree',
          repoPath: '/repo',
        })
      ).rejects.toThrow('No remote configured');
    });
  });

  describe('useGitPull hook', () => {
    it('calls gitPull with correct parameters', async () => {
      mockInvoke.mockResolvedValue('Already up to date.');

      const { result } = renderHook(() => useGitPull(), {
        wrapper: createQueryWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          worktreePath: '/worktree',
          repoPath: '/repo',
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('git_pull', { worktreePath: '/worktree' });
    });

    it('handles pull errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Merge conflict'));

      const { result } = renderHook(() => useGitPull(), {
        wrapper: createQueryWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          worktreePath: '/worktree',
          repoPath: '/repo',
        })
      ).rejects.toThrow('Merge conflict');
    });
  });

  describe('useGitPush hook', () => {
    it('calls gitPush with correct parameters', async () => {
      mockInvoke.mockResolvedValue('Pushed to origin/main');

      const { result } = renderHook(() => useGitPush(), {
        wrapper: createQueryWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          worktreePath: '/worktree',
          repoPath: '/repo',
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('git_push', { worktreePath: '/worktree' });
    });

    it('handles push errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Push rejected'));

      const { result } = renderHook(() => useGitPush(), {
        wrapper: createQueryWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          worktreePath: '/worktree',
          repoPath: '/repo',
        })
      ).rejects.toThrow('Push rejected');
    });
  });

  describe('useGitCommit hook', () => {
    it('calls gitCommit with correct parameters', async () => {
      mockInvoke.mockResolvedValue('[main abc1234] Test commit');

      const { result } = renderHook(() => useGitCommit(), {
        wrapper: createQueryWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          worktreePath: '/worktree',
          message: 'Test commit',
          repoPath: '/repo',
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('git_commit', {
        worktreePath: '/worktree',
        message: 'Test commit',
      });
    });

    it('handles multiline commit messages', async () => {
      const message = 'Title\n\nBody paragraph';
      mockInvoke.mockResolvedValue('Committed');

      const { result } = renderHook(() => useGitCommit(), {
        wrapper: createQueryWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          worktreePath: '/worktree',
          message,
          repoPath: '/repo',
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('git_commit', {
        worktreePath: '/worktree',
        message,
      });
    });

    it('handles commit errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Nothing to commit'));

      const { result } = renderHook(() => useGitCommit(), {
        wrapper: createQueryWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          worktreePath: '/worktree',
          message: 'Empty',
          repoPath: '/repo',
        })
      ).rejects.toThrow('Nothing to commit');
    });
  });

  describe('useGitStage hook', () => {
    it('calls gitStage with correct parameters', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useGitStage(), {
        wrapper: createQueryWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          worktreePath: '/worktree',
          filePath: 'file.ts',
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('git_stage', {
        worktreePath: '/worktree',
        filePath: 'file.ts',
      });
    });

    it('handles paths with spaces', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useGitStage(), {
        wrapper: createQueryWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          worktreePath: '/worktree',
          filePath: 'path with spaces/file.ts',
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('git_stage', {
        worktreePath: '/worktree',
        filePath: 'path with spaces/file.ts',
      });
    });

    it('handles stage errors', async () => {
      mockInvoke.mockRejectedValue(new Error('File not found'));

      const { result } = renderHook(() => useGitStage(), {
        wrapper: createQueryWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          worktreePath: '/worktree',
          filePath: 'nonexistent.ts',
        })
      ).rejects.toThrow('File not found');
    });
  });

  describe('useGitUnstage hook', () => {
    it('calls gitUnstage with correct parameters', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useGitUnstage(), {
        wrapper: createQueryWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          worktreePath: '/worktree',
          filePath: 'file.ts',
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('git_unstage', {
        worktreePath: '/worktree',
        filePath: 'file.ts',
      });
    });

    it('handles unstage errors', async () => {
      mockInvoke.mockRejectedValue(new Error('File not staged'));

      const { result } = renderHook(() => useGitUnstage(), {
        wrapper: createQueryWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          worktreePath: '/worktree',
          filePath: 'unstaged.ts',
        })
      ).rejects.toThrow('File not staged');
    });
  });
});
