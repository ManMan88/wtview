import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border p-4">
          <h1 className="text-xl font-semibold">Git Worktree Manager</h1>
        </header>
        <main className="p-4">
          <p className="text-muted-foreground">
            Select a repository to get started.
          </p>
        </main>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
