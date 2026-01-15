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
        'flex w-full flex-col gap-1.5 rounded-xl px-3 py-2.5 text-left transition-all duration-200',
        'hover:bg-accent/80 hover:shadow-sm',
        isSelected
          ? 'border border-primary/50 bg-primary/10 shadow-sm'
          : 'border border-transparent'
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-md transition-colors',
            isSelected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
          )}
        >
          <GitBranch className="h-3.5 w-3.5" />
        </div>
        <span className="truncate text-sm font-medium">{displayBranch}</span>
        <div className="ml-auto flex items-center gap-1">
          {worktree.is_main && (
            <span
              title="Main worktree"
              className="flex h-5 items-center rounded-full bg-primary/10 px-1.5 text-[10px] font-medium text-primary"
            >
              <Home className="mr-0.5 h-3 w-3" />
              Main
            </span>
          )}
          {worktree.is_locked && (
            <span
              title="Locked"
              className="flex h-5 w-5 items-center justify-center rounded-full bg-warning/10"
            >
              <Lock className="h-3 w-3 text-warning" />
            </span>
          )}
        </div>
      </div>
      <span className="truncate pl-8 font-mono text-xs text-muted-foreground">
        {displayPath}
      </span>
    </button>
  );
}
