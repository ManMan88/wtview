import { Plus, GitFork } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { WorktreeList } from '@/components/worktree/WorktreeList';
import { useAppStore } from '@/stores/appStore';

interface SidebarProps {
  onAddWorktree: () => void;
}

export function Sidebar({ onAddWorktree }: SidebarProps) {
  const currentRepo = useAppStore((s) => s.currentRepo);

  return (
    <aside className="flex h-full w-72 flex-col border-r border-border bg-card/30">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium tracking-tight text-foreground/80">Worktrees</h2>
        {currentRepo && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onAddWorktree}
            title="Add Worktree"
            className="h-8 w-8 rounded-lg transition-all hover:bg-primary/10 hover:text-primary"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {currentRepo ? (
          <WorktreeList repoPath={currentRepo.path} />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <GitFork className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground/70">No repository</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Open a repository to view worktrees
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
