# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Git Worktree Manager - a cross-platform GUI application for managing git worktrees. Built with Tauri v2 (Rust backend + React/TypeScript frontend).

## Tech Stack

- **Framework:** Tauri v2
- **Backend:** Rust with git2 crate
- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **State:** Zustand (UI) + TanStack Query (server state)

## Development Commands

```bash
# source cargo
source "$HOME/.cargo/env"

# Start development server (frontend + backend hot reload)
npm run tauri dev

# Build production app
npm run tauri build

# Run Rust tests
cd src-tauri && cargo test

# Run frontend only (without Tauri)
npm run dev

# Type check
npm run build

# Format code
cargo fmt                    # Rust
npm run format               # TypeScript (Prettier)
```

## Coding Standards

**All code must follow the project style guides:**

- **Rust:** [docs/rust-style-guide.md](docs/rust-style-guide.md)
- **TypeScript/React:** [docs/typescript-style-guide.md](docs/typescript-style-guide.md)

### Key Style Rules

#### Rust
- Use `rustfmt` with defaults
- Types: `PascalCase`, functions/variables: `snake_case`
- Error handling: `thiserror` with `Serialize` for Tauri
- Imports: std → external crates → crate-local
- Tests: `#[tokio::test]` with `tempfile` for git repos

#### TypeScript/React
- Use Prettier (single quotes, trailing commas)
- Components: `PascalCase`, hooks: `camelCase` with `use` prefix
- Props interfaces: `PascalCase` with `Props` suffix
- State: server data in TanStack Query, UI state in Zustand
- Styling: Tailwind classes with `cn()` for conditionals
- Imports: React → external → internal → types (use `import type`)

## Architecture

### Backend (src-tauri/src/)

- `commands/` - Tauri command handlers exposed to frontend via IPC
  - `repository.rs` - repository selection via file dialog, validation
  - `worktree.rs` - list, add, remove, lock, unlock worktrees
  - `git_ops.rs` - fetch, pull, push, commit, stage/unstage operations
  - `branches.rs` - branch listing and checkout
- `git/` - Git abstraction layer
  - `worktree_manager.rs` - worktree CRUD operations with safety checks
  - `operations.rs` - git operations (status, branches, remote ops)
  - Uses **git2 crate** for read operations (listing, status, branch info)
  - Uses **command-line git** for write operations (add/remove worktree, push/pull/fetch) to leverage system credentials
- `error.rs` - Error types with Tauri serialization

### Frontend (src/)

- `components/ui/` - shadcn/ui components (do not modify)
- `components/worktree/` - Worktree list, cards, dialogs
- `components/git/` - Git operation UI (commit panel, branch selector)
- `hooks/` - TanStack Query hooks for Tauri commands
- `stores/` - Zustand store for UI state (selected repo, selected worktree)
- `types/` - TypeScript type definitions matching Rust structs

### Data Flow

```
Frontend components → TanStack Query hooks → invoke() IPC → Tauri commands → Git layer → git2/CLI
```

## Key Files

- `src-tauri/tauri.conf.json` - Tauri config (window settings, bundle config, permissions)
- `src-tauri/capabilities/default.json` - Permission capabilities for file/shell access
- `src/lib/tauri.ts` - Typed wrappers around Tauri invoke calls
- `src/stores/appStore.ts` - Zustand store with persistence

## Skills

Specialized Claude Code skills are available in `.claude/skills/`:

- `architect.md` - High-level design decisions, architecture patterns
- `backend.md` - Rust/Tauri development patterns
- `frontend.md` - React/TypeScript/shadcn-ui patterns
- `git-specialist.md` - Git worktree internals, git2 crate usage
- `testing.md` - Test strategies for Rust and React

## Implementation Progress

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the full implementation plan.

### Completed Phases

- [x] **Phase 0:** Initial Repository Setup - `.gitignore`, docs, project plan
- [x] **Phase 1:** Project Setup - Tauri v2, React, TypeScript, Tailwind CSS v4, shadcn/ui
- [x] **Phase 2:** Rust Backend Core
  - Error types with Tauri serialization (`error.rs`)
  - WorktreeManager with git2 integration (`git/worktree_manager.rs`)
  - Repository selection via file dialog (`commands/repository.rs`)
  - Worktree commands: list, add, remove, lock, unlock
  - Git operations: fetch, pull, push, status, commit, stage, unstage
  - Branch operations: list, checkout
  - Unit tests for worktree management

- [x] **Phase 3:** Frontend - Core UI
  - Zustand store for app state (`stores/appStore.ts`)
  - TanStack Query hooks for data fetching (`hooks/useWorktrees.ts`, `useBranches.ts`, `useGitOperations.ts`)
  - Layout components (`components/layout/Header.tsx`, `Sidebar.tsx`, `MainContent.tsx`)
  - WorktreeList and WorktreeCard components (`components/worktree/`)
  - AddWorktreeDialog and DeleteWorktreeDialog

### Next Phase

- [ ] **Phase 4:** Git Operations
  - Build frontend components for git operations (RemoteActions, CommitPanel)
  - Add branch checkout functionality with BranchSelector

## Test Coverage

| Module | Tests | Description |
|--------|-------|-------------|
| `error.rs` | 17 | Error display, serialization, type conversion |
| `worktree_manager.rs` | 24 | Worktree CRUD, lock/unlock, validation |
| `operations.rs` | 19 | Git status, branches, stage/commit |
| `tauri.test.ts` | 70 | Frontend API wrapper functions |
| **Total** | **130+** | |

Run tests: `cd src-tauri && cargo test` (backend) or `npm test` (frontend)
