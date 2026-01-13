use crate::commands::worktree::WorktreeInfo;
use crate::error::{AppError, AppResult};
use git2::Repository;
use std::process::Command;

pub fn list_worktrees(repo_path: &str) -> AppResult<Vec<WorktreeInfo>> {
    let repo = Repository::open(repo_path)?;
    let mut worktrees = Vec::new();

    // Get the main worktree
    let workdir = repo
        .workdir()
        .ok_or_else(|| AppError::InvalidPath("Repository has no working directory".into()))?;

    let head = repo.head().ok();
    let main_branch = head.as_ref().and_then(|h| h.shorthand().map(String::from));

    worktrees.push(WorktreeInfo {
        path: workdir.to_string_lossy().to_string(),
        branch: main_branch,
        is_main: true,
        is_locked: false,
    });

    // Get linked worktrees
    for name in repo.worktrees()?.iter().flatten() {
        if let Ok(wt) = repo.find_worktree(name) {
            let wt_path = wt.path().to_string_lossy().to_string();

            // Try to get branch info from the worktree
            let branch = if let Ok(wt_repo) = Repository::open(wt.path()) {
                wt_repo.head().ok().and_then(|h| h.shorthand().map(String::from))
            } else {
                None
            };

            worktrees.push(WorktreeInfo {
                path: wt_path,
                branch,
                is_main: false,
                is_locked: wt.is_locked(),
            });
        }
    }

    Ok(worktrees)
}

pub fn add_worktree(
    repo_path: &str,
    worktree_path: &str,
    branch: &str,
    create_branch: bool,
) -> AppResult<()> {
    let mut cmd = Command::new("git");
    cmd.current_dir(repo_path);
    cmd.args(["worktree", "add"]);

    if create_branch {
        cmd.args(["-b", branch, worktree_path]);
    } else {
        cmd.args([worktree_path, branch]);
    }

    let output = cmd.output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::Command(stderr.to_string()));
    }

    Ok(())
}

pub fn remove_worktree(repo_path: &str, worktree_path: &str, force: bool) -> AppResult<()> {
    let mut cmd = Command::new("git");
    cmd.current_dir(repo_path);
    cmd.args(["worktree", "remove"]);

    if force {
        cmd.arg("--force");
    }

    cmd.arg(worktree_path);

    let output = cmd.output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::Command(stderr.to_string()));
    }

    Ok(())
}
