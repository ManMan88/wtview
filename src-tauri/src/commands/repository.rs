use crate::error::{AppError, AppResult};
use crate::git::worktree_manager::validate_repository;
use serde::Serialize;
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Serialize)]
pub struct RepositoryInfo {
    pub path: String,
    pub name: String,
    pub is_bare: bool,
}

/// Opens a file dialog to select a git repository directory
#[tauri::command]
pub async fn select_repository(app: tauri::AppHandle) -> AppResult<Option<RepositoryInfo>> {
    let home_dir = dirs::home_dir().unwrap_or_default();
    let folder = app
        .dialog()
        .file()
        .set_title("Select Git Repository")
        .set_directory(home_dir)
        .blocking_pick_folder();

    match folder {
        Some(file_path) => {
            let path_str = file_path.to_string();

            // Validate that this is a git repository
            let repo = validate_repository(&path_str)?;

            let name = file_path
                .as_path()
                .and_then(|p| p.file_name())
                .and_then(|s| s.to_str())
                .map(String::from)
                .unwrap_or_else(|| "Unknown".to_string());

            Ok(Some(RepositoryInfo {
                path: path_str,
                name,
                is_bare: repo.is_bare(),
            }))
        }
        None => Ok(None),
    }
}

/// Validates and returns info about a repository at the given path
#[tauri::command]
pub async fn open_repository(path: String) -> AppResult<RepositoryInfo> {
    let repo = validate_repository(&path)?;

    let name = std::path::Path::new(&path)
        .file_name()
        .and_then(|s| s.to_str())
        .map(String::from)
        .unwrap_or_else(|| "Unknown".to_string());

    Ok(RepositoryInfo {
        path,
        name,
        is_bare: repo.is_bare(),
    })
}

/// Validates that a path is a valid git repository
#[tauri::command]
pub async fn validate_repo(path: String) -> AppResult<bool> {
    match validate_repository(&path) {
        Ok(_) => Ok(true),
        Err(AppError::NotARepository(_)) => Ok(false),
        Err(e) => Err(e),
    }
}
