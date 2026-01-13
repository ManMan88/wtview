import { invoke } from "@tauri-apps/api/core";

// Types matching the Rust backend
export interface WorktreeInfo {
  path: string;
  branch: string | null;
  is_main: boolean;
  is_locked: boolean;
}

export interface FileStatus {
  path: string;
  status: string;
  staged: boolean;
}

export interface GitStatusResult {
  branch: string | null;
  files: FileStatus[];
  ahead: number;
  behind: number;
}

export interface BranchInfo {
  name: string;
  is_remote: boolean;
  is_current: boolean;
}

export interface RepositoryInfo {
  path: string;
  name: string;
  is_bare: boolean;
}

// Repository commands
export async function selectRepository(): Promise<RepositoryInfo | null> {
  return invoke("select_repository");
}

export async function openRepository(path: string): Promise<RepositoryInfo> {
  return invoke("open_repository", { path });
}

export async function validateRepo(path: string): Promise<boolean> {
  return invoke("validate_repo", { path });
}

// Worktree commands
export async function listWorktrees(repoPath: string): Promise<WorktreeInfo[]> {
  return invoke("list_worktrees", { repoPath });
}

export async function addWorktree(
  repoPath: string,
  worktreePath: string,
  branch: string,
  createBranch: boolean
): Promise<void> {
  return invoke("add_worktree", { repoPath, worktreePath, branch, createBranch });
}

export async function removeWorktree(
  repoPath: string,
  worktreePath: string,
  force: boolean
): Promise<void> {
  return invoke("remove_worktree", { repoPath, worktreePath, force });
}

export async function lockWorktree(
  repoPath: string,
  worktreePath: string,
  reason?: string
): Promise<void> {
  return invoke("lock_worktree", { repoPath, worktreePath, reason });
}

export async function unlockWorktree(
  repoPath: string,
  worktreePath: string
): Promise<void> {
  return invoke("unlock_worktree", { repoPath, worktreePath });
}

// Git operations
export async function gitFetch(worktreePath: string): Promise<string> {
  return invoke("git_fetch", { worktreePath });
}

export async function gitPull(worktreePath: string): Promise<string> {
  return invoke("git_pull", { worktreePath });
}

export async function gitPush(worktreePath: string): Promise<string> {
  return invoke("git_push", { worktreePath });
}

export async function gitStatus(worktreePath: string): Promise<GitStatusResult> {
  return invoke("git_status", { worktreePath });
}

export async function gitCommit(
  worktreePath: string,
  message: string
): Promise<string> {
  return invoke("git_commit", { worktreePath, message });
}

export async function gitStage(
  worktreePath: string,
  filePath: string
): Promise<void> {
  return invoke("git_stage", { worktreePath, filePath });
}

export async function gitUnstage(
  worktreePath: string,
  filePath: string
): Promise<void> {
  return invoke("git_unstage", { worktreePath, filePath });
}

// Branch operations
export async function listBranches(repoPath: string): Promise<BranchInfo[]> {
  return invoke("list_branches", { repoPath });
}

export async function checkoutBranch(
  worktreePath: string,
  branch: string
): Promise<void> {
  return invoke("checkout_branch", { worktreePath, branch });
}
