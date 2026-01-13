use crate::error::AppResult;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct WorktreeInfo {
    pub path: String,
    pub branch: Option<String>,
    pub is_main: bool,
    pub is_locked: bool,
}

#[tauri::command]
pub async fn list_worktrees(repo_path: String) -> AppResult<Vec<WorktreeInfo>> {
    crate::git::worktree_manager::list_worktrees(&repo_path)
}

#[tauri::command]
pub async fn add_worktree(
    repo_path: String,
    worktree_path: String,
    branch: String,
    create_branch: bool,
) -> AppResult<()> {
    crate::git::worktree_manager::add_worktree(&repo_path, &worktree_path, &branch, create_branch)
}

#[tauri::command]
pub async fn remove_worktree(repo_path: String, worktree_path: String, force: bool) -> AppResult<()> {
    crate::git::worktree_manager::remove_worktree(&repo_path, &worktree_path, force)
}

#[tauri::command]
pub async fn lock_worktree(
    repo_path: String,
    worktree_path: String,
    reason: Option<String>,
) -> AppResult<()> {
    crate::git::worktree_manager::lock_worktree(
        &repo_path,
        &worktree_path,
        reason.as_deref(),
    )
}

#[tauri::command]
pub async fn unlock_worktree(repo_path: String, worktree_path: String) -> AppResult<()> {
    crate::git::worktree_manager::unlock_worktree(&repo_path, &worktree_path)
}
