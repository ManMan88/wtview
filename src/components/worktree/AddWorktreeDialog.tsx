import { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBranches } from '@/hooks/useBranches';
import { useAddWorktree } from '@/hooks/useWorktrees';

interface AddWorktreeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repoPath: string;
}

type BranchMode = 'existing' | 'new';

export function AddWorktreeDialog({ open, onOpenChange, repoPath }: AddWorktreeDialogProps) {
  const [branchMode, setBranchMode] = useState<BranchMode>('existing');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [worktreePath, setWorktreePath] = useState('');

  const { data: branches, isLoading: branchesLoading } = useBranches(repoPath);
  const addWorktreeMutation = useAddWorktree();

  const localBranches = useMemo(
    () => branches?.filter((b) => !b.is_remote) ?? [],
    [branches]
  );

  const resetForm = () => {
    setBranchMode('existing');
    setSelectedBranch('');
    setNewBranchName('');
    setWorktreePath('');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const branch = branchMode === 'new' ? newBranchName : selectedBranch;
    if (!branch || !worktreePath) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await addWorktreeMutation.mutateAsync({
        repoPath,
        worktreePath,
        branch,
        createBranch: branchMode === 'new',
      });
      toast.success(`Worktree created at ${worktreePath}`);
      handleClose();
    } catch (error) {
      toast.error(`Failed to create worktree: ${error}`);
    }
  };

  const isSubmitting = addWorktreeMutation.isPending;
  const isValid =
    worktreePath.trim() !== '' &&
    (branchMode === 'new' ? newBranchName.trim() !== '' : selectedBranch !== '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Worktree</DialogTitle>
          <DialogDescription>Create a new git worktree with an existing or new branch.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="worktree-path">Worktree Path</Label>
            <Input
              id="worktree-path"
              placeholder="/path/to/worktree"
              value={worktreePath}
              onChange={(e) => setWorktreePath(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label>Branch</Label>
            <Select
              value={branchMode}
              onValueChange={(value) => setBranchMode(value as BranchMode)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="existing">Use existing branch</SelectItem>
                <SelectItem value="new">Create new branch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {branchMode === 'existing' ? (
            <div className="space-y-2">
              <Label htmlFor="existing-branch">Select Branch</Label>
              {branchesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <Select
                  value={selectedBranch}
                  onValueChange={setSelectedBranch}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="existing-branch">
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {localBranches.map((branch) => (
                      <SelectItem key={branch.name} value={branch.name}>
                        {branch.name}
                        {branch.is_current && ' (current)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="new-branch">New Branch Name</Label>
              <Input
                id="new-branch"
                placeholder="feature/my-feature"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isValid}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Worktree
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
