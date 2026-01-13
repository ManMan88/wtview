# Git Worktree Manager - Implementation Plan

## Overview
A cross-platform GUI application for managing git worktrees, built with **Tauri v2** (Rust backend + TypeScript/React frontend).

**Target Platforms:** Linux (primary), Windows, macOS
**UI Style:** Modern, VS Code-like aesthetic
**Distribution:** Standalone binaries + system packages (DEB, RPM, MSI, DMG)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Tauri v2 |
| Backend | Rust |
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| State Management | Zustand (UI state) + TanStack Query (server state) |
| Git Operations | git2 crate + command-line git (hybrid approach) |

---

## Features

### Core Worktree Management
- List all worktrees with branch info
- Add new worktrees (select existing branch or create new)
- Delete worktrees (with safety checks for uncommitted changes)
- Lock/unlock worktrees

### Git Operations (per worktree)
- Fetch from remote
- Pull changes
- Push changes
- Checkout branches
- Stage/unstage files
- Create commits

---

## Project Structure

```
worktree_viewer/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── index.html
├── src/                          # Frontend
│   ├── main.tsx
│   ├── App.tsx
│   ├── styles/globals.css
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── MainContent.tsx
│   │   ├── worktree/
│   │   │   ├── WorktreeList.tsx
│   │   │   ├── WorktreeCard.tsx
│   │   │   ├── AddWorktreeDialog.tsx
│   │   │   └── DeleteWorktreeDialog.tsx
│   │   └── git/
│   │       ├── BranchSelector.tsx
│   │       ├── CommitPanel.tsx
│   │       └── RemoteActions.tsx
│   ├── hooks/
│   │   ├── useWorktrees.ts
│   │   ├── useGitOperations.ts
│   │   └── useBranches.ts
│   ├── stores/
│   │   └── appStore.ts
│   └── types/
│       └── worktree.ts
└── src-tauri/                    # Backend
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── capabilities/default.json
    ├── icons/
    └── src/
        ├── main.rs
        ├── lib.rs
        ├── error.rs
        ├── commands/
        │   ├── mod.rs
        │   ├── worktree.rs
        │   ├── git_ops.rs
        │   └── branches.rs
        └── git/
            ├── mod.rs
            ├── worktree_manager.rs
            └── operations.rs
```

---

## Implementation Steps

### Phase 0: Initial Repository Setup
1. Create `PROJECT_PLAN.md` in project root with this plan
2. Create `.gitignore` file with Tauri/Node/Rust ignores
3. Create `docs/` directory
4. Initial commit with `.gitignore` only

### Phase 1: Project Setup
1. Initialize Tauri v2 project with React + TypeScript template
2. Configure Tailwind CSS v4 and PostCSS
3. Initialize shadcn/ui and install core components (Button, Card, Dialog, Input, Select, Toast)
4. Set up Rust dependencies (git2, serde, thiserror, tokio)
5. Configure Tauri capabilities for file system and shell access

### Phase 2: Rust Backend - Core
1. Create error types in `error.rs` with proper serialization for Tauri
2. Implement `WorktreeManager` struct with git2 crate integration
3. Create Tauri commands:
   - `list_worktrees` - List all worktrees with branch/status info
   - `add_worktree` - Create new worktree (uses CLI git for reliability)
   - `remove_worktree` - Delete worktree with safety checks
4. Implement repository selection via file dialog

### Phase 3: Frontend - Core UI
1. Set up Zustand store for app state (selected repo, selected worktree)
2. Create TanStack Query hooks for worktree data fetching
3. Build layout components (Header, Sidebar, MainContent)
4. Implement WorktreeList and WorktreeCard components
5. Create AddWorktreeDialog with branch selection
6. Create DeleteWorktreeDialog with confirmation

### Phase 4: Git Operations
1. Implement fetch/pull/push commands (using CLI git for credential handling)
2. Create git status command to detect changes
3. Implement stage/unstage file commands
4. Create commit command
5. Build frontend components for git operations (RemoteActions, CommitPanel)
6. Add branch checkout functionality

### Phase 5: Polish & Distribution
1. Add loading states and error handling throughout UI
2. Implement toast notifications for operation feedback
3. Add keyboard shortcuts for common actions
4. Configure Tauri bundler for all platforms
5. Set up GitHub Actions for automated builds
6. Create app icons for all platforms

---

## Key Dependencies

### Rust (Cargo.toml)
```toml
[dependencies]
tauri = { version = "2", features = ["devtools"] }
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
tauri-plugin-shell = "2"
git2 = "0.19"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
thiserror = "2"
tokio = { version = "1", features = ["full"] }
```

### JavaScript (package.json)
```json
{
  "dependencies": {
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-dialog": "^2",
    "@tanstack/react-query": "^5",
    "react": "^19",
    "react-dom": "^19",
    "zustand": "^5",
    "lucide-react": "^0.460",
    "sonner": "^1"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2",
    "typescript": "^5",
    "vite": "^6",
    "tailwindcss": "^4",
    "@vitejs/plugin-react": "^4"
  }
}
```

---

## Git Integration Strategy

**Hybrid Approach:**
- **git2 crate** for: listing worktrees, reading repo state, branch info, detecting changes
- **Command-line git** for: add/remove worktree, fetch/pull/push (uses system credentials)

This gives us:
- Type safety and performance for read operations
- Reliable credential handling for remote operations
- Better worktree creation/deletion (libgit2's worktree support is limited)

---

## Verification Plan

1. **Development testing:**
   - Run `npm run tauri dev` to start development server
   - Test with a real git repository containing worktrees

2. **Manual testing checklist:**
   - [ ] Open a repository via file picker
   - [ ] View list of all worktrees
   - [ ] Create a new worktree with new branch
   - [ ] Create a new worktree from existing branch
   - [ ] Delete a worktree (verify safety check for uncommitted changes)
   - [ ] Fetch from remote
   - [ ] Pull changes
   - [ ] Stage files and create commit
   - [ ] Push changes
   - [ ] Switch branches in a worktree

3. **Cross-platform verification:**
   - Build and test on Linux, Windows, and macOS
   - Verify installers work correctly on each platform

4. **Run Rust tests:**
   ```bash
   cd src-tauri && cargo test
   ```
