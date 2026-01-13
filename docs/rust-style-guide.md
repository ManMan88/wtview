# Rust Coding Style Guide

This document defines the coding standards for all Rust code in the Git Worktree Manager project.

## Formatting

Use `rustfmt` with default settings. Run before committing:
```bash
cargo fmt
```

## Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| Crates | snake_case | `worktree_manager` |
| Modules | snake_case | `git_ops.rs` |
| Types (structs, enums, traits) | PascalCase | `WorktreeInfo`, `AppError` |
| Functions | snake_case | `list_worktrees` |
| Methods | snake_case | `get_current_branch` |
| Local variables | snake_case | `repo_path` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRIES` |
| Static variables | SCREAMING_SNAKE_CASE | `DEFAULT_TIMEOUT` |
| Type parameters | Single uppercase or PascalCase | `T`, `Item` |
| Lifetimes | Short lowercase | `'a`, `'repo` |

## Code Organization

### File Structure
```rust
// 1. Module documentation
//! Brief description of the module.

// 2. Imports (grouped and ordered)
use std::path::PathBuf;           // std first
use std::process::Command;

use git2::Repository;              // external crates second
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::error::AppError;        // crate imports last
use crate::git::WorktreeManager;

// 3. Constants
const DEFAULT_REMOTE: &str = "origin";

// 4. Type definitions (structs, enums)
#[derive(Debug, Serialize, Deserialize)]
pub struct WorktreeInfo {
    // ...
}

// 5. Trait implementations
impl Default for WorktreeInfo {
    // ...
}

// 6. Functions and methods
pub fn list_worktrees() -> Result<Vec<WorktreeInfo>, AppError> {
    // ...
}

// 7. Tests (at bottom)
#[cfg(test)]
mod tests {
    // ...
}
```

### Import Grouping
```rust
// Group 1: std library
use std::collections::HashMap;
use std::path::Path;

// Group 2: External crates (alphabetical)
use git2::Repository;
use serde::Serialize;
use tokio::sync::Mutex;

// Group 3: Crate-local imports
use crate::error::AppError;
use super::WorktreeManager;
```

## Error Handling

### Use `thiserror` for Error Types
```rust
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "type", content = "message")]
pub enum AppError {
    #[error("Repository not found: {0}")]
    RepositoryNotFound(String),

    #[error("Git operation failed: {0}")]
    GitOperationFailed(String),
}
```

### Error Propagation
```rust
// Prefer: Use ? operator with meaningful context
fn open_repo(path: &str) -> Result<Repository, AppError> {
    Repository::open(path)
        .map_err(|e| AppError::RepositoryNotFound(format!("{}: {}", path, e)))
}

// Avoid: Unwrap in library code
fn bad_open_repo(path: &str) -> Repository {
    Repository::open(path).unwrap()  // Don't do this
}
```

### Result Return Types
```rust
// Always use Result for fallible operations
pub async fn list_worktrees(repo_path: &str) -> Result<Vec<WorktreeInfo>, AppError>

// Use Option only when absence is not an error
pub fn get_branch_name(head: &Reference) -> Option<String>
```

## Structs and Data Types

### Derive Order
```rust
// Consistent derive order: Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorktreeInfo {
    pub name: String,
    pub path: String,
    pub branch: Option<String>,
    pub is_main: bool,
}
```

### Field Visibility
```rust
// Public structs for API: all fields pub
#[derive(Debug, Serialize)]
pub struct WorktreeInfo {
    pub name: String,
    pub path: String,
}

// Internal structs: private fields with methods
pub struct WorktreeManager {
    cache: HashMap<String, Vec<WorktreeInfo>>,
}

impl WorktreeManager {
    pub fn new() -> Self { /* ... */ }
    pub fn get_cached(&self, path: &str) -> Option<&Vec<WorktreeInfo>> { /* ... */ }
}
```

## Functions and Methods

### Function Signatures
```rust
// Parameters: use references for borrowed data
pub fn process_worktree(info: &WorktreeInfo) -> Result<(), AppError>

