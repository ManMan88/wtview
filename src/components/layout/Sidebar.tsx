import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { WorktreeList } from '@/components/worktree/WorktreeList';
import { useAppStore } from '@/stores/appStore';

interface SidebarProps {
  onAddWorktree: () => void;
}

export function Sidebar({ onAddWorktree }: SidebarProps) {
  const currentRepo = useAppStore((s) => s.currentRepo);

  return (
    <aside className="flex h-full w-72 flex-col border-r border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium">Worktrees</h2>
        {currentRepo && (
          <Button variant="ghost" size="icon" onClick={onAddWorktree} title="Add Worktree">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {currentRepo ? (
          <WorktreeList repoPath={currentRepo.path} />
        ) : (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            Open a repository to view worktrees
          </p>
        )}
      </div>
    </aside>
  );
}
