use crate::error::AppResult;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct BranchInfo {
    pub name: String,
    pub is_remote: bool,
    pub is_current: bool,
}

#[tauri::command]
pub async fn list_branches(repo_path: String) -> AppResult<Vec<BranchInfo>> {
    crate::git::operations::list_branches(&repo_path)
}

#[tauri::command]
pub async fn checkout_branch(worktree_path: String, branch: String) -> AppResult<()> {
    crate::git::operations::checkout(&worktree_path, &branch)
}
