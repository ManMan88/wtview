use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Git error: {0}")]
    Git(#[from] git2::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Command failed: {0}")]
    Command(String),

    #[error("Invalid path: {0}")]
    InvalidPath(String),

    #[error("Not a git repository: {0}")]
    NotARepository(String),

    #[error("Worktree has uncommitted changes")]
    UncommittedChanges,

    #[error("Worktree is locked: {0}")]
    WorktreeLocked(String),

    #[error("Branch already checked out in another worktree: {0}")]
    BranchInUse(String),

    #[error("Worktree not found: {0}")]
    WorktreeNotFound(String),

    #[error("{0}")]
    Other(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_error_display_git() {
        let err = AppError::Git(git2::Error::from_str("test git error"));
        assert!(err.to_string().contains("Git error"));
    }

    #[test]
    fn test_app_error_display_io() {
        let err = AppError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "file not found",
        ));
        assert!(err.to_string().contains("IO error"));
    }

    #[test]
    fn test_app_error_display_command() {
        let err = AppError::Command("command failed".to_string());
        assert_eq!(err.to_string(), "Command failed: command failed");
    }

    #[test]
    fn test_app_error_display_invalid_path() {
        let err = AppError::InvalidPath("/invalid/path".to_string());
        assert_eq!(err.to_string(), "Invalid path: /invalid/path");
    }

    #[test]
    fn test_app_error_display_uncommitted_changes() {
        let err = AppError::UncommittedChanges;
        assert_eq!(err.to_string(), "Worktree has uncommitted changes");
    }

    #[test]
    fn test_app_error_display_other() {
        let err = AppError::Other("some error".to_string());
        assert_eq!(err.to_string(), "some error");
    }

    #[test]
    fn test_app_error_serializes_to_string() {
        let err = AppError::Command("test error".to_string());
        let serialized = serde_json::to_string(&err).unwrap();
        assert_eq!(serialized, "\"Command failed: test error\"");
    }

    #[test]
    fn test_app_error_from_io_error() {
        let io_err = std::io::Error::new(std::io::ErrorKind::PermissionDenied, "access denied");
        let app_err: AppError = io_err.into();
        assert!(matches!(app_err, AppError::Io(_)));
    }

    #[test]
    fn test_app_error_from_git2_error() {
        let git_err = git2::Error::from_str("repository not found");
        let app_err: AppError = git_err.into();
        assert!(matches!(app_err, AppError::Git(_)));
    }
}
