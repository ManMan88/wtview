//! Tauri command handlers for the Git Worktree Manager.
//!
//! All commands are marked `async` even when calling synchronous functions.
//! Tauri automatically spawns blocking tasks for async commands, preventing
//! the main thread from being blocked during git operations which may involve
//! file I/O or subprocess execution.

pub mod branches;
pub mod git_ops;
pub mod repository;
pub mod worktree;
