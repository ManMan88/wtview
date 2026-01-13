import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { listBranches, checkoutBranch } from '@/lib/tauri';
import type { BranchInfo } from '@/lib/tauri';

export function useBranches(repoPath: string | null) {
  return useQuery({
    queryKey: ['branches', repoPath],
    queryFn: () => listBranches(repoPath!),
    enabled: !!repoPath,
  });
}

interface CheckoutBranchParams {
  worktreePath: string;
  branch: string;
  repoPath: string;
}

export function useCheckoutBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ worktreePath, branch }: CheckoutBranchParams) =>
      checkoutBranch(worktreePath, branch),
    onSuccess: (_, { repoPath }) => {
      queryClient.invalidateQueries({ queryKey: ['worktrees', repoPath] });
      queryClient.invalidateQueries({ queryKey: ['status'] });
    },
  });
}

export type { BranchInfo };
