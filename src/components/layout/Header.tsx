import { GitBranch, FolderOpen, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { selectRepository } from '@/lib/tauri';
import { useAppStore } from '@/stores/appStore';

export function Header() {
  const queryClient = useQueryClient();
  const { currentRepo, setCurrentRepo, addRecentRepo } = useAppStore();

  const handleOpenRepository = async () => {
    try {
      const repo = await selectRepository();
      if (repo) {
        setCurrentRepo(repo);
        addRecentRepo(repo.path);
      }
    } catch (error) {
      console.error('Failed to open repository:', error);
    }
  };

  const handleRefresh = () => {
    if (currentRepo) {
      queryClient.invalidateQueries({ queryKey: ['worktrees', currentRepo.path] });
      queryClient.invalidateQueries({ queryKey: ['branches', currentRepo.path] });
    }
  };

  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <GitBranch className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-semibold">Git Worktree Manager</h1>
        {currentRepo && (
          <span className="text-sm text-muted-foreground">
            — {currentRepo.name}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {currentRepo && (
          <Button variant="ghost" size="icon" onClick={handleRefresh} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleOpenRepository}>
          <FolderOpen className="mr-2 h-4 w-4" />
          Open Repository
        </Button>
      </div>
    </header>
  );
}
