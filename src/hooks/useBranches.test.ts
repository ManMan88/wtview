import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import { useBranches, useCheckoutBranch } from './useBranches';
import { createQueryWrapper } from '@/test/test-utils';
import type { BranchInfo } from '@/lib/tauri';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

describe('useBranches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useBranches hook', () => {
    it('fetches branches when repoPath is provided', async () => {
      const mockBranches: BranchInfo[] = [
        { name: 'main', is_remote: false, is_current: true },
        { name: 'feature', is_remote: false, is_current: false },
        { name: 'origin/main', is_remote: true, is_current: false },
      ];
      mockInvoke.mockResolvedValue(mockBranches);

      const { result } = renderHook(() => useBranches('/repo'), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockInvoke).toHaveBeenCalledWith('list_branches', { repoPath: '/repo' });
      expect(result.current.data).toEqual(mockBranches);
    });

    it('does not fetch when repoPath is null', () => {
      const { result } = renderHook(() => useBranches(null), {
        wrapper: createQueryWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('handles fetch errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Repository not found'));

      const { result } = renderHook(() => useBranches('/invalid'), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(new Error('Repository not found'));
    });

    it('returns empty array for repo with no branches', async () => {
      mockInvoke.mockResolvedValue([]);

      const { result } = renderHook(() => useBranches('/empty-repo'), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it('returns branches with correct properties', async () => {
      const mockBranches: BranchInfo[] = [
        { name: 'main', is_remote: false, is_current: true },
        { name: 'origin/main', is_remote: true, is_current: false },
      ];
      mockInvoke.mockResolvedValue(mockBranches);

      const { result } = renderHook(() => useBranches('/repo'), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const localBranch = result.current.data?.find((b) => !b.is_remote);
      const remoteBranch = result.current.data?.find((b) => b.is_remote);

      expect(localBranch?.name).toBe('main');
      expect(localBranch?.is_current).toBe(true);
      expect(remoteBranch?.name).toBe('origin/main');
      expect(remoteBranch?.is_current).toBe(false);
    });
  });

  describe('useCheckoutBranch hook', () => {
    it('calls checkoutBranch with correct parameters', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useCheckoutBranch(), {
        wrapper: createQueryWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          worktreePath: '/worktree',
          branch: 'feature',
          repoPath: '/repo',
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('checkout_branch', {
        worktreePath: '/worktree',
        branch: 'feature',
      });
    });

    it('handles branch names with slashes', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useCheckoutBranch(), {
        wrapper: createQueryWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          worktreePath: '/worktree',
          branch: 'feature/my-feature',
          repoPath: '/repo',
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('checkout_branch', {
        worktreePath: '/worktree',
        branch: 'feature/my-feature',
      });
    });

    it('handles checkout errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Branch not found'));

      const { result } = renderHook(() => useCheckoutBranch(), {
        wrapper: createQueryWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          worktreePath: '/worktree',
          branch: 'nonexistent',
          repoPath: '/repo',
        })
      ).rejects.toThrow('Branch not found');
    });

    it('handles checkout with uncommitted changes error', async () => {
      mockInvoke.mockRejectedValue(new Error('Uncommitted changes would be overwritten'));

      const { result } = renderHook(() => useCheckoutBranch(), {
        wrapper: createQueryWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          worktreePath: '/worktree',
          branch: 'other-branch',
          repoPath: '/repo',
        })
      ).rejects.toThrow('Uncommitted changes would be overwritten');
    });
  });
});
