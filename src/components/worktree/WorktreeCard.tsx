import { GitBranch, Lock, Home } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { WorktreeInfo } from '@/lib/tauri';

interface WorktreeCardProps {
  worktree: WorktreeInfo;
  isSelected: boolean;
  onSelect: () => void;
}

export function WorktreeCard({ worktree, isSelected, onSelect }: WorktreeCardProps) {
  const displayBranch = worktree.branch ?? 'detached HEAD';
  const displayPath = worktree.path.split('/').pop() ?? worktree.path;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full flex-col gap-1 rounded-md px-3 py-2 text-left transition-colors',
        'hover:bg-accent',
        isSelected && 'bg-accent border border-primary'
      )}
    >
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-muted-foreground" />
        <span className="truncate text-sm font-medium">{displayBranch}</span>
        {worktree.is_main && (
          <span title="Main worktree">
            <Home className="h-3 w-3 text-muted-foreground" />
          </span>
        )}
        {worktree.is_locked && (
          <span title="Locked">
            <Lock className="h-3 w-3 text-muted-foreground" />
          </span>
        )}
      </div>
      <span className="truncate text-xs text-muted-foreground">{displayPath}</span>
    </button>
  );
}
