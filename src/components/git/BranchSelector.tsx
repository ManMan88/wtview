import { useState } from 'react';
import { GitBranch, Loader2, Cloud, HardDrive } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBranches, useCheckoutBranch } from '@/hooks/useBranches';

interface BranchSelectorProps {
  worktreePath: string;
  repoPath: string;
  currentBranch: string | null;
}

export function BranchSelector({ worktreePath, repoPath, currentBranch }: BranchSelectorProps) {
  const [selectedBranch, setSelectedBranch] = useState<string>('');

  const { data: branches, isLoading: branchesLoading } = useBranches(repoPath);
  const checkoutMutation = useCheckoutBranch();

  const localBranches = branches?.filter((b) => !b.is_remote) ?? [];
  const remoteBranches = branches?.filter((b) => b.is_remote) ?? [];

  const handleCheckout = async () => {
    if (!selectedBranch) {
      toast.error('Please select a branch');
      return;
    }

    if (selectedBranch === currentBranch) {
      toast.info('Already on this branch');
      return;
    }

    try {
      await checkoutMutation.mutateAsync({
        worktreePath,
        branch: selectedBranch,
        repoPath,
      });
      toast.success(`Switched to branch: ${selectedBranch}`);
      setSelectedBranch('');
    } catch (error) {
      toast.error(`Checkout failed: ${error}`);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="h-4 w-4" />
          Branch
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Current:</span>
          <span className="font-medium">{currentBranch ?? 'Detached HEAD'}</span>
        </div>

        <div className="flex gap-2">
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Switch to branch..." />
            </SelectTrigger>
            <SelectContent>
              {branchesLoading ? (
                <div className="flex items-center justify-center p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <>
                  {localBranches.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        Local
                      </SelectLabel>
                      {localBranches.map((branch) => (
                        <SelectItem
                          key={branch.name}
                          value={branch.name}
                          disabled={branch.is_current}
                        >
                          {branch.name}
                          {branch.is_current && (
                            <span className="ml-2 text-xs text-muted-foreground">(current)</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {remoteBranches.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="flex items-center gap-1">
                        <Cloud className="h-3 w-3" />
                        Remote
                      </SelectLabel>
                      {remoteBranches.map((branch) => (
                        <SelectItem key={branch.name} value={branch.name}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </>
              )}
            </SelectContent>
          </Select>

          <Button
            onClick={handleCheckout}
            disabled={!selectedBranch || checkoutMutation.isPending}
          >
            {checkoutMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Checkout'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
