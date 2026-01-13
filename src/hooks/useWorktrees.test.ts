import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import {
  useWorktrees,
  useAddWorktree,
  useRemoveWorktree,
  useLockWorktree,
  useUnlockWorktree,
} from './useWorktrees';
import { createQueryWrapper } from '@/test/test-utils';
import type { WorktreeInfo } from '@/lib/tauri';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

describe('useWorktrees', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useWorktrees hook', () => {
    it('fetches worktrees when repoPath is provided', async () => {
      const mockWorktrees: WorktreeInfo[] = [
        { path: '/repo', branch: 'main', is_main: true, is_locked: false },
        { path: '/repo-feature', branch: 'feature', is_main: false, is_locked: false },
      ];
      mockInvoke.mockResolvedValue(mockWorktrees);

      const { result } = renderHook(() => useWorktrees('/repo'), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockInvoke).toHaveBeenCalledWith('list_worktrees', { repoPath: '/repo' });
      expect(result.current.data).toEqual(mockWorktrees);
    });

    it('does not fetch when repoPath is null', () => {
      const { result } = renderHook(() => useWorktrees(null), {
        wrapper: createQueryWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('handles fetch errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Repository not found'));

      const { result } = renderHook(() => useWorktrees('/invalid'), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(new Error('Repository not found'));
    });

    it('returns empty array for repo with no worktrees', async () => {
      mockInvoke.mockResolvedValue([]);

      const { result } = renderHook(() => useWorktrees('/empty-repo'), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useAddWorktree hook', () => {
    it('calls addWorktree with correct parameters', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAddWorktree(), {
        wrapper: createQueryWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          repoPath: '/repo',
          worktreePath: '/repo-feature',
          branch: 'feature',
          createBranch: true,
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('add_worktree', {
        repoPath: '/repo',
        worktreePath: '/repo-feature',
        branch: 'feature',
        createBranch: true,
      });
    });

    it('handles add worktree errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Branch already exists'));

      const { result } = renderHook(() => useAddWorktree(), {
        wrapper: createQueryWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          repoPath: '/repo',
          worktreePath: '/path',
          branch: 'existing',
          createBranch: true,
        })
      ).rejects.toThrow('Branch already exists');
    });
  });

  describe('useRemoveWorktree hook', () => {
    it('calls removeWorktree with force=false', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useRemoveWorktree(), {
        wrapper: createQueryWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          repoPath: '/repo',
          worktreePath: '/repo-feature',
          force: false,
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('remove_worktree', {
        repoPath: '/repo',
        worktreePath: '/repo-feature',
        force: false,
      });
    });

    it('calls removeWorktree with force=true', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useRemoveWorktree(), {
        wrapper: createQueryWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          repoPath: '/repo',
          worktreePath: '/repo-feature',
          force: true,
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('remove_worktree', {
        repoPath: '/repo',
        worktreePath: '/repo-feature',
        force: true,
      });
    });

    it('handles remove worktree errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Worktree has uncommitted changes'));

      const { result } = renderHook(() => useRemoveWorktree(), {
        wrapper: createQueryWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          repoPath: '/repo',
          worktreePath: '/path',
          force: false,
        })
      ).rejects.toThrow('Worktree has uncommitted changes');
    });
  });

  describe('useLockWorktree hook', () => {
    it('calls lockWorktree without reason', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLockWorktree(), {
        wrapper: createQueryWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          repoPath: '/repo',
          worktreePath: '/repo-feature',
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('lock_worktree', {
        repoPath: '/repo',
        worktreePath: '/repo-feature',
        reason: undefined,
      });
    });

    it('calls lockWorktree with reason', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLockWorktree(), {
        wrapper: createQueryWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          repoPath: '/repo',
          worktreePath: '/repo-feature',
          reason: 'Work in progress',
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('lock_worktree', {
        repoPath: '/repo',
        worktreePath: '/repo-feature',
        reason: 'Work in progress',
      });
    });

    it('handles lock errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Worktree already locked'));

      const { result } = renderHook(() => useLockWorktree(), {
        wrapper: createQueryWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          repoPath: '/repo',
          worktreePath: '/locked-wt',
        })
      ).rejects.toThrow('Worktree already locked');
    });
  });

  describe('useUnlockWorktree hook', () => {
    it('calls unlockWorktree with correct parameters', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useUnlockWorktree(), {
        wrapper: createQueryWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          repoPath: '/repo',
          worktreePath: '/repo-feature',
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('unlock_worktree', {
        repoPath: '/repo',
        worktreePath: '/repo-feature',
      });
    });

    it('handles unlock errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Worktree not locked'));

      const { result } = renderHook(() => useUnlockWorktree(), {
        wrapper: createQueryWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          repoPath: '/repo',
          worktreePath: '/unlocked-wt',
        })
      ).rejects.toThrow('Worktree not locked');
    });
  });
});
