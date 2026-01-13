# Backend API Reference

This document describes all Tauri commands exposed by the Git Worktree Manager backend. These commands are invoked from the frontend using Tauri's `invoke()` IPC mechanism.

## Table of Contents

- [Repository Commands](#repository-commands)
- [Worktree Commands](#worktree-commands)
- [Git Operations](#git-operations)
- [Branch Operations](#branch-operations)
- [Error Handling](#error-handling)

---

## Repository Commands

Commands for opening and validating git repositories.

### `select_repository`

Opens a native file dialog for the user to select a git repository directory.

**Parameters:** None

**Returns:** `RepositoryInfo | null`

```typescript
interface RepositoryInfo {
  path: string;      // Absolute path to the repository
  name: string;      // Directory name of the repository
  is_bare: boolean;  // Whether this is a bare repository
}
```

**Example:**
```typescript
const repo = await invoke<RepositoryInfo | null>('select_repository');
if (repo) {
  console.log(`Selected: ${repo.name} at ${repo.path}`);
}
```

**Errors:**
- `NotARepository` - Selected directory is not a valid git repository

---

### `open_repository`

Opens a repository at a specific path (useful for reopening recent repositories).

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `path` | `string` | Absolute path to the repository |

**Returns:** `RepositoryInfo`

**Example:**
```typescript
const repo = await invoke<RepositoryInfo>('open_repository', {
  path: '/home/user/projects/my-repo'
});
```

**Errors:**
- `InvalidPath` - Path does not exist
- `NotARepository` - Path is not a valid git repository

---

### `validate_repo`

Quickly checks if a path is a valid git repository without opening it.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `path` | `string` | Path to validate |

**Returns:** `boolean` - `true` if valid repository, `false` otherwise

**Example:**
```typescript
const isValid = await invoke<boolean>('validate_repo', {
  path: '/home/user/projects/my-repo'
});
```

---

## Worktree Commands

Commands for managing git worktrees within a repository.

### `list_worktrees`

Lists all worktrees in a repository, including the main worktree and any linked worktrees.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `repo_path` | `string` | Path to the main repository |

**Returns:** `WorktreeInfo[]`

```typescript
interface WorktreeInfo {
  path: string;           // Absolute path to the worktree
  branch: string | null;  // Current branch name, or null if detached HEAD
  is_main: boolean;       // True if this is the main worktree
  is_locked: boolean;     // True if the worktree is locked
}
```

**Example:**
```typescript
const worktrees = await invoke<WorktreeInfo[]>('list_worktrees', {
  repo_path: '/home/user/projects/my-repo'
});

for (const wt of worktrees) {
  console.log(`${wt.path} -> ${wt.branch} ${wt.is_main ? '(main)' : ''}`);
}
```

---

### `add_worktree`

Creates a new worktree, optionally creating a new branch.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `repo_path` | `string` | Path to the main repository |
| `worktree_path` | `string` | Path where the new worktree will be created |
| `branch` | `string` | Branch name to checkout (or create) |
| `create_branch` | `boolean` | If `true`, creates a new branch; if `false`, checks out existing branch |

**Returns:** `void`

**Example:**
```typescript
// Create worktree with new branch
await invoke('add_worktree', {
  repo_path: '/home/user/projects/my-repo',
  worktree_path: '/home/user/projects/my-repo-feature',
  branch: 'feature/new-feature',
  create_branch: true
});

// Create worktree from existing branch
await invoke('add_worktree', {
  repo_path: '/home/user/projects/my-repo',
  worktree_path: '/home/user/projects/my-repo-hotfix',
  branch: 'hotfix/urgent-fix',
  create_branch: false
});
```

**Errors:**
- `BranchInUse` - Branch is already checked out in another worktree
- `Command` - Git command failed (e.g., branch doesn't exist)

---

### `remove_worktree`

Removes a linked worktree. Includes safety checks for uncommitted changes.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `repo_path` | `string` | Path to the main repository |
| `worktree_path` | `string` | Path to the worktree to remove |
| `force` | `boolean` | If `true`, removes even with uncommitted changes |

**Returns:** `void`

**Example:**
```typescript
// Safe removal (fails if uncommitted changes)
await invoke('remove_worktree', {
  repo_path: '/home/user/projects/my-repo',
  worktree_path: '/home/user/projects/my-repo-feature',
  force: false
});

// Force removal
await invoke('remove_worktree', {
  repo_path: '/home/user/projects/my-repo',
  worktree_path: '/home/user/projects/my-repo-feature',
  force: true
});
```

**Errors:**
- `WorktreeNotFound` - Worktree doesn't exist
- `UncommittedChanges` - Worktree has uncommitted changes (when `force: false`)

---

### `lock_worktree`

Locks a worktree to prevent it from being pruned.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `repo_path` | `string` | Path to the main repository |
| `worktree_path` | `string` | Path to the worktree to lock |
| `reason` | `string \| null` | Optional reason for locking |

**Returns:** `void`

**Example:**
```typescript
await invoke('lock_worktree', {
  repo_path: '/home/user/projects/my-repo',
  worktree_path: '/home/user/projects/my-repo-feature',
  reason: 'Work in progress - do not remove'
});
```

---

### `unlock_worktree`

Unlocks a previously locked worktree.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `repo_path` | `string` | Path to the main repository |
| `worktree_path` | `string` | Path to the worktree to unlock |

**Returns:** `void`

**Example:**
```typescript
await invoke('unlock_worktree', {
  repo_path: '/home/user/projects/my-repo',
  worktree_path: '/home/user/projects/my-repo-feature'
});
```

---

## Git Operations

Commands for performing git operations within a worktree.

### `git_status`

Gets the current status of a worktree, including changed files and ahead/behind counts.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `worktree_path` | `string` | Path to the worktree |

**Returns:** `GitStatusResult`

```typescript
interface FileStatus {
  path: string;    // Relative path to the file
  status: string;  // 'added' | 'modified' | 'deleted' | 'untracked'
  staged: boolean; // True if file is staged for commit
}

interface GitStatusResult {
  branch: string | null;  // Current branch name
  files: FileStatus[];    // List of changed files
  ahead: number;          // Commits ahead of upstream
  behind: number;         // Commits behind upstream
}
```

**Example:**
```typescript
const status = await invoke<GitStatusResult>('git_status', {
  worktree_path: '/home/user/projects/my-repo-feature'
});

console.log(`On branch ${status.branch}`);
console.log(`${status.ahead} ahead, ${status.behind} behind`);

for (const file of status.files) {
  const prefix = file.staged ? '[staged]' : '';
  console.log(`${prefix} ${file.status}: ${file.path}`);
}
```

---

### `git_fetch`

Fetches from all remotes.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `worktree_path` | `string` | Path to the worktree |

**Returns:** `string` - Git command output

**Example:**
```typescript
const output = await invoke<string>('git_fetch', {
  worktree_path: '/home/user/projects/my-repo-feature'
});
```

---

### `git_pull`

Pulls changes from the upstream branch.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `worktree_path` | `string` | Path to the worktree |

**Returns:** `string` - Git command output

**Example:**
```typescript
const output = await invoke<string>('git_pull', {
  worktree_path: '/home/user/projects/my-repo-feature'
});
```

**Errors:**
- `Command` - Pull failed (e.g., merge conflicts, no upstream)

---

### `git_push`

Pushes commits to the upstream branch.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `worktree_path` | `string` | Path to the worktree |

**Returns:** `string` - Git command output

**Example:**
```typescript
const output = await invoke<string>('git_push', {
  worktree_path: '/home/user/projects/my-repo-feature'
});
```

**Errors:**
- `Command` - Push failed (e.g., rejected, no upstream)

---

### `git_stage`

Stages a file for commit.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `worktree_path` | `string` | Path to the worktree |
| `file_path` | `string` | Relative path to the file to stage |

**Returns:** `void`

**Example:**
```typescript
await invoke('git_stage', {
  worktree_path: '/home/user/projects/my-repo-feature',
  file_path: 'src/main.rs'
});
```

---

### `git_unstage`

Unstages a file (removes from staging area).

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `worktree_path` | `string` | Path to the worktree |
| `file_path` | `string` | Relative path to the file to unstage |

**Returns:** `void`

**Example:**
```typescript
await invoke('git_unstage', {
  worktree_path: '/home/user/projects/my-repo-feature',
  file_path: 'src/main.rs'
});
```

---

### `git_commit`

Creates a commit with staged changes.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `worktree_path` | `string` | Path to the worktree |
| `message` | `string` | Commit message |

**Returns:** `string` - Git command output (includes commit hash)

**Example:**
```typescript
const output = await invoke<string>('git_commit', {
  worktree_path: '/home/user/projects/my-repo-feature',
  message: 'feat: add new feature'
});
```

**Errors:**
- `Command` - Commit failed (e.g., nothing staged, empty message)

---

## Branch Operations

Commands for managing branches.

### `list_branches`

Lists all local and remote branches in a repository.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `repo_path` | `string` | Path to the repository |

**Returns:** `BranchInfo[]`

```typescript
interface BranchInfo {
  name: string;       // Branch name (e.g., 'main' or 'origin/main')
  is_remote: boolean; // True if this is a remote-tracking branch
  is_current: boolean; // True if this is the currently checked out branch
}
```

**Example:**
```typescript
const branches = await invoke<BranchInfo[]>('list_branches', {
  repo_path: '/home/user/projects/my-repo'
});

const localBranches = branches.filter(b => !b.is_remote);
const remoteBranches = branches.filter(b => b.is_remote);
```

---

### `checkout_branch`

Checks out a branch in a worktree.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `worktree_path` | `string` | Path to the worktree |
| `branch` | `string` | Branch name to checkout |

**Returns:** `void`

**Example:**
```typescript
await invoke('checkout_branch', {
  worktree_path: '/home/user/projects/my-repo-feature',
  branch: 'develop'
});
```

**Errors:**
- `Command` - Checkout failed (e.g., branch doesn't exist, uncommitted changes)

---

## Error Handling

All commands may return errors. Errors are serialized as strings for Tauri IPC.

### Error Types

| Error | Description |
|-------|-------------|
| `Git` | Low-level git2 library error |
| `Io` | File system I/O error |
| `Command` | Git CLI command failed (includes stderr) |
| `InvalidPath` | Specified path does not exist |
| `NotARepository` | Path is not a valid git repository |
| `UncommittedChanges` | Worktree has uncommitted changes |
| `WorktreeLocked` | Worktree is locked |
| `BranchInUse` | Branch is already checked out elsewhere |
| `WorktreeNotFound` | Specified worktree does not exist |

### Frontend Error Handling

```typescript
import { invoke } from '@tauri-apps/api/core';

try {
  await invoke('remove_worktree', {
    repo_path: repoPath,
    worktree_path: worktreePath,
    force: false
  });
} catch (error) {
  if (typeof error === 'string') {
    if (error.includes('uncommitted changes')) {
      // Prompt user to force remove or cancel
    } else if (error.includes('not found')) {
      // Worktree already removed
    } else {
      // Show generic error
      console.error('Failed to remove worktree:', error);
    }
  }
}
```

---

## TypeScript Type Definitions

For convenience, here are all the TypeScript interfaces used by the API:

```typescript
// src/types/api.ts

export interface RepositoryInfo {
  path: string;
  name: string;
  is_bare: boolean;
}

export interface WorktreeInfo {
  path: string;
  branch: string | null;
  is_main: boolean;
  is_locked: boolean;
}

export interface FileStatus {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'untracked';
  staged: boolean;
}

export interface GitStatusResult {
  branch: string | null;
  files: FileStatus[];
  ahead: number;
  behind: number;
}

export interface BranchInfo {
  name: string;
  is_remote: boolean;
  is_current: boolean;
}
```
