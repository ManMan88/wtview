use crate::error::AppResult;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct FileStatus {
    pub path: String,
    pub status: String,
    pub staged: bool,
}

#[derive(Debug, Serialize)]
pub struct GitStatusResult {
    pub branch: Option<String>,
    pub files: Vec<FileStatus>,
    pub ahead: u32,
    pub behind: u32,
}

#[tauri::command]
pub async fn git_fetch(worktree_path: String) -> AppResult<String> {
    crate::git::operations::fetch(&worktree_path)
}

#[tauri::command]
pub async fn git_pull(worktree_path: String) -> AppResult<String> {
    crate::git::operations::pull(&worktree_path)
}

#[tauri::command]
pub async fn git_push(worktree_path: String) -> AppResult<String> {
    crate::git::operations::push(&worktree_path)
}

#[tauri::command]
pub async fn git_status(worktree_path: String) -> AppResult<GitStatusResult> {
    crate::git::operations::status(&worktree_path)
}

#[tauri::command]
pub async fn git_commit(worktree_path: String, message: String) -> AppResult<String> {
    crate::git::operations::commit(&worktree_path, &message)
}

#[tauri::command]
pub async fn git_stage(worktree_path: String, file_path: String) -> AppResult<()> {
    crate::git::operations::stage(&worktree_path, &file_path)
}

#[tauri::command]
pub async fn git_unstage(worktree_path: String, file_path: String) -> AppResult<()> {
    crate::git::operations::unstage(&worktree_path, &file_path)
}
