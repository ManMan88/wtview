use crate::commands::branches::BranchInfo;
use crate::commands::git_ops::{FileStatus, GitStatusResult};
use crate::error::{AppError, AppResult};
use git2::{Repository, StatusOptions};
use std::path::Path;
use std::process::Command;

/// Validates that a worktree path exists and is a directory
fn validate_worktree_path(worktree_path: &str) -> AppResult<()> {
    let path = Path::new(worktree_path);
    if !path.exists() {
        return Err(AppError::InvalidPath(format!(
            "Worktree path does not exist: {}",
            worktree_path
        )));
    }
    if !path.is_dir() {
        return Err(AppError::InvalidPath(format!(
            "Worktree path is not a directory: {}",
            worktree_path
        )));
    }
    Ok(())
}

pub fn fetch(worktree_path: &str) -> AppResult<String> {
    validate_worktree_path(worktree_path)?;

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
    validate_worktree_path(worktree_path)?;

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
    validate_worktree_path(worktree_path)?;

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

        // Handle staged (index) changes
        if status.is_index_new() {
            files.push(FileStatus {
                path: path.clone(),
                status: "added".to_string(),
                staged: true,
            });
        } else if status.is_index_modified() {
            files.push(FileStatus {
                path: path.clone(),
                status: "modified".to_string(),
                staged: true,
            });
        } else if status.is_index_deleted() {
            files.push(FileStatus {
                path: path.clone(),
                status: "deleted".to_string(),
                staged: true,
            });
        } else if status.is_index_renamed() {
            files.push(FileStatus {
                path: path.clone(),
                status: "renamed".to_string(),
                staged: true,
            });
        } else if status.is_index_typechange() {
            files.push(FileStatus {
                path: path.clone(),
                status: "typechange".to_string(),
                staged: true,
            });
        }

        // Handle unstaged (worktree) changes
        if status.is_wt_new() {
            files.push(FileStatus {
                path: path.clone(),
                status: "untracked".to_string(),
                staged: false,
            });
        } else if status.is_wt_modified() {
            files.push(FileStatus {
                path: path.clone(),
                status: "modified".to_string(),
                staged: false,
            });
        } else if status.is_wt_deleted() {
            files.push(FileStatus {
                path: path.clone(),
                status: "deleted".to_string(),
                staged: false,
            });
        } else if status.is_wt_renamed() {
            files.push(FileStatus {
                path: path.clone(),
                status: "renamed".to_string(),
                staged: false,
            });
        } else if status.is_wt_typechange() {
            files.push(FileStatus {
                path: path.clone(),
                status: "typechange".to_string(),
                staged: false,
            });
        }

        // Handle conflicted files
        if status.is_conflicted() {
            files.push(FileStatus {
                path,
                status: "conflicted".to_string(),
                staged: false,
            });
        }
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
    validate_worktree_path(worktree_path)?;

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
    validate_worktree_path(worktree_path)?;

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
    validate_worktree_path(worktree_path)?;

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
    validate_worktree_path(worktree_path)?;

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

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::process::Command as StdCommand;
    use tempfile::TempDir;

    fn create_test_repo() -> TempDir {
        let temp_dir = TempDir::new().unwrap();
        let repo_path = temp_dir.path();

        StdCommand::new("git")
            .current_dir(repo_path)
            .args(["init"])
            .output()
            .unwrap();

        StdCommand::new("git")
            .current_dir(repo_path)
            .args(["config", "user.email", "test@test.com"])
            .output()
            .unwrap();

        StdCommand::new("git")
            .current_dir(repo_path)
            .args(["config", "user.name", "Test User"])
            .output()
            .unwrap();

        // Create an initial commit
        let test_file = repo_path.join("README.md");
        fs::write(&test_file, "# Test Repository").unwrap();

        StdCommand::new("git")
            .current_dir(repo_path)
            .args(["add", "."])
            .output()
            .unwrap();

        StdCommand::new("git")
            .current_dir(repo_path)
            .args(["commit", "-m", "Initial commit"])
            .output()
            .unwrap();

        temp_dir
    }

    #[test]
    fn test_status_clean_repo() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path().to_str().unwrap();

        let result = status(repo_path).unwrap();

        assert!(result.branch.is_some());
        assert!(result.files.is_empty());
        assert_eq!(result.ahead, 0);
        assert_eq!(result.behind, 0);
    }

    #[test]
    fn test_status_with_untracked_file() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path();

        // Create an untracked file
        let new_file = repo_path.join("untracked.txt");
        fs::write(&new_file, "untracked content").unwrap();

        let result = status(repo_path.to_str().unwrap()).unwrap();

        assert_eq!(result.files.len(), 1);
        assert_eq!(result.files[0].path, "untracked.txt");
        assert_eq!(result.files[0].status, "untracked");
        assert!(!result.files[0].staged);
    }

    #[test]
    fn test_status_with_staged_file() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path();

        // Create and stage a new file
        let new_file = repo_path.join("staged.txt");
        fs::write(&new_file, "staged content").unwrap();

        StdCommand::new("git")
            .current_dir(repo_path)
            .args(["add", "staged.txt"])
            .output()
            .unwrap();

        let result = status(repo_path.to_str().unwrap()).unwrap();

        assert_eq!(result.files.len(), 1);
        assert_eq!(result.files[0].path, "staged.txt");
        assert_eq!(result.files[0].status, "added");
        assert!(result.files[0].staged);
    }

    #[test]
    fn test_status_with_modified_file() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path();

        // Modify an existing file
        let readme = repo_path.join("README.md");
        fs::write(&readme, "# Modified Repository").unwrap();

        let result = status(repo_path.to_str().unwrap()).unwrap();

        assert_eq!(result.files.len(), 1);
        assert_eq!(result.files[0].path, "README.md");
        assert_eq!(result.files[0].status, "modified");
        assert!(!result.files[0].staged);
    }

    #[test]
    fn test_status_with_deleted_file() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path();

        // Delete an existing file
        let readme = repo_path.join("README.md");
        fs::remove_file(&readme).unwrap();

        let result = status(repo_path.to_str().unwrap()).unwrap();

        assert_eq!(result.files.len(), 1);
        assert_eq!(result.files[0].path, "README.md");
        assert_eq!(result.files[0].status, "deleted");
        assert!(!result.files[0].staged);
    }

    #[test]
    fn test_status_invalid_path() {
        let result = status("/nonexistent/path");
        assert!(result.is_err());
    }

    #[test]
    fn test_stage_file() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path();

        // Create a new file
        let new_file = repo_path.join("to_stage.txt");
        fs::write(&new_file, "content").unwrap();

        // Stage the file
        let result = stage(repo_path.to_str().unwrap(), "to_stage.txt");
        assert!(result.is_ok());

        // Verify it's staged
        let status_result = status(repo_path.to_str().unwrap()).unwrap();
        let staged_file = status_result.files.iter().find(|f| f.path == "to_stage.txt");
        assert!(staged_file.is_some());
        assert!(staged_file.unwrap().staged);
    }

    #[test]
    fn test_unstage_file() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path();

        // Create and stage a new file
        let new_file = repo_path.join("to_unstage.txt");
        fs::write(&new_file, "content").unwrap();

        StdCommand::new("git")
            .current_dir(repo_path)
            .args(["add", "to_unstage.txt"])
            .output()
            .unwrap();

        // Verify it's staged
        let status_before = status(repo_path.to_str().unwrap()).unwrap();
        let file_before = status_before
            .files
            .iter()
            .find(|f| f.path == "to_unstage.txt")
            .unwrap();
        assert!(file_before.staged);

        // Unstage the file
        let result = unstage(repo_path.to_str().unwrap(), "to_unstage.txt");
        assert!(result.is_ok());

        // Verify it's no longer staged
        let status_after = status(repo_path.to_str().unwrap()).unwrap();
        let file_after = status_after
            .files
            .iter()
            .find(|f| f.path == "to_unstage.txt")
            .unwrap();
        assert!(!file_after.staged);
    }

    #[test]
    fn test_commit() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path();

        // Create and stage a new file
        let new_file = repo_path.join("committed.txt");
        fs::write(&new_file, "committed content").unwrap();

        StdCommand::new("git")
            .current_dir(repo_path)
            .args(["add", "committed.txt"])
            .output()
            .unwrap();

        // Commit
        let result = commit(repo_path.to_str().unwrap(), "Test commit message");
        assert!(result.is_ok());

        // Verify the commit was made
        let status_result = status(repo_path.to_str().unwrap()).unwrap();
        assert!(status_result.files.is_empty());
    }

    #[test]
    fn test_commit_empty() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path().to_str().unwrap();

        // Try to commit with nothing staged
        let result = commit(repo_path, "Empty commit");
        assert!(result.is_err());
    }

    #[test]
    fn test_list_branches() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path().to_str().unwrap();

        let branches = list_branches(repo_path).unwrap();

        assert!(!branches.is_empty());

        // Should have at least one local branch (main/master)
        let local_branches: Vec<_> = branches.iter().filter(|b| !b.is_remote).collect();
        assert!(!local_branches.is_empty());

        // Current branch should be marked
        let current_branch = branches.iter().find(|b| b.is_current);
        assert!(current_branch.is_some());
    }

    #[test]
    fn test_list_branches_with_multiple() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path();

        // Create additional branches
        StdCommand::new("git")
            .current_dir(repo_path)
            .args(["branch", "feature-1"])
            .output()
            .unwrap();

        StdCommand::new("git")
            .current_dir(repo_path)
            .args(["branch", "feature-2"])
            .output()
            .unwrap();

        let branches = list_branches(repo_path.to_str().unwrap()).unwrap();

        let local_branches: Vec<_> = branches.iter().filter(|b| !b.is_remote).collect();
        assert!(local_branches.len() >= 3); // main/master + feature-1 + feature-2

        assert!(branches.iter().any(|b| b.name == "feature-1"));
        assert!(branches.iter().any(|b| b.name == "feature-2"));
    }

    #[test]
    fn test_list_branches_invalid_path() {
        let result = list_branches("/nonexistent/path");
        assert!(result.is_err());
    }

    #[test]
    fn test_checkout_branch() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path();

        // Create a new branch
        StdCommand::new("git")
            .current_dir(repo_path)
            .args(["branch", "checkout-target"])
            .output()
            .unwrap();

        // Checkout the new branch
        let result = checkout(repo_path.to_str().unwrap(), "checkout-target");
        assert!(result.is_ok());

        // Verify the branch changed
        let branches = list_branches(repo_path.to_str().unwrap()).unwrap();
        let current = branches.iter().find(|b| b.is_current).unwrap();
        assert_eq!(current.name, "checkout-target");
    }

    #[test]
    fn test_checkout_nonexistent_branch() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path().to_str().unwrap();

        let result = checkout(repo_path, "nonexistent-branch");
        assert!(result.is_err());
    }

    #[test]
    fn test_fetch_no_remote() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path().to_str().unwrap();

        // Fetch should fail gracefully when there's no remote
        let result = fetch(repo_path);
        // May succeed with empty output or fail - both are acceptable
        // We just verify it doesn't panic
        let _ = result;
    }

    #[test]
    fn test_pull_no_remote() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path().to_str().unwrap();

        // Pull should fail when there's no remote
        let result = pull(repo_path);
        assert!(result.is_err());
    }

    #[test]
    fn test_push_no_remote() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path().to_str().unwrap();

        // Push should fail when there's no remote
        let result = push(repo_path);
        assert!(result.is_err());
    }
}
