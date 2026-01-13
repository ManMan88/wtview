import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Toaster } from '@/components/ui/sonner';
import { Header, Sidebar, MainContent } from '@/components/layout';
import { AddWorktreeDialog, DeleteWorktreeDialog } from '@/components/worktree';
import { useAppStore } from '@/stores/appStore';
import { useWorktrees } from '@/hooks/useWorktrees';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
  },
});

function AppContent() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { currentRepo, selectedWorktreePath } = useAppStore();
  const { data: worktrees } = useWorktrees(currentRepo?.path ?? null);

  const selectedWorktree = worktrees?.find((wt) => wt.path === selectedWorktreePath) ?? null;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onAddWorktree={() => setAddDialogOpen(true)} />
        <MainContent onDeleteWorktree={() => setDeleteDialogOpen(true)} />
      </div>

      {currentRepo && (
        <>
          <AddWorktreeDialog
            open={addDialogOpen}
            onOpenChange={setAddDialogOpen}
            repoPath={currentRepo.path}
          />
          <DeleteWorktreeDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            worktree={selectedWorktree}
            repoPath={currentRepo.path}
          />
        </>
      )}

      <Toaster />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
