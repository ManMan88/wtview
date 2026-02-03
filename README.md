# wtview - Git Worktree Manager

A cross-platform desktop application for managing git worktrees, built with Tauri v2.

[![CI](https://github.com/ManMan88/wtview/actions/workflows/ci.yml/badge.svg)](https://github.com/ManMan88/wtview/actions/workflows/ci.yml)
[![Release](https://github.com/ManMan88/wtview/actions/workflows/release.yml/badge.svg)](https://github.com/ManMan88/wtview/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

- **Worktree Management** - List, create, and delete git worktrees
- **Branch Selection** - Create worktrees from existing or new branches
- **Lock/Unlock** - Prevent accidental modifications to worktrees
- **Git Status** - View ahead/behind counts, staged/unstaged changes
- **Git Operations** - Fetch, pull, push, commit, and stage/unstage files
- **Safety Checks** - Prevents deletion of worktrees with uncommitted changes
- **Cross-Platform** - Runs on Linux, macOS, and Windows

## Screenshots

*Coming soon*

## Installation

### Pre-built Binaries

Download the latest release for your platform:

| Platform | Architecture | Download |
|----------|--------------|----------|
| Linux | x64 | [AppImage](https://github.com/ManMan88/wtview/releases/latest) / [.deb](https://github.com/ManMan88/wtview/releases/latest) |
| Windows | x64 | [.msi](https://github.com/ManMan88/wtview/releases/latest) / [.exe](https://github.com/ManMan88/wtview/releases/latest) |
| macOS | - | *Coming soon* |
| Linux | ARM64 | *Coming soon* |

> **Note:** macOS builds require code signing certificates for distribution. Linux ARM64 builds require cross-compilation setup. These will be added in a future release. In the meantime, you can [build from source](#build-from-source).

### Build from Source

#### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) 1.70+
- Platform-specific dependencies for Tauri (see [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/))

#### Steps

```bash
# Clone the repository
git clone https://github.com/ManMan88/wtview.git
cd wtview

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## Usage

1. **Open Repository** - Click "Open Repository" to select a git repository
2. **View Worktrees** - The sidebar shows all worktrees in the repository
3. **Select Worktree** - Click a worktree to view its details
4. **Add Worktree** - Click "+" to create a new worktree
5. **Delete Worktree** - Select a worktree and click "Delete"

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Tauri v2](https://v2.tauri.app/) |
| Backend | Rust with [git2](https://docs.rs/git2) |
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com/) |
| State | [Zustand](https://zustand-demo.pmnd.rs/) + [TanStack Query](https://tanstack.com/query) |

## Development

```bash
# Start development server (hot reload)
npm run tauri dev

# Run frontend only (without Tauri)
npm run dev

# Type check
npm run build

# Run tests
npm test                    # Frontend
cd src-tauri && cargo test  # Backend

# Format code
npm run format              # TypeScript (Prettier)
cargo fmt                   # Rust
```

## Project Structure

```
wtview/
├── src/                    # Frontend (React/TypeScript)
│   ├── components/         # UI components
│   │   ├── ui/             # shadcn/ui (do not modify)
│   │   ├── layout/         # Header, Sidebar, MainContent
│   │   └── worktree/       # Worktree-specific components
│   ├── hooks/              # TanStack Query hooks
│   ├── stores/             # Zustand state management
│   └── lib/                # Utilities and Tauri wrappers
├── src-tauri/              # Backend (Rust)
│   └── src/
│       ├── commands/       # Tauri command handlers
│       ├── git/            # Git operations layer
│       └── error.rs        # Error types
└── docs/                   # Documentation
```

## Documentation

- [Architecture Overview](docs/architecture.md)
- [Backend API Reference](docs/backend-api.md)
- [Rust Style Guide](docs/rust-style-guide.md)
- [TypeScript Style Guide](docs/typescript-style-guide.md)

## Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md) before submitting PRs.

## Author

**Ron Danon** - [GitHub](https://github.com/ManMan88) - rondanon@gmail.com

## License

MIT License - see [LICENSE](LICENSE) for details.
