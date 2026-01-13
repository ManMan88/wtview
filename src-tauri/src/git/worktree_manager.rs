use crate::commands::worktree::WorktreeInfo;
use crate::error::{AppError, AppResult};
use git2::{Repository, StatusOptions};
use std::path::Path;
use std::process::Command;

/// Validates that the given path is a valid git repository
pub fn validate_repository(repo_path: &str) -> AppResult<Repository> {
    let path = Path::new(repo_path);
    if !path.exists() {
        return Err(AppError::InvalidPath(format!(
            "Path does not exist: {}",
            repo_path
        )));
    }

    Repository::open(repo_path)
        .map_err(|_| AppError::NotARepository(repo_path.to_string()))
}

/// Checks if a worktree has uncommitted changes
pub fn has_uncommitted_changes(worktree_path: &str) -> AppResult<bool> {
    let repo = Repository::open(worktree_path)?;

    let mut opts = StatusOptions::new();
    opts.include_untracked(true);
    opts.recurse_untracked_dirs(false);

    let statuses = repo.statuses(Some(&mut opts))?;
    Ok(!statuses.is_empty())
}

pub fn list_worktrees(repo_path: &str) -> AppResult<Vec<WorktreeInfo>> {
    let repo = validate_repository(repo_path)?;
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
                wt_repo
                    .head()
                    .ok()
                    .and_then(|h| h.shorthand().map(String::from))
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
    // Validate the repository first
    validate_repository(repo_path)?;

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
        let error_msg = stderr.to_string();

        // Check for specific error conditions
        if error_msg.contains("already checked out") {
            return Err(AppError::BranchInUse(branch.to_string()));
        }

        return Err(AppError::Command(error_msg));
    }

    Ok(())
}

pub fn remove_worktree(repo_path: &str, worktree_path: &str, force: bool) -> AppResult<()> {
    // Validate the repository first
    let repo = validate_repository(repo_path)?;

    // Check if the worktree exists
    let worktree_exists = repo
        .worktrees()?
        .iter()
        .flatten()
        .any(|name| {
            repo.find_worktree(name)
                .map(|wt| wt.path().to_string_lossy() == worktree_path)
                .unwrap_or(false)
        });

    if !worktree_exists {
        return Err(AppError::WorktreeNotFound(worktree_path.to_string()));
    }

    // Check for uncommitted changes if not forcing
    if !force {
        if has_uncommitted_changes(worktree_path)? {
            return Err(AppError::UncommittedChanges);
        }
    }

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

pub fn lock_worktree(repo_path: &str, worktree_path: &str, reason: Option<&str>) -> AppResult<()> {
    validate_repository(repo_path)?;

    let mut cmd = Command::new("git");
    cmd.current_dir(repo_path);
    cmd.args(["worktree", "lock"]);

    if let Some(reason) = reason {
        cmd.args(["--reason", reason]);
    }

    cmd.arg(worktree_path);

    let output = cmd.output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::Command(stderr.to_string()));
    }

    Ok(())
}

