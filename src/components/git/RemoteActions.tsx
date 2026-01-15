import { useState } from 'react';
import { Download, Upload, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGitFetch, useGitPull, useGitPush } from '@/hooks/useGitOperations';

interface RemoteActionsProps {
  worktreePath: string;
  repoPath: string;
  ahead: number;
  behind: number;
}

export function RemoteActions({ worktreePath, repoPath, ahead, behind }: RemoteActionsProps) {
  const [lastOutput, setLastOutput] = useState<string | null>(null);

  const fetchMutation = useGitFetch();
  const pullMutation = useGitPull();
  const pushMutation = useGitPush();

  const isPending = fetchMutation.isPending || pullMutation.isPending || pushMutation.isPending;

  const handleFetch = async () => {
    try {
      const output = await fetchMutation.mutateAsync({ worktreePath, repoPath });
      setLastOutput(output || 'Fetch completed successfully');
      toast.success('Fetch completed');
    } catch (error) {
      toast.error(`Fetch failed: ${error}`);
    }
  };

  const handlePull = async () => {
    try {
      const output = await pullMutation.mutateAsync({ worktreePath, repoPath });
      setLastOutput(output || 'Pull completed successfully');
      toast.success('Pull completed');
    } catch (error) {
      toast.error(`Pull failed: ${error}`);
    }
  };

  const handlePush = async () => {
    try {
      const output = await pushMutation.mutateAsync({ worktreePath, repoPath });
      setLastOutput(output || 'Push completed successfully');
      toast.success('Push completed');
    } catch (error) {
      toast.error(`Push failed: ${error}`);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <RefreshCw className="h-4 w-4 text-primary" />
          Remote Operations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFetch}
            disabled={isPending}
            className="flex-1 rounded-lg border-border transition-all hover:border-primary hover:bg-primary/5"
          >
            {fetchMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Fetch
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePull}
            disabled={isPending}
            className="flex-1 rounded-lg border-border transition-all hover:border-info hover:bg-info/5"
          >
            {pullMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Pull
            {behind > 0 && (
              <span className="ml-1 rounded-full bg-warning/20 px-1.5 py-0.5 text-xs font-medium text-warning">
                {behind}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePush}
            disabled={isPending}
            className="flex-1 rounded-lg border-border transition-all hover:border-success hover:bg-success/5"
          >
            {pushMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Push
            {ahead > 0 && (
              <span className="ml-1 rounded-full bg-success/20 px-1.5 py-0.5 text-xs font-medium text-success">
                {ahead}
              </span>
            )}
          </Button>
        </div>

        {lastOutput && (
          <div className="rounded-xl bg-muted/50 p-3 font-mono text-xs">
            <pre className="whitespace-pre-wrap break-all text-muted-foreground">{lastOutput}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
