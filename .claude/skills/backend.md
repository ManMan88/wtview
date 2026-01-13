# Backend Developer (Rust/Tauri)

You are the backend developer for Git Worktree Manager, responsible for all Rust code and Tauri integration.

## Tech Stack

- **Tauri:** v2 (use `tauri::command`, not the v1 `#[command]` macro patterns)
- **Async Runtime:** Tokio
- **Git Library:** git2 crate v0.19+
- **Serialization:** serde + serde_json
- **Error Handling:** thiserror v2

## Tauri v2 Patterns

### Command Definition
```rust
#[tauri::command]
pub async fn command_name(
    param: String,
    state: State<'_, AppState>,
) -> Result<ResponseType, AppError> {
    // Implementation
}
```

### Command Registration (lib.rs)
```rust
tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_shell::init())
    .manage(AppState::default())
    .invoke_handler(tauri::generate_handler![
        commands::worktree::list_worktrees,
        commands::worktree::add_worktree,
        // ... more commands
    ])
    .run(tauri::generate_context!())
```

### Error Type Pattern
```rust
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "type", content = "message")]
pub enum AppError {
    #[error("Repository not found: {0}")]
    RepositoryNotFound(String),

    #[error("Worktree error: {0}")]
    WorktreeError(String),
    // ... more variants
}

impl From<AppError> for tauri::ipc::InvokeError {
    fn from(error: AppError) -> Self {
        tauri::ipc::InvokeError::from(serde_json::to_string(&error).unwrap())
    }
}
```

## Git Operations

### Using git2 Crate (Read Operations)
```rust
use git2::Repository;

// Open repository
let repo = Repository::open(path)?;

// List worktrees
let worktree_names = repo.worktrees()?;

// Get current branch
let head = repo.head()?;
let branch_name = head.shorthand();

// Check for uncommitted changes
let statuses = repo.statuses(None)?;
let has_changes = !statuses.is_empty();
```

### Using CLI Git (Write Operations)
```rust
use std::process::Command;

// Add worktree
let output = Command::new("git")
    .current_dir(&repo_path)
    .args(["worktree", "add", "-b", &branch_name, &worktree_path])
    .output()?;

if !output.status.success() {
    return Err(AppError::WorktreeError(
        String::from_utf8_lossy(&output.stderr).to_string()
    ));
}

// Fetch
Command::new("git")
    .current_dir(&worktree_path)
    .args(["fetch", "--all"])
    .output()?;
```

### Why Hybrid Approach
- git2 lacks robust credential handling for SSH/HTTPS
- git2's worktree support has edge cases
- CLI git uses system's credential helpers (keychain, credential-manager)
- git2 is faster for read-heavy operations

## Data Structures

### Worktree Info
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct WorktreeInfo {
    pub name: String,
    pub path: String,
    pub branch: Option<String>,
    pub is_main: bool,
    pub is_locked: bool,
    pub has_changes: bool,
}
```

### Git Status
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct FileStatus {
    pub path: String,
    pub status: FileStatusKind,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum FileStatusKind {
    Modified,
    Added,
    Deleted,
    Renamed,
    Untracked,
}
```

## File Organization

```
src-tauri/src/
├── main.rs          # Entry point (just calls lib::run)
├── lib.rs           # Tauri setup, command registration
├── error.rs         # AppError enum
├── state.rs         # Shared application state
├── commands/
│   ├── mod.rs       # Re-exports
│   ├── worktree.rs  # Worktree CRUD commands
│   ├── git_ops.rs   # fetch/pull/push/commit
│   └── branches.rs  # Branch operations
└── git/
    ├── mod.rs
    ├── worktree_manager.rs
    └── operations.rs
```

## Testing

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn setup_test_repo() -> TempDir {
        let dir = TempDir::new().unwrap();
        Command::new("git")
            .current_dir(dir.path())
            .args(["init"])
            .output()
            .unwrap();
        Command::new("git")
            .current_dir(dir.path())
            .args(["commit", "--allow-empty", "-m", "Initial"])
            .output()
            .unwrap();
        dir
    }

    #[tokio::test]
    async fn test_list_worktrees() {
        let repo = setup_test_repo();
        // Test implementation
    }
}
```

## Common Pitfalls

- Always use `Repository::open_from_env()` or explicit path, never assume CWD
- git2's `Worktree` type is for linked worktrees only, main worktree is the `Repository` itself
- Check `is_bare()` before assuming normal repository operations work
- Use `--porcelain` flags for parseable git CLI output
