# Contributing to Git Worktree Manager

Thank you for your interest in contributing to the Git Worktree Manager (wtview) project! This document provides guidelines and instructions for getting started with development.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project is committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and constructive in all interactions.

## Prerequisites

Before you begin, ensure you have the following installed:

### Required

- **Node.js** 18.0.0 or higher
  - Download from [https://nodejs.org/](https://nodejs.org/)
  - Verify: `node --version` and `npm --version`

- **Rust** 1.70.0 or higher
  - Install from [https://rustup.rs/](https://rustup.rs/)
  - Verify: `rustc --version` and `cargo --version`

### Platform-Specific Tauri Dependencies

This project uses Tauri v2, which requires platform-specific dependencies:

- **Linux (Ubuntu/Debian)**
  ```bash
  sudo apt-get install libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
  ```

- **macOS**
  - Xcode Command Line Tools: `xcode-select --install`
  - Homebrew (optional): `brew install rustup`

- **Windows**
  - Visual Studio Build Tools or Visual Studio Community
  - Windows 10 SDK

For complete Tauri prerequisites, see [Tauri v2 Prerequisites](https://v2.tauri.app/start/prerequisites/).

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/worktree-viewer.git
   cd worktree-viewer
   ```

3. **Add upstream remote** for syncing:
   ```bash
   git remote add upstream https://github.com/original-repo/worktree-viewer.git
   ```

4. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

### Initial Installation

```bash
# Install Node.js dependencies
npm install

# Verify Rust is properly configured
source "$HOME/.cargo/env"  # Linux/macOS
# or on Windows: just restart your terminal or run rustup

# Test that the dev environment works
npm run tauri dev
```

### Running the Application

```bash
# Start development server (frontend + Tauri backend with hot reload)
npm run tauri dev

# Run frontend only (without Tauri backend)
npm run dev

# Build for production
npm run tauri build
```

### Development Commands

```bash
# Type checking (ensures TypeScript compiles correctly)
npm run build

# Format code
npm run format               # TypeScript/JavaScript (Prettier)
cd src-tauri && cargo fmt   # Rust (rustfmt)

# Run tests
npm test                     # Frontend tests
cd src-tauri && cargo test   # Backend tests

# Lint code
npm run lint                 # TypeScript/JavaScript
cd src-tauri && cargo clippy # Rust (after cargo build)
```

## Coding Standards

This project has strict coding standards to maintain consistency and quality. All code must follow the style guides before submission.

### Rust Code

All Rust code must follow the [Rust Style Guide](docs/rust-style-guide.md).

Key points:
- Use `cargo fmt` before committing
- Type names: `PascalCase`, functions/variables: `snake_case`
- Comprehensive error handling with `thiserror`
- Imports: `std` → external crates → crate-local
- Tests use `#[tokio::test]` with `tempfile` for temporary git repositories

Example formatting:
```bash
cd src-tauri
cargo fmt
cargo clippy
```

### TypeScript & React Code

All TypeScript and React code must follow the [TypeScript Style Guide](docs/typescript-style-guide.md).

Key points:
- Use Prettier with project config (single quotes, trailing commas, 100 char line length)
- Component names: `PascalCase`, hooks: `camelCase` with `use` prefix
- Props interfaces: `PascalCase` with `Props` suffix
- State: server data in TanStack Query, UI state in Zustand
- Styling: Tailwind CSS classes with `cn()` for conditionals
- Imports: React → external libraries → internal components → hooks → types

Example formatting:
```bash
npm run format
```

## Testing

Comprehensive test coverage is required for all code contributions.

### Backend Tests (Rust)

```bash
cd src-tauri

# Run all tests
cargo test

# Run tests for a specific module
cargo test worktree_manager

# Run tests with output
cargo test -- --nocapture

# Run a single test
cargo test test_list_worktrees
```

Tests should:
- Use `#[tokio::test]` for async functions
- Use `tempfile` crate for creating temporary test repositories
- Have descriptive names following: `test_<function>_<scenario>_<expected_result>`
- Include both success and failure cases
- Be located in a `tests` module at the bottom of the same file

### Frontend Tests (TypeScript/React)

```bash
# Run frontend tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

Tests should:
- Test both user interactions and component rendering
- Use React Testing Library for UI tests
- Mock Tauri invoke calls
- Follow the structure: setup → act → assert

### Coverage Requirements

- Minimum 80% code coverage for new features
- All public functions/components should have tests
- Error paths must be tested

## Submitting Changes

### Before You Start

1. Check [open issues](https://github.com/original-repo/worktree-viewer/issues) to avoid duplicate work
2. For major features, open an issue for discussion first
3. Keep changes focused and atomic

### Preparing Your Changes

1. **Sync with upstream**:
   ```bash
   git fetch upstream
   git rebase upstream/master
   ```

2. **Format your code**:
   ```bash
   npm run format          # TypeScript
   cd src-tauri && cargo fmt  # Rust
   ```

3. **Run tests locally**:
   ```bash
   npm test               # Frontend
   cd src-tauri && cargo test  # Backend
   ```

4. **Verify builds**:
   ```bash
   npm run build          # Type check
   npm run tauri dev      # Verify dev build works
   ```

## Commit Message Guidelines

This project uses Conventional Commits for clear, semantic commit messages. See [https://www.conventionalcommits.org/](https://www.conventionalcommits.org/) for more details.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

Must be one of:
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code refactoring without feature changes
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Build, dependency, or configuration changes

### Scope

Optionally specify the area affected:
- `backend`: Rust backend code
- `frontend`: React/TypeScript frontend code
- `ui`: UI components
- `git-ops`: Git operations
- `worktree`: Worktree management
- `docs`: Documentation

### Subject

- Use imperative mood: "add" not "added" or "adds"
- Don't capitalize first letter
- No period at the end
- Maximum 50 characters

### Body (Optional)

- Explain what and why, not how
- Wrap at 72 characters
- Separate from subject with blank line

### Footer (Optional)

- Reference issues: `Fixes #123` or `Closes #123`
- Breaking changes: `BREAKING CHANGE: description`

### Examples

```
feat(worktree): add lock/unlock functionality

Users can now lock and unlock worktrees to prevent accidental
modifications. Locked worktrees show a lock icon in the UI and
prevent deletion through the interface.

Fixes #42
```

```
fix(backend): handle git credential failures gracefully

Previously, credential errors would crash the application. Now
they return proper error messages that are displayed to the user.

Closes #15
```

```
docs: update CONTRIBUTING.md with testing guidelines
```

## Pull Request Process

1. **Create a pull request** against the `master` branch
   - Use a clear, descriptive title
   - Reference related issues: "Fixes #123"

2. **PR Description** should include:
   - Summary of changes
   - Motivation and context
   - How to test the changes
   - Screenshots (for UI changes)
   - Checklist of testing performed

3. **Example PR Description**:
   ```markdown
   ## Summary

   Add worktree lock/unlock functionality to prevent accidental
   modifications to important worktrees.

   ## Changes
   - Add `lock_worktree` and `unlock_worktree` Tauri commands
   - Add lock icon display in WorktreeCard component
   - Disable delete action for locked worktrees

   ## How to Test

   1. Create a new worktree
   2. Click the lock icon to lock it
   3. Verify the delete button is disabled
   4. Click lock icon again to unlock
   5. Verify delete button is enabled

   ## Checklist

   - [x] Tests pass locally (`npm test` and `cargo test`)
   - [x] Code formatted (`npm run format` and `cargo fmt`)
   - [x] No TypeScript errors (`npm run build`)
   - [x] Follows style guides
   - [x] Added/updated tests for new functionality
   - [x] Updated documentation if needed
   ```

4. **Review Process**:
   - At least one approval required
   - All CI checks must pass
   - Address review comments promptly
   - Request re-review after making changes

5. **Merge**:
   - Use "Squash and merge" for small changes (single commit)
   - Use "Create a merge commit" for significant features (preserves history)

## Quick Reference

| Task | Command |
|------|---------|
| Install dependencies | `npm install` |
| Start development | `npm run tauri dev` |
| Format code | `npm run format && cd src-tauri && cargo fmt` |
| Run tests | `npm test && cd src-tauri && cargo test` |
| Type check | `npm run build` |
| Build production | `npm run tauri build` |
| Lint | `npm run lint && cd src-tauri && cargo clippy` |

## Reporting Issues

When reporting bugs, please include:

- Operating system and version
- Application version
- Steps to reproduce
- Expected vs actual behavior
- Relevant logs or screenshots

## Feature Requests

Feature requests are welcome! Please:

- Check existing issues first to avoid duplicates
- Clearly describe the use case
- Explain why the feature would be valuable

## Getting Help

- **Documentation**: See [docs/](docs/) for architecture and API references
- **Issues**: Check [GitHub Issues](https://github.com/original-repo/worktree-viewer/issues)
- **Discussions**: Open a discussion for questions or ideas
- **Style Guides**:
  - [Rust Style Guide](docs/rust-style-guide.md)
  - [TypeScript Style Guide](docs/typescript-style-guide.md)

## Additional Resources

- [Tauri v2 Documentation](https://v2.tauri.app/)
- [React Documentation](https://react.dev/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)

## License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project (MIT License). See [LICENSE](LICENSE) for details.

---

Thank you for contributing! Your efforts help make this project better for everyone.