// Return owned data when caller needs ownership
pub fn create_worktree_info(name: String, path: String) -> WorktreeInfo

// Use impl Trait for flexible inputs
pub fn open_repo(path: impl AsRef<Path>) -> Result<Repository, AppError>
```

### Async Functions
```rust
// Async functions that do I/O
pub async fn fetch_remote(path: &str) -> Result<FetchResult, AppError> {
    tokio::task::spawn_blocking(move || {
        // Blocking git operations here
    }).await?
}
```

### Method Chaining
```rust
// Good: readable chain with clear intent
let worktrees = repo
    .worktrees()?
    .iter()
    .filter_map(|name| name)
    .map(|name| self.get_worktree_info(repo, name))
    .collect::<Result<Vec<_>, _>>()?;

// Avoid: overly long chains without intermediate variables
```

## Control Flow

### Pattern Matching
```rust
// Exhaustive matching preferred
match result {
    Ok(value) => process(value),
    Err(AppError::RepositoryNotFound(path)) => log_not_found(&path),
    Err(AppError::GitOperationFailed(msg)) => log_failure(&msg),
    Err(e) => return Err(e),
}

// Use if let for single-variant checks
if let Some(branch) = head.shorthand() {
    info.branch = Some(branch.to_string());
}
```

### Early Returns
```rust
// Good: early returns reduce nesting
pub fn validate_repo(path: &str) -> Result<(), AppError> {
    if path.is_empty() {
        return Err(AppError::PathError("Empty path".to_string()));
    }

    if !Path::new(path).exists() {
        return Err(AppError::RepositoryNotFound(path.to_string()));
    }

    Ok(())
}
```

## Comments and Documentation

### Doc Comments
```rust
/// Lists all worktrees for the given repository.
///
/// Returns both the main worktree and all linked worktrees.
/// Each worktree includes branch information and status.
///
/// # Arguments
/// * `repo_path` - Absolute path to the git repository
///
/// # Errors
/// Returns `AppError::RepositoryNotFound` if the path is not a valid git repository.
pub async fn list_worktrees(repo_path: &str) -> Result<Vec<WorktreeInfo>, AppError>
```

### Inline Comments
```rust
// Use sparingly - code should be self-explanatory
// Good: explain WHY, not WHAT
let statuses = repo.statuses(None)?;
// Empty status list means clean working tree
if statuses.is_empty() {
    return Ok(false);
}
```

## Tauri-Specific Patterns

### Command Definition
```rust
#[tauri::command]
pub async fn list_worktrees(
    repo_path: String,
    state: State<'_, AppState>,
) -> Result<Vec<WorktreeInfo>, AppError> {
    state.manager.list_worktrees(&repo_path).await
}
```

### State Management
```rust
// Wrap shared state in appropriate sync primitives
pub struct AppState {
    pub manager: WorktreeManager,
    pub cache: Mutex<HashMap<String, CacheEntry>>,
}

// Access in commands
#[tauri::command]
pub async fn cached_operation(state: State<'_, AppState>) -> Result<Data, AppError> {
    let cache = state.cache.lock().await;
    // ...
}
```

## Testing

### Test Organization
```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    // Helper functions at top
    fn setup_test_repo() -> TempDir { /* ... */ }

    // Tests grouped by function/feature
    mod list_worktrees {
        use super::*;

        #[tokio::test]
        async fn returns_main_worktree() { /* ... */ }

        #[tokio::test]
        async fn includes_linked_worktrees() { /* ... */ }
    }

    mod add_worktree {
        use super::*;

        #[tokio::test]
        async fn creates_directory() { /* ... */ }
    }
}
```

### Test Naming
```rust
// Format: test_<function>_<scenario>_<expected_result>
#[test]
fn test_parse_status_with_modified_files_returns_changes()

#[test]
fn test_validate_path_with_empty_string_returns_error()
```
