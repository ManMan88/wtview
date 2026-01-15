import { GitBranch, FolderOpen, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { selectRepository } from '@/lib/tauri';
import { useAppStore } from '@/stores/appStore';
import { ThemeToggle } from './ThemeToggle';

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
    <header className="flex items-center justify-between border-b border-border bg-card/50 px-5 py-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <GitBranch className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight">Git Worktree Manager</h1>
          {currentRepo && (
            <p className="text-xs text-muted-foreground">{currentRepo.name}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {currentRepo && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            title="Refresh"
            className="h-9 w-9 rounded-lg transition-colors hover:bg-accent"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
        <ThemeToggle />
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenRepository}
          className="h-9 rounded-lg border-border px-4 font-medium transition-all hover:border-primary hover:bg-primary/5"
        >
          <FolderOpen className="mr-2 h-4 w-4" />
          Open Repository
        </Button>
      </div>
    </header>
  );
}
