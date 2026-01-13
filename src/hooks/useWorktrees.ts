import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  listWorktrees,
  addWorktree,
  removeWorktree,
  lockWorktree,
  unlockWorktree,
} from '@/lib/tauri';
import type { WorktreeInfo } from '@/lib/tauri';

export function useWorktrees(repoPath: string | null) {
  return useQuery({
    queryKey: ['worktrees', repoPath],
    queryFn: () => listWorktrees(repoPath!),
    enabled: !!repoPath,
  });
}

interface AddWorktreeParams {
  repoPath: string;
  worktreePath: string;
  branch: string;
  createBranch: boolean;
}

export function useAddWorktree() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ repoPath, worktreePath, branch, createBranch }: AddWorktreeParams) =>
      addWorktree(repoPath, worktreePath, branch, createBranch),
    onSuccess: (_, { repoPath }) => {
      queryClient.invalidateQueries({ queryKey: ['worktrees', repoPath] });
      queryClient.invalidateQueries({ queryKey: ['branches', repoPath] });
    },
  });
}

interface RemoveWorktreeParams {
  repoPath: string;
  worktreePath: string;
  force: boolean;
}

export function useRemoveWorktree() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ repoPath, worktreePath, force }: RemoveWorktreeParams) =>
      removeWorktree(repoPath, worktreePath, force),
    onSuccess: (_, { repoPath }) => {
      queryClient.invalidateQueries({ queryKey: ['worktrees', repoPath] });
    },
  });
}

interface LockWorktreeParams {
  repoPath: string;
  worktreePath: string;
  reason?: string;
}

export function useLockWorktree() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ repoPath, worktreePath, reason }: LockWorktreeParams) =>
      lockWorktree(repoPath, worktreePath, reason),
    onSuccess: (_, { repoPath }) => {
      queryClient.invalidateQueries({ queryKey: ['worktrees', repoPath] });
    },
  });
}

interface UnlockWorktreeParams {
  repoPath: string;
  worktreePath: string;
}

export function useUnlockWorktree() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ repoPath, worktreePath }: UnlockWorktreeParams) =>
      unlockWorktree(repoPath, worktreePath),
    onSuccess: (_, { repoPath }) => {
      queryClient.invalidateQueries({ queryKey: ['worktrees', repoPath] });
    },
  });
}

export type { WorktreeInfo };
