import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  gitFetch,
  gitPull,
  gitPush,
  gitStatus,
  gitCommit,
  gitStage,
  gitUnstage,
} from '@/lib/tauri';
import type { GitStatusResult } from '@/lib/tauri';

export function useGitStatus(worktreePath: string | null) {
  return useQuery({
    queryKey: ['status', worktreePath],
    queryFn: () => gitStatus(worktreePath!),
    enabled: !!worktreePath,
    refetchInterval: 5000,
  });
}

interface GitOperationParams {
  worktreePath: string;
  repoPath: string;
}

export function useGitFetch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ worktreePath }: GitOperationParams) => gitFetch(worktreePath),
    onSuccess: (_, { worktreePath, repoPath }) => {
      queryClient.invalidateQueries({ queryKey: ['status', worktreePath] });
      queryClient.invalidateQueries({ queryKey: ['worktrees', repoPath] });
    },
  });
}

export function useGitPull() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ worktreePath }: GitOperationParams) => gitPull(worktreePath),
    onSuccess: (_, { worktreePath, repoPath }) => {
      queryClient.invalidateQueries({ queryKey: ['status', worktreePath] });
      queryClient.invalidateQueries({ queryKey: ['worktrees', repoPath] });
    },
  });
}

export function useGitPush() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ worktreePath }: GitOperationParams) => gitPush(worktreePath),
    onSuccess: (_, { worktreePath, repoPath }) => {
      queryClient.invalidateQueries({ queryKey: ['status', worktreePath] });
      queryClient.invalidateQueries({ queryKey: ['worktrees', repoPath] });
    },
  });
}

interface CommitParams {
  worktreePath: string;
  message: string;
  repoPath: string;
}

export function useGitCommit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ worktreePath, message }: CommitParams) => gitCommit(worktreePath, message),
    onSuccess: (_, { worktreePath, repoPath }) => {
      queryClient.invalidateQueries({ queryKey: ['status', worktreePath] });
      queryClient.invalidateQueries({ queryKey: ['worktrees', repoPath] });
    },
  });
}

interface StageParams {
  worktreePath: string;
  filePath: string;
}

export function useGitStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ worktreePath, filePath }: StageParams) => gitStage(worktreePath, filePath),
    onSuccess: (_, { worktreePath }) => {
      queryClient.invalidateQueries({ queryKey: ['status', worktreePath] });
    },
  });
}

export function useGitUnstage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ worktreePath, filePath }: StageParams) => gitUnstage(worktreePath, filePath),
    onSuccess: (_, { worktreePath }) => {
      queryClient.invalidateQueries({ queryKey: ['status', worktreePath] });
    },
  });
}

export type { GitStatusResult };