pub fn unlock_worktree(repo_path: &str, worktree_path: &str) -> AppResult<()> {
    validate_repository(repo_path)?;

    let mut cmd = Command::new("git");
    cmd.current_dir(repo_path);
    cmd.args(["worktree", "unlock", worktree_path]);

    let output = cmd.output()?;

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

    /// Helper to create a test git repository
    fn create_test_repo() -> TempDir {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let repo_path = temp_dir.path();

        StdCommand::new("git")
            .current_dir(repo_path)
            .args(["init"])
            .output()
            .expect("Failed to init repo");

        StdCommand::new("git")
            .current_dir(repo_path)
            .args(["config", "user.email", "test@test.com"])
            .output()
            .expect("Failed to set email");

        StdCommand::new("git")
            .current_dir(repo_path)
            .args(["config", "user.name", "Test User"])
            .output()
            .expect("Failed to set name");

        // Create an initial commit so we have a valid HEAD
        let test_file = repo_path.join("README.md");
        fs::write(&test_file, "# Test Repository").expect("Failed to write file");

        StdCommand::new("git")
            .current_dir(repo_path)
            .args(["add", "."])
            .output()
            .expect("Failed to add files");

        StdCommand::new("git")
            .current_dir(repo_path)
            .args(["commit", "-m", "Initial commit"])
            .output()
            .expect("Failed to commit");

        temp_dir
    }

    // ==================== Validation Tests ====================

    #[test]
    fn test_validate_repository_success() {
        let temp_dir = create_test_repo();
        let result = validate_repository(temp_dir.path().to_str().unwrap());
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_repository_not_a_repo() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let result = validate_repository(temp_dir.path().to_str().unwrap());
        assert!(matches!(result, Err(AppError::NotARepository(_))));
    }

    #[test]
    fn test_validate_repository_invalid_path() {
        let result = validate_repository("/nonexistent/path/to/repo");
        assert!(matches!(result, Err(AppError::InvalidPath(_))));
    }

    // ==================== List Worktrees Tests ====================

    #[test]
    fn test_list_worktrees_main_only() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path().to_str().unwrap();

        let worktrees = list_worktrees(repo_path).expect("Failed to list worktrees");

        assert_eq!(worktrees.len(), 1);
        assert!(worktrees[0].is_main);
        assert!(!worktrees[0].is_locked);
        assert!(worktrees[0].branch.is_some());
    }

    #[test]
    fn test_list_worktrees_with_linked_worktree() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path().to_str().unwrap();

        // Create a feature branch
        StdCommand::new("git")
            .current_dir(repo_path)
            .args(["branch", "feature-branch"])
            .output()
            .expect("Failed to create branch");

        // Create a linked worktree
        let worktree_path = temp_dir.path().parent().unwrap().join("feature-worktree");
        StdCommand::new("git")
            .current_dir(repo_path)
            .args([
                "worktree",
                "add",
                worktree_path.to_str().unwrap(),
                "feature-branch",
            ])
            .output()
            .expect("Failed to create worktree");

        let worktrees = list_worktrees(repo_path).expect("Failed to list worktrees");

        assert_eq!(worktrees.len(), 2);

        let main_wt = worktrees.iter().find(|w| w.is_main).unwrap();
        assert!(main_wt.is_main);

        let linked_wt = worktrees.iter().find(|w| !w.is_main).unwrap();
        assert!(!linked_wt.is_main);
        assert_eq!(linked_wt.branch.as_deref(), Some("feature-branch"));

        // Cleanup
        StdCommand::new("git")
            .current_dir(repo_path)
            .args(["worktree", "remove", worktree_path.to_str().unwrap()])
            .output()
            .expect("Failed to remove worktree");
    }

    #[test]
    fn test_list_worktrees_invalid_path() {
        let result = list_worktrees("/nonexistent/path");
        assert!(result.is_err());
    }

    // ==================== Add Worktree Tests ====================

    #[test]
    fn test_add_worktree_with_new_branch() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path().to_str().unwrap();
        let worktree_path = temp_dir.path().parent().unwrap().join("new-feature");

        let result = add_worktree(
            repo_path,
            worktree_path.to_str().unwrap(),
            "new-feature-branch",
            true,
        );

        assert!(result.is_ok());
        assert!(worktree_path.exists());

        // Verify the worktree was created
        let worktrees = list_worktrees(repo_path).expect("Failed to list worktrees");
        assert_eq!(worktrees.len(), 2);

        // Find the new worktree
        let new_worktree = worktrees.iter().find(|wt| !wt.is_main);
        assert!(new_worktree.is_some());
        assert_eq!(
            new_worktree.unwrap().branch,
            Some("new-feature-branch".to_string())
        );

        // Cleanup
        StdCommand::new("git")
            .current_dir(repo_path)
            .args(["worktree", "remove", worktree_path.to_str().unwrap()])
            .output()
            .expect("Failed to remove worktree");
    }

    #[test]
    fn test_add_worktree_existing_branch() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path().to_str().unwrap();

        // Create a branch first
        StdCommand::new("git")
            .current_dir(repo_path)
            .args(["branch", "existing-branch"])
            .output()
            .expect("Failed to create branch");

        let worktree_path = temp_dir.path().parent().unwrap().join("existing-wt");

        let result = add_worktree(
            repo_path,
            worktree_path.to_str().unwrap(),
            "existing-branch",
            false,
        );

        assert!(result.is_ok());
        assert!(worktree_path.exists());

        // Cleanup
        StdCommand::new("git")
            .current_dir(repo_path)
            .args(["worktree", "remove", worktree_path.to_str().unwrap()])
            .output()
            .expect("Failed to remove worktree");
    }

    #[test]
    fn test_add_worktree_invalid_branch() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path().to_str().unwrap();
        let worktree_path = temp_dir.path().parent().unwrap().join("invalid-wt");

        let result = add_worktree(
            repo_path,
            worktree_path.to_str().unwrap(),
            "nonexistent-branch",
            false,
        );

        assert!(result.is_err());
    }

    // ==================== Remove Worktree Tests ====================

    #[test]
    fn test_remove_worktree() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path().to_str().unwrap();

        // Create a worktree first
        StdCommand::new("git")
            .current_dir(repo_path)
            .args(["branch", "to-remove"])
            .output()
            .expect("Failed to create branch");

        let worktree_path = temp_dir.path().parent().unwrap().join("to-remove-wt");
        StdCommand::new("git")
            .current_dir(repo_path)
            .args([
                "worktree",
                "add",
                worktree_path.to_str().unwrap(),
                "to-remove",
            ])
            .output()
            .expect("Failed to create worktree");

        assert!(worktree_path.exists());

        let result = remove_worktree(repo_path, worktree_path.to_str().unwrap(), false);

        assert!(result.is_ok());
        assert!(!worktree_path.exists());
    }

    #[test]
    fn test_remove_worktree_with_uncommitted_changes_fails() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path().to_str().unwrap();

        // Create a worktree
        let worktree_path = temp_dir.path().parent().unwrap().join("worktree-dirty");
        add_worktree(
            repo_path,
            worktree_path.to_str().unwrap(),
            "dirty-branch",
            true,
        )
        .expect("Failed to add worktree");

        // Create uncommitted changes in the worktree
        let new_file = worktree_path.join("uncommitted.txt");
        fs::write(&new_file, "Uncommitted content").expect("Failed to write file");

        // Try to remove without force - should fail
        let result = remove_worktree(repo_path, worktree_path.to_str().unwrap(), false);
        assert!(matches!(result, Err(AppError::UncommittedChanges)));

        // Remove with force - should succeed
        remove_worktree(repo_path, worktree_path.to_str().unwrap(), true)
            .expect("Failed to force remove worktree");
    }

    #[test]
    fn test_remove_worktree_force() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path().to_str().unwrap();

        // Create a worktree
        StdCommand::new("git")
            .current_dir(repo_path)
            .args(["branch", "force-remove"])
            .output()
            .expect("Failed to create branch");

        let worktree_path = temp_dir.path().parent().unwrap().join("force-remove-wt");
        StdCommand::new("git")
            .current_dir(repo_path)
            .args([
                "worktree",
                "add",
                worktree_path.to_str().unwrap(),
                "force-remove",
            ])
            .output()
            .expect("Failed to create worktree");

        // Create uncommitted changes
        let test_file = worktree_path.join("uncommitted.txt");
        fs::write(&test_file, "uncommitted content").expect("Failed to write file");

        // Force remove should work
        let result = remove_worktree(repo_path, worktree_path.to_str().unwrap(), true);
        assert!(result.is_ok());
    }

    #[test]
    fn test_remove_worktree_not_found() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path().to_str().unwrap();

        let result = remove_worktree(repo_path, "/nonexistent/worktree", false);
        assert!(matches!(result, Err(AppError::WorktreeNotFound(_))));
    }

    // ==================== Uncommitted Changes Tests ====================

    #[test]
    fn test_has_uncommitted_changes() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path().to_str().unwrap();

        // Initially should have no uncommitted changes
        assert!(!has_uncommitted_changes(repo_path).expect("Failed to check changes"));

        // Create a new file
        let new_file = temp_dir.path().join("new_file.txt");
        fs::write(&new_file, "New content").expect("Failed to write file");

        // Now should have uncommitted changes
        assert!(has_uncommitted_changes(repo_path).expect("Failed to check changes"));
    }
}
