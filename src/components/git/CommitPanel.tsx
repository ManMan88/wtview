import { useState } from 'react';
import { Plus, Minus, FileText, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGitStage, useGitUnstage, useGitCommit } from '@/hooks/useGitOperations';
import type { FileStatus } from '@/lib/tauri';

interface CommitPanelProps {
  worktreePath: string;
  repoPath: string;
  files: FileStatus[];
}

export function CommitPanel({ worktreePath, repoPath, files }: CommitPanelProps) {
  const [commitMessage, setCommitMessage] = useState('');

  const stageMutation = useGitStage();
  const unstageMutation = useGitUnstage();
  const commitMutation = useGitCommit();

  const stagedFiles = files.filter((f) => f.staged);
  const unstagedFiles = files.filter((f) => !f.staged);

  const isStaging = stageMutation.isPending || unstageMutation.isPending;
  const isCommitting = commitMutation.isPending;

  const handleStage = async (filePath: string) => {
    try {
      await stageMutation.mutateAsync({ worktreePath, filePath });
    } catch (error) {
      toast.error(`Failed to stage file: ${error}`);
    }
  };

  const handleUnstage = async (filePath: string) => {
    try {
      await unstageMutation.mutateAsync({ worktreePath, filePath });
    } catch (error) {
      toast.error(`Failed to unstage file: ${error}`);
    }
  };

  const handleStageAll = async () => {
    try {
      for (const file of unstagedFiles) {
        await stageMutation.mutateAsync({ worktreePath, filePath: file.path });
      }
      toast.success('All files staged');
    } catch (error) {
      toast.error(`Failed to stage files: ${error}`);
    }
  };

  const handleUnstageAll = async () => {
    try {
      for (const file of stagedFiles) {
        await unstageMutation.mutateAsync({ worktreePath, filePath: file.path });
      }
      toast.success('All files unstaged');
    } catch (error) {
      toast.error(`Failed to unstage files: ${error}`);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      toast.error('Commit message is required');
      return;
    }
    if (stagedFiles.length === 0) {
      toast.error('No files staged for commit');
      return;
    }

    try {
      await commitMutation.mutateAsync({
        worktreePath,
        message: commitMessage.trim(),
        repoPath,
      });
      setCommitMessage('');
      toast.success('Commit created successfully');
    } catch (error) {
      toast.error(`Commit failed: ${error}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      modified: { label: 'M', className: 'bg-yellow-500/20 text-yellow-500' },
      added: { label: 'A', className: 'bg-green-500/20 text-green-500' },
      deleted: { label: 'D', className: 'bg-red-500/20 text-red-500' },
      renamed: { label: 'R', className: 'bg-blue-500/20 text-blue-500' },
      untracked: { label: '?', className: 'bg-gray-500/20 text-gray-500' },
    };
    const info = statusMap[status.toLowerCase()] ?? { label: status[0], className: 'bg-gray-500/20 text-gray-500' };
    return (
      <span className={`rounded px-1.5 py-0.5 text-xs font-mono ${info.className}`}>
        {info.label}
      </span>
    );
  };

  if (files.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No changes detected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Changes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Staged Files */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Staged ({stagedFiles.length})
            </Label>
            {stagedFiles.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUnstageAll}
                disabled={isStaging}
                className="h-6 px-2 text-xs"
              >
                Unstage All
              </Button>
            )}
          </div>
          <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border bg-muted/50 p-2">
            {stagedFiles.length === 0 ? (
              <p className="text-xs text-muted-foreground">No staged changes</p>
            ) : (
              stagedFiles.map((file) => (
                <div
                  key={file.path}
                  className="group flex items-center justify-between rounded px-1 hover:bg-muted"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                    {getStatusBadge(file.status)}
                    <span className="truncate text-xs" title={file.path}>
                      {file.path}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleUnstage(file.path)}
                    disabled={isStaging}
                    className="h-5 w-5 opacity-0 group-hover:opacity-100"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Unstaged Files */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Unstaged ({unstagedFiles.length})
            </Label>
            {unstagedFiles.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStageAll}
                disabled={isStaging}
                className="h-6 px-2 text-xs"
              >
                Stage All
              </Button>
            )}
          </div>
          <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border bg-muted/50 p-2">
            {unstagedFiles.length === 0 ? (
              <p className="text-xs text-muted-foreground">No unstaged changes</p>
            ) : (
              unstagedFiles.map((file) => (
                <div
                  key={file.path}
                  className="group flex items-center justify-between rounded px-1 hover:bg-muted"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                    {getStatusBadge(file.status)}
                    <span className="truncate text-xs" title={file.path}>
                      {file.path}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleStage(file.path)}
                    disabled={isStaging}
                    className="h-5 w-5 opacity-0 group-hover:opacity-100"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Commit Form */}
        <div className="space-y-2 border-t pt-3">
          <Label htmlFor="commit-message" className="text-sm font-medium">
            Commit Message
          </Label>
          <div className="flex gap-2">
            <Input
              id="commit-message"
              placeholder="Enter commit message..."
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleCommit();
                }
              }}
              disabled={isCommitting}
            />
            <Button
              onClick={handleCommit}
              disabled={isCommitting || stagedFiles.length === 0 || !commitMessage.trim()}
            >
              {isCommitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
