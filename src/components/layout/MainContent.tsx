import { GitBranch, Folder, Lock, Unlock, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RemoteActions, CommitPanel, BranchSelector } from '@/components/git';
import { useAppStore } from '@/stores/appStore';
import { useWorktrees, useLockWorktree, useUnlockWorktree } from '@/hooks/useWorktrees';
import { useGitStatus } from '@/hooks/useGitOperations';
import { toast } from 'sonner';

interface MainContentProps {
  onDeleteWorktree: () => void;
}

export function MainContent({ onDeleteWorktree }: MainContentProps) {
  const { currentRepo, selectedWorktreePath } = useAppStore();
  const { data: worktrees } = useWorktrees(currentRepo?.path ?? null);
  const { data: status } = useGitStatus(selectedWorktreePath);
  const lockMutation = useLockWorktree();
  const unlockMutation = useUnlockWorktree();

  const selectedWorktree = worktrees?.find((wt) => wt.path === selectedWorktreePath);

  if (!currentRepo) {
    return (
      <main className="flex flex-1 items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <div className="animate-fade-in text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <GitBranch className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">No Repository Selected</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Click "Open Repository" to get started
          </p>
        </div>
      </main>
    );
  }

  if (!selectedWorktree) {
    return (
      <main className="flex flex-1 items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <div className="animate-fade-in text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Folder className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">No Worktree Selected</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Select a worktree from the sidebar
          </p>
        </div>
      </main>
    );
  }

  const handleLock = async () => {
    try {
      await lockMutation.mutateAsync({
        repoPath: currentRepo.path,
        worktreePath: selectedWorktree.path,
      });
      toast.success('Worktree locked');
    } catch (error) {
      toast.error(`Failed to lock worktree: ${error}`);
    }
  };

  const handleUnlock = async () => {
    try {
      await unlockMutation.mutateAsync({
        repoPath: currentRepo.path,
        worktreePath: selectedWorktree.path,
      });
      toast.success('Worktree unlocked');
    } catch (error) {
      toast.error(`Failed to unlock worktree: ${error}`);
    }
  };

  const stagedFiles = status?.files.filter((f) => f.staged) ?? [];
  const unstagedFiles = status?.files.filter((f) => !f.staged) ?? [];

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-b from-background to-muted/10 p-6">
      <div className="animate-fade-in">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <GitBranch className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  {selectedWorktree.branch ?? 'Detached HEAD'}
                </h2>
                <p className="font-mono text-xs text-muted-foreground">{selectedWorktree.path}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {selectedWorktree.is_locked ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnlock}
                disabled={unlockMutation.isPending}
                className="rounded-lg border-border transition-all hover:border-primary hover:bg-primary/5"
              >
                <Unlock className="mr-2 h-4 w-4" />
                Unlock
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLock}
                disabled={lockMutation.isPending}
                className="rounded-lg border-border transition-all hover:border-primary hover:bg-primary/5"
              >
                <Lock className="mr-2 h-4 w-4" />
                Lock
              </Button>
            )}
            {!selectedWorktree.is_main && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onDeleteWorktree}
                className="rounded-lg transition-all"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
        {/* Left Column - Status and Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Branch</span>
                  <span>{status?.branch ?? 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ahead</span>
                  <span>{status?.ahead ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Behind</span>
                  <span>{status?.behind ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Staged</span>
                  <span>{stagedFiles.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unstaged</span>
                  <span>{unstagedFiles.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Main Worktree</span>
                  <span>{selectedWorktree.is_main ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Locked</span>
                  <span>{selectedWorktree.is_locked ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <BranchSelector
            worktreePath={selectedWorktree.path}
            repoPath={currentRepo.path}
            currentBranch={status?.branch ?? null}
          />
        </div>

        {/* Right Column - Git Operations */}
        <div className="space-y-4">
          <RemoteActions
            worktreePath={selectedWorktree.path}
            repoPath={currentRepo.path}
            ahead={status?.ahead ?? 0}
            behind={status?.behind ?? 0}
          />

          <CommitPanel
            worktreePath={selectedWorktree.path}
            repoPath={currentRepo.path}
            files={status?.files ?? []}
          />
        </div>
        </div>
      </div>
    </main>
  );
}
