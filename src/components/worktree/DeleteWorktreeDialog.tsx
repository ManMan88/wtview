import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRemoveWorktree } from '@/hooks/useWorktrees';
import { useAppStore } from '@/stores/appStore';
import type { WorktreeInfo } from '@/lib/tauri';

interface DeleteWorktreeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worktree: WorktreeInfo | null;
  repoPath: string;
}

export function DeleteWorktreeDialog({
  open,
  onOpenChange,
  worktree,
  repoPath,
}: DeleteWorktreeDialogProps) {
  const [force, setForce] = useState(false);
  const removeWorktreeMutation = useRemoveWorktree();
  const selectWorktree = useAppStore((s) => s.selectWorktree);

  const handleClose = () => {
    setForce(false);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!worktree) return;

    try {
      await removeWorktreeMutation.mutateAsync({
        repoPath,
        worktreePath: worktree.path,
        force,
      });
      toast.success('Worktree deleted');
      selectWorktree(null);
      handleClose();
    } catch (error) {
      const errorStr = String(error);
      if (errorStr.includes('uncommitted') || errorStr.includes('untracked')) {
        toast.error('Worktree has uncommitted changes. Enable force delete to remove anyway.');
        setForce(true);
      } else {
        toast.error(`Failed to delete worktree: ${error}`);
      }
    }
  };

  const isDeleting = removeWorktreeMutation.isPending;

  if (!worktree) return null;

  const displayPath = worktree.path.split('/').pop() ?? worktree.path;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Worktree
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the worktree at{' '}
            <span className="font-mono font-medium">{displayPath}</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-muted p-3 text-sm">
            <p>
              <strong>Branch:</strong> {worktree.branch ?? 'detached HEAD'}
            </p>
            <p>
              <strong>Path:</strong> {worktree.path}
            </p>
          </div>

          {force && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
              <p className="text-sm text-destructive">
                Force delete is enabled. This will remove the worktree even if it has uncommitted
                changes. This action cannot be undone.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {force ? 'Force Delete' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
