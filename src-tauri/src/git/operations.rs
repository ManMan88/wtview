use crate::commands::branches::BranchInfo;
use crate::commands::git_ops::{FileStatus, GitStatusResult};
use crate::error::{AppError, AppResult};
use git2::{Repository, StatusOptions};
use std::process::Command;

pub fn fetch(worktree_path: &str) -> AppResult<String> {
    let output = Command::new("git")
        .current_dir(worktree_path)
        .args(["fetch", "--all"])
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::Command(stderr.to_string()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(stdout.to_string())
}

pub fn pull(worktree_path: &str) -> AppResult<String> {
    let output = Command::new("git")
        .current_dir(worktree_path)
        .args(["pull"])
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::Command(stderr.to_string()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(stdout.to_string())
}

pub fn push(worktree_path: &str) -> AppResult<String> {
    let output = Command::new("git")
        .current_dir(worktree_path)
        .args(["push"])
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::Command(stderr.to_string()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(stdout.to_string())
}

pub fn status(worktree_path: &str) -> AppResult<GitStatusResult> {
    let repo = Repository::open(worktree_path)?;

    let head = repo.head().ok();
    let branch = head.as_ref().and_then(|h| h.shorthand().map(String::from));

    let mut opts = StatusOptions::new();
    opts.include_untracked(true);
    opts.recurse_untracked_dirs(true);

    let statuses = repo.statuses(Some(&mut opts))?;
    let mut files = Vec::new();

    for entry in statuses.iter() {
        let path = entry.path().unwrap_or("").to_string();
        let status = entry.status();

        let (status_str, staged) = if status.is_index_new() {
            ("added", true)
        } else if status.is_index_modified() {
            ("modified", true)
        } else if status.is_index_deleted() {
            ("deleted", true)
        } else if status.is_wt_new() {
            ("untracked", false)
        } else if status.is_wt_modified() {
            ("modified", false)
        } else if status.is_wt_deleted() {
            ("deleted", false)
        } else {
            continue;
        };

        files.push(FileStatus {
            path,
            status: status_str.to_string(),
            staged,
        });
    }

    // Get ahead/behind counts
    let (ahead, behind) = get_ahead_behind(&repo).unwrap_or((0, 0));

    Ok(GitStatusResult {
        branch,
        files,
        ahead,
        behind,
    })
}

fn get_ahead_behind(repo: &Repository) -> Option<(u32, u32)> {
    let head = repo.head().ok()?;
    let local_oid = head.target()?;

    let branch_name = head.shorthand()?;
    let upstream_name = format!("origin/{}", branch_name);

    let upstream_ref = repo.find_reference(&format!("refs/remotes/{}", upstream_name)).ok()?;
    let upstream_oid = upstream_ref.target()?;

    let (ahead, behind) = repo.graph_ahead_behind(local_oid, upstream_oid).ok()?;
    Some((ahead as u32, behind as u32))
}

pub fn commit(worktree_path: &str, message: &str) -> AppResult<String> {
    let output = Command::new("git")
        .current_dir(worktree_path)
        .args(["commit", "-m", message])
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::Command(stderr.to_string()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(stdout.to_string())
}

pub fn stage(worktree_path: &str, file_path: &str) -> AppResult<()> {
    let output = Command::new("git")
        .current_dir(worktree_path)
        .args(["add", file_path])
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::Command(stderr.to_string()));
    }

    Ok(())
}

pub fn unstage(worktree_path: &str, file_path: &str) -> AppResult<()> {
    let output = Command::new("git")
        .current_dir(worktree_path)
        .args(["restore", "--staged", file_path])
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::Command(stderr.to_string()));
    }

    Ok(())
}

pub fn list_branches(repo_path: &str) -> AppResult<Vec<BranchInfo>> {
    let repo = Repository::open(repo_path)?;
    let mut branches = Vec::new();

    let head = repo.head().ok();
    let current_branch = head.as_ref().and_then(|h| h.shorthand().map(String::from));

    for branch_result in repo.branches(None)? {
        let (branch, branch_type) = branch_result?;
        if let Some(name) = branch.name()? {
            let is_remote = branch_type == git2::BranchType::Remote;
            let is_current = !is_remote && Some(name.to_string()) == current_branch;

            branches.push(BranchInfo {
                name: name.to_string(),
                is_remote,
                is_current,
            });
        }
    }

    Ok(branches)
}

pub fn checkout(worktree_path: &str, branch: &str) -> AppResult<()> {
    let output = Command::new("git")
        .current_dir(worktree_path)
        .args(["checkout", branch])
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::Command(stderr.to_string()));
    }

    Ok(())
}
