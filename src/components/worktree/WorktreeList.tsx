import { AlertCircle, Loader2 } from 'lucide-react';

import { WorktreeCard } from './WorktreeCard';
import { useWorktrees } from '@/hooks/useWorktrees';
import { useAppStore } from '@/stores/appStore';

interface WorktreeListProps {
  repoPath: string;
}

export function WorktreeList({ repoPath }: WorktreeListProps) {
  const { data: worktrees, isLoading, error } = useWorktrees(repoPath);
  const { selectedWorktreePath, selectWorktree } = useAppStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p className="text-sm text-destructive">Failed to load worktrees</p>
      </div>
    );
  }

  if (!worktrees || worktrees.length === 0) {
    return (
      <p className="px-2 py-4 text-center text-sm text-muted-foreground">
        No worktrees found
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {worktrees.map((worktree) => (
        <WorktreeCard
          key={worktree.path}
          worktree={worktree}
          isSelected={worktree.path === selectedWorktreePath}
          onSelect={() => selectWorktree(worktree.path)}
        />
      ))}
    </div>
  );
}
