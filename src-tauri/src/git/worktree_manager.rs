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
    fn test_list_worktrees_main_only() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path().to_str().unwrap();

        let worktrees = list_worktrees(repo_path).unwrap();

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
            .unwrap();

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
            .unwrap();

        let worktrees = list_worktrees(repo_path).unwrap();

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
            .unwrap();
    }

    #[test]
    fn test_list_worktrees_invalid_path() {
        let result = list_worktrees("/nonexistent/path");
        assert!(result.is_err());
    }

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
        let worktrees = list_worktrees(repo_path).unwrap();
        assert_eq!(worktrees.len(), 2);

        // Cleanup
        StdCommand::new("git")
            .current_dir(repo_path)
            .args(["worktree", "remove", worktree_path.to_str().unwrap()])
            .output()
            .unwrap();
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
            .unwrap();

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
            .unwrap();
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

    #[test]
    fn test_remove_worktree() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path().to_str().unwrap();

        // Create a worktree first
        StdCommand::new("git")
            .current_dir(repo_path)
            .args(["branch", "to-remove"])
            .output()
            .unwrap();

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
            .unwrap();

        assert!(worktree_path.exists());

        let result = remove_worktree(repo_path, worktree_path.to_str().unwrap(), false);

        assert!(result.is_ok());
        assert!(!worktree_path.exists());
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
            .unwrap();

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
            .unwrap();

        // Create uncommitted changes
        let test_file = worktree_path.join("uncommitted.txt");
        fs::write(&test_file, "uncommitted content").unwrap();

        // Force remove should work
        let result = remove_worktree(repo_path, worktree_path.to_str().unwrap(), true);
        assert!(result.is_ok());
    }

    #[test]
    fn test_remove_worktree_nonexistent() {
        let temp_dir = create_test_repo();
        let repo_path = temp_dir.path().to_str().unwrap();

        let result = remove_worktree(repo_path, "/nonexistent/worktree", false);
        assert!(result.is_err());
    }
}
