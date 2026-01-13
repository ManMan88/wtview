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
  - `worktree.rs` - list, add, remove worktrees
  - `git_ops.rs` - fetch, pull, push, commit operations
  - `branches.rs` - branch listing and checkout
- `git/` - Git abstraction layer
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
