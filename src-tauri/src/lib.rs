mod commands;
mod error;
mod git;

use commands::{branches, git_ops, repository, worktree};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // Repository commands
            repository::select_repository,
            repository::open_repository,
            repository::validate_repo,
            // Worktree commands
            worktree::list_worktrees,
            worktree::add_worktree,
            worktree::remove_worktree,
            worktree::lock_worktree,
            worktree::unlock_worktree,
            // Git operations
            git_ops::git_fetch,
            git_ops::git_pull,
            git_ops::git_push,
            git_ops::git_status,
            git_ops::git_commit,
            git_ops::git_stage,
            git_ops::git_unstage,
            // Branch operations
            branches::list_branches,
            branches::checkout_branch,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
