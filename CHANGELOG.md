# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Worktree Management**
  - List all worktrees in a repository
  - Create new worktrees with branch selection
  - Delete worktrees with safety checks
- **Branch Selection**
  - Branch selector dialog for worktree creation
  - Local and remote branch grouping
  - Branch checkout functionality
- **Worktree Locking**
  - Lock worktrees to prevent accidental deletion
  - Unlock worktrees
- **Git Status Display**
  - Show worktree status (ahead/behind tracking branch)
  - Display staged and unstaged changes
  - Real-time status updates
- **Git Operations**
  - Fetch from remote repositories
  - Pull changes from tracking branch
  - Push commits to remote repositories
  - Create commits with staged changes
  - Stage and unstage individual files
- **Cross-Platform Support**
  - Linux support
  - macOS support
  - Windows support
- **User Interface**
  - Intuitive worktree list view with status indicators
  - Git operation panels with command output display
  - Responsive design with dark mode support
  - File dialog for repository selection
