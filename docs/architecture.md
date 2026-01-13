# Architecture Overview

This document describes the architecture of Git Worktree Manager, a cross-platform desktop application built with Tauri v2.

## Table of Contents

- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Data Flow](#data-flow)
- [Git Integration Strategy](#git-integration-strategy)
- [Security Considerations](#security-considerations)
- [Testing Strategy](#testing-strategy)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Desktop Application                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Frontend (WebView)                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │  │
│  │  │   React     │  │  TanStack   │  │     Zustand     │   │  │
│  │  │ Components  │  │   Query     │  │   (UI State)    │   │  │
│  │  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘   │  │
│  │         │                │                   │            │  │
│  │         └────────────────┼───────────────────┘            │  │
│  │                          │                                │  │
│  │                    invoke() IPC                           │  │
│  └──────────────────────────┼────────────────────────────────┘  │
│                             │                                    │
│  ┌──────────────────────────┼────────────────────────────────┐  │
│  │                    Backend (Rust)                          │  │
│  │                          │                                 │  │
│  │  ┌───────────────────────┴───────────────────────────┐    │  │
│  │  │              Tauri Command Handlers                │    │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐          │    │  │
│  │  │  │repository│ │ worktree │ │ git_ops  │          │    │  │
│  │  │  └────┬─────┘ └────┬─────┘ └────┬─────┘          │    │  │
│  │  └───────┼────────────┼────────────┼─────────────────┘    │  │
│  │          │            │            │                       │  │
│  │  ┌───────┴────────────┴────────────┴─────────────────┐    │  │
│  │  │                  Git Layer                         │    │  │
│  │  │  ┌─────────────────┐  ┌─────────────────────────┐ │    │  │
│  │  │  │   git2 crate    │  │    Command-line git     │ │    │  │
│  │  │  │ (read operations)│  │   (write operations)   │ │    │  │
│  │  │  └─────────────────┘  └─────────────────────────┘ │    │  │
│  │  └────────────────────────────────────────────────────┘    │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  File System    │
                    │  Git Repos      │
                    └─────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | Tauri v2 | Cross-platform desktop app framework |
| Backend | Rust | Performance, safety, git integration |
| Frontend | React 19 | UI components and interactions |
| Language | TypeScript | Type-safe frontend development |
| Bundler | Vite | Fast development and production builds |
| Styling | Tailwind CSS v4 | Utility-first CSS framework |
| Components | shadcn/ui | Pre-built accessible UI components |
| Server State | TanStack Query | Data fetching, caching, synchronization |
| UI State | Zustand | Lightweight state management |
| Git (read) | git2 crate | Direct repository access |
| Git (write) | CLI git | Credential handling, reliability |

---

## Backend Architecture

### Directory Structure

```
src-tauri/src/
├── main.rs              # Application entry point
├── lib.rs               # Tauri app builder and command registration
├── error.rs             # Error types with Tauri serialization
├── commands/            # Tauri command handlers
│   ├── mod.rs           # Module exports
│   ├── repository.rs    # Repository selection and validation
│   ├── worktree.rs      # Worktree CRUD operations
│   ├── git_ops.rs       # Git operations (fetch, pull, push, etc.)
│   └── branches.rs      # Branch listing and checkout
└── git/                 # Git abstraction layer
    ├── mod.rs           # Module exports
    ├── worktree_manager.rs  # Worktree management logic
    └── operations.rs    # Git operation implementations
```

### Module Responsibilities

#### `error.rs`
Defines the application error type with variants for all possible failure modes:
- `Git` - Low-level git2 errors
- `Io` - File system errors
- `Command` - Git CLI failures
- `InvalidPath` - Path validation errors
- `NotARepository` - Repository validation errors
- `UncommittedChanges` - Safety check failures
- `WorktreeLocked` - Lock state errors
- `BranchInUse` - Branch checkout conflicts
- `WorktreeNotFound` - Missing worktree errors

All errors implement `Serialize` for Tauri IPC.

#### `commands/`
Thin wrapper layer that:
- Defines `#[tauri::command]` async functions
- Defines return types with `Serialize` derive
- Delegates to `git/` module for implementation
- Handles type conversions between Tauri and internal types

#### `git/`
Core business logic layer that:
- Implements all git operations
- Manages repository state
- Handles error translation
- Provides testable pure functions

### Error Handling Pattern

```rust
// Error types with thiserror derive
#[derive(Debug, Error)]
pub enum AppError {
    #[error("Git error: {0}")]
    Git(#[from] git2::Error),
    // ...
}

// Serialize implementation for Tauri
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

// Result type alias
pub type AppResult<T> = Result<T, AppError>;
```

---

## Frontend Architecture

### Directory Structure (Planned)

```
src/
├── main.tsx             # Application entry point
├── App.tsx              # Root component
├── styles/
│   └── globals.css      # Tailwind imports and global styles
├── components/
│   ├── ui/              # shadcn/ui components (do not modify)
│   ├── layout/          # Layout components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── MainContent.tsx
│   ├── worktree/        # Worktree-specific components
│   │   ├── WorktreeList.tsx
│   │   ├── WorktreeCard.tsx
│   │   ├── AddWorktreeDialog.tsx
│   │   └── DeleteWorktreeDialog.tsx
│   └── git/             # Git operation components
│       ├── BranchSelector.tsx
│       ├── CommitPanel.tsx
│       └── RemoteActions.tsx
├── hooks/               # TanStack Query hooks
│   ├── useWorktrees.ts
│   ├── useGitOperations.ts
│   └── useBranches.ts
├── stores/              # Zustand stores
│   └── appStore.ts
├── lib/                 # Utilities
│   └── tauri.ts         # Typed Tauri invoke wrappers
└── types/               # TypeScript definitions
    └── api.ts           # API types matching Rust structs
```

### State Management Strategy

**Server State (TanStack Query)**
- Worktree list
- Git status
- Branch list
- All data fetched from backend

**UI State (Zustand)**
- Selected repository path
- Selected worktree
- UI preferences
- Dialog open/close state

### Component Patterns

```typescript
// Hook pattern for data fetching
export function useWorktrees(repoPath: string | null) {
  return useQuery({
    queryKey: ['worktrees', repoPath],
    queryFn: () => invoke<WorktreeInfo[]>('list_worktrees', { repo_path: repoPath }),
    enabled: !!repoPath,
  });
}

// Component using hook
export function WorktreeList() {
  const repoPath = useAppStore((s) => s.repoPath);
  const { data: worktrees, isLoading, error } = useWorktrees(repoPath);

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {worktrees?.map((wt) => (
        <WorktreeCard key={wt.path} worktree={wt} />
      ))}
    </div>
  );
}
```

---

## Data Flow

### Read Operations

```
User Action → Component → TanStack Query Hook → invoke() → Tauri Command
                                                              ↓
                                                         git/ module
                                                              ↓
                                                         git2 crate
                                                              ↓
                                                         Git Repository
```

### Write Operations

```
User Action → Component → Mutation Hook → invoke() → Tauri Command
                                                          ↓
                                                     git/ module
                                                          ↓
                                                     Command::new("git")
                                                          ↓
                                                     Git Repository
```

### Cache Invalidation

```typescript
// After mutation, invalidate related queries
const addWorktreeMutation = useMutation({
  mutationFn: (params) => invoke('add_worktree', params),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['worktrees'] });
    queryClient.invalidateQueries({ queryKey: ['branches'] });
  },
});
```

---

## Git Integration Strategy

### Hybrid Approach

The application uses a **hybrid approach** combining the git2 Rust crate and command-line git:

| Operation | Method | Reason |
|-----------|--------|--------|
| List worktrees | git2 | Fast, type-safe |
| Get status | git2 | Efficient diff computation |
| List branches | git2 | Direct repository access |
| Get ahead/behind | git2 | Graph traversal |
| Add worktree | CLI | Better worktree support |
| Remove worktree | CLI | Proper cleanup |
| Fetch/Pull/Push | CLI | System credential handling |
| Commit | CLI | Hooks, GPG signing |
| Stage/Unstage | CLI | Index manipulation |
| Checkout | CLI | Working tree updates |

### Rationale

**git2 crate (libgit2):**
- Excellent for read operations
- Type-safe Rust API
- No subprocess overhead
- Direct memory access to repository

**Command-line git:**
- Uses system credential helpers (SSH agent, credential manager)
- Full worktree support (libgit2's worktree support is limited)
- Triggers git hooks
- Supports GPG signing
- More reliable for complex operations

### Implementation Pattern

```rust
// Read operation with git2
pub fn list_branches(repo_path: &str) -> AppResult<Vec<BranchInfo>> {
    let repo = Repository::open(repo_path)?;
    let mut branches = Vec::new();

    for branch_result in repo.branches(None)? {
        let (branch, branch_type) = branch_result?;
        // ... process branch
    }

    Ok(branches)
}

// Write operation with CLI
pub fn push(worktree_path: &str) -> AppResult<String> {
    let output = Command::new("git")
        .current_dir(worktree_path)
        .args(["push"])
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::Command(stderr.to_string()));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}
```

---

## Security Considerations

### File System Access

The application requires file system access to:
- Read git repositories
- Create/delete worktree directories
- Execute git commands

Permissions are configured in `src-tauri/capabilities/default.json`.

### Shell Command Execution

- Only executes `git` commands
- Commands run with user's permissions
- Working directory is always validated as a git repository
- No user-provided strings are interpolated into commands

### Credential Handling

- Application never stores or handles git credentials directly
- Relies on system credential helpers (SSH agent, git credential manager)
- Remote operations use CLI git which integrates with system keychain

---

## Testing Strategy

### Backend Tests

Located in `src-tauri/src/git/worktree_manager.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_repo() -> TempDir {
        // Create temporary git repository
    }

    #[test]
    fn test_list_worktrees() {
        let repo = create_test_repo();
        let worktrees = list_worktrees(repo.path().to_str().unwrap()).unwrap();
        assert_eq!(worktrees.len(), 1);
    }
}
```

**Test Categories:**
- Repository validation
- Worktree CRUD operations
- Error handling
- Safety checks (uncommitted changes)

### Frontend Tests (Planned)

- Component tests with React Testing Library
- Hook tests with @testing-library/react-hooks
- Integration tests with Tauri mocking

### Running Tests

```bash
# Rust tests
cd src-tauri && cargo test

# Frontend tests (when implemented)
npm test
```

---

## Performance Considerations

### Caching

- TanStack Query provides automatic caching
- Stale-while-revalidate pattern for responsive UI
- Manual cache invalidation after mutations

### Async Operations

- All Tauri commands are async
- Git operations run on background threads
- UI remains responsive during operations

### File System

- git2 uses memory-mapped files for efficiency
- Worktree listing is fast (reads .git/worktrees directory)
- Status computation may be slow for large repositories

---

## Future Considerations

### Potential Enhancements

1. **File Watcher** - Auto-refresh on file system changes
2. **Diff Viewer** - Show file diffs inline
3. **Merge Conflict Resolution** - Visual merge tool
4. **Git Graph** - Visualize commit history
5. **Settings Persistence** - Remember window size, recent repos
6. **Multi-Repository** - Manage multiple repos simultaneously

### Platform-Specific

- **macOS** - Native menu bar integration
- **Windows** - Jump list integration
- **Linux** - System tray support
