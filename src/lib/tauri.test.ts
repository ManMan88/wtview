import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  selectRepository,
  openRepository,
  validateRepo,
  listWorktrees,
  addWorktree,
  removeWorktree,
  lockWorktree,
  unlockWorktree,
  gitFetch,
  gitPull,
  gitPush,
  gitStatus,
  gitCommit,
  gitStage,
  gitUnstage,
  listBranches,
  checkoutBranch,
  type WorktreeInfo,
  type GitStatusResult,
  type BranchInfo,
  type RepositoryInfo,
} from "./tauri";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

describe("Tauri API wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== Repository Commands ====================

  describe("selectRepository", () => {
    it("calls invoke and returns repository info", async () => {
      const mockRepo: RepositoryInfo = {
        path: "/home/user/my-repo",
        name: "my-repo",
        is_bare: false,
      };
      mockInvoke.mockResolvedValue(mockRepo);

      const result = await selectRepository();

      expect(mockInvoke).toHaveBeenCalledWith("select_repository");
      expect(result).toEqual(mockRepo);
    });

    it("returns null when user cancels dialog", async () => {
      mockInvoke.mockResolvedValue(null);

      const result = await selectRepository();

      expect(result).toBeNull();
    });

    it("propagates errors from invoke", async () => {
      mockInvoke.mockRejectedValue(new Error("Dialog failed"));

      await expect(selectRepository()).rejects.toThrow("Dialog failed");
    });
  });

  describe("openRepository", () => {
    it("calls invoke with correct parameters", async () => {
      const mockRepo: RepositoryInfo = {
        path: "/home/user/project",
        name: "project",
        is_bare: false,
      };
      mockInvoke.mockResolvedValue(mockRepo);

      const result = await openRepository("/home/user/project");

      expect(mockInvoke).toHaveBeenCalledWith("open_repository", {
        path: "/home/user/project",
      });
      expect(result).toEqual(mockRepo);
    });

    it("handles bare repository", async () => {
      const mockRepo: RepositoryInfo = {
        path: "/home/user/bare.git",
        name: "bare.git",
        is_bare: true,
      };
      mockInvoke.mockResolvedValue(mockRepo);

      const result = await openRepository("/home/user/bare.git");

      expect(result.is_bare).toBe(true);
    });

    it("propagates errors for invalid path", async () => {
      mockInvoke.mockRejectedValue(new Error("Not a git repository"));

      await expect(openRepository("/invalid/path")).rejects.toThrow("Not a git repository");
    });
  });

  describe("validateRepo", () => {
    it("returns true for valid repository", async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await validateRepo("/home/user/valid-repo");

      expect(mockInvoke).toHaveBeenCalledWith("validate_repo", {
        path: "/home/user/valid-repo",
      });
      expect(result).toBe(true);
    });

    it("returns false for non-repository path", async () => {
      mockInvoke.mockResolvedValue(false);

      const result = await validateRepo("/home/user/not-a-repo");

      expect(result).toBe(false);
    });

    it("propagates errors from invoke", async () => {
      mockInvoke.mockRejectedValue(new Error("Path does not exist"));

      await expect(validateRepo("/nonexistent")).rejects.toThrow("Path does not exist");
    });
  });

  // ==================== Worktree Commands ====================

  describe("listWorktrees", () => {
    it("calls invoke with correct command and parameters", async () => {
      const mockWorktrees: WorktreeInfo[] = [
        { path: "/repo", branch: "main", is_main: true, is_locked: false },
        { path: "/repo-feature", branch: "feature", is_main: false, is_locked: false },
      ];
      mockInvoke.mockResolvedValue(mockWorktrees);

      const result = await listWorktrees("/repo");

      expect(mockInvoke).toHaveBeenCalledWith("list_worktrees", { repoPath: "/repo" });
      expect(result).toEqual(mockWorktrees);
    });

    it("returns empty array when no worktrees", async () => {
      mockInvoke.mockResolvedValue([]);

      const result = await listWorktrees("/repo");

      expect(result).toEqual([]);
    });

    it("returns worktrees with locked status", async () => {
      const mockWorktrees: WorktreeInfo[] = [
        { path: "/repo", branch: "main", is_main: true, is_locked: false },
        { path: "/repo-locked", branch: "locked-branch", is_main: false, is_locked: true },
      ];
      mockInvoke.mockResolvedValue(mockWorktrees);

      const result = await listWorktrees("/repo");

      const lockedWorktree = result.find((wt) => wt.is_locked);
      expect(lockedWorktree).toBeDefined();
      expect(lockedWorktree?.path).toBe("/repo-locked");
    });

    it("propagates errors from invoke", async () => {
      mockInvoke.mockRejectedValue(new Error("Repository not found"));

      await expect(listWorktrees("/invalid")).rejects.toThrow("Repository not found");
    });
  });

  describe("addWorktree", () => {
    it("calls invoke with correct parameters for new branch", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await addWorktree("/repo", "/repo-feature", "feature-branch", true);

      expect(mockInvoke).toHaveBeenCalledWith("add_worktree", {
        repoPath: "/repo",
        worktreePath: "/repo-feature",
        branch: "feature-branch",
        createBranch: true,
      });
    });

    it("calls invoke with correct parameters for existing branch", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await addWorktree("/repo", "/repo-feature", "existing-branch", false);

      expect(mockInvoke).toHaveBeenCalledWith("add_worktree", {
        repoPath: "/repo",
        worktreePath: "/repo-feature",
        branch: "existing-branch",
        createBranch: false,
      });
    });

    it("propagates errors from invoke", async () => {
      mockInvoke.mockRejectedValue(new Error("Branch already exists"));

      await expect(addWorktree("/repo", "/path", "existing", true)).rejects.toThrow(
        "Branch already exists"
      );
    });
  });

  describe("removeWorktree", () => {
    it("calls invoke with force=false", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await removeWorktree("/repo", "/repo-feature", false);

      expect(mockInvoke).toHaveBeenCalledWith("remove_worktree", {
        repoPath: "/repo",
        worktreePath: "/repo-feature",
        force: false,
      });
    });

    it("calls invoke with force=true", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await removeWorktree("/repo", "/repo-feature", true);

      expect(mockInvoke).toHaveBeenCalledWith("remove_worktree", {
        repoPath: "/repo",
        worktreePath: "/repo-feature",
        force: true,
      });
    });

    it("propagates errors from invoke", async () => {
      mockInvoke.mockRejectedValue(new Error("Worktree has uncommitted changes"));

      await expect(removeWorktree("/repo", "/path", false)).rejects.toThrow(
        "Worktree has uncommitted changes"
      );
    });
  });

  describe("lockWorktree", () => {
    it("calls invoke without reason", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await lockWorktree("/repo", "/repo-feature");

      expect(mockInvoke).toHaveBeenCalledWith("lock_worktree", {
        repoPath: "/repo",
        worktreePath: "/repo-feature",
        reason: undefined,
      });
    });

    it("calls invoke with reason", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await lockWorktree("/repo", "/repo-feature", "Work in progress");

      expect(mockInvoke).toHaveBeenCalledWith("lock_worktree", {
        repoPath: "/repo",
        worktreePath: "/repo-feature",
        reason: "Work in progress",
      });
    });

    it("propagates errors when worktree already locked", async () => {
      mockInvoke.mockRejectedValue(new Error("Worktree is already locked"));

      await expect(lockWorktree("/repo", "/locked-wt")).rejects.toThrow(
        "Worktree is already locked"
      );
    });

    it("propagates errors when worktree not found", async () => {
      mockInvoke.mockRejectedValue(new Error("Worktree not found"));

      await expect(lockWorktree("/repo", "/nonexistent")).rejects.toThrow("Worktree not found");
    });
  });

  describe("unlockWorktree", () => {
    it("calls invoke with correct parameters", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await unlockWorktree("/repo", "/repo-feature");

      expect(mockInvoke).toHaveBeenCalledWith("unlock_worktree", {
        repoPath: "/repo",
        worktreePath: "/repo-feature",
      });
    });

    it("propagates errors when worktree not locked", async () => {
      mockInvoke.mockRejectedValue(new Error("Worktree is not locked"));

      await expect(unlockWorktree("/repo", "/unlocked-wt")).rejects.toThrow(
        "Worktree is not locked"
      );
    });

    it("propagates errors when worktree not found", async () => {
      mockInvoke.mockRejectedValue(new Error("Worktree not found"));

      await expect(unlockWorktree("/repo", "/nonexistent")).rejects.toThrow("Worktree not found");
    });
  });

  // ==================== Git Operations ====================

  describe("gitFetch", () => {
    it("calls invoke with correct command", async () => {
      mockInvoke.mockResolvedValue("Fetched from origin");

      const result = await gitFetch("/worktree");

      expect(mockInvoke).toHaveBeenCalledWith("git_fetch", { worktreePath: "/worktree" });
      expect(result).toBe("Fetched from origin");
    });

    it("propagates errors from invoke", async () => {
      mockInvoke.mockRejectedValue(new Error("No remote configured"));

      await expect(gitFetch("/worktree")).rejects.toThrow("No remote configured");
    });
  });

  describe("gitPull", () => {
    it("calls invoke with correct command", async () => {
      mockInvoke.mockResolvedValue("Already up to date.");

      const result = await gitPull("/worktree");

      expect(mockInvoke).toHaveBeenCalledWith("git_pull", { worktreePath: "/worktree" });
      expect(result).toBe("Already up to date.");
    });

    it("propagates errors from invoke", async () => {
      mockInvoke.mockRejectedValue(new Error("Merge conflict"));

      await expect(gitPull("/worktree")).rejects.toThrow("Merge conflict");
    });
  });

  describe("gitPush", () => {
    it("calls invoke with correct command", async () => {
      mockInvoke.mockResolvedValue("Pushed to origin/main");

      const result = await gitPush("/worktree");

      expect(mockInvoke).toHaveBeenCalledWith("git_push", { worktreePath: "/worktree" });
      expect(result).toBe("Pushed to origin/main");
    });

    it("propagates errors from invoke", async () => {
      mockInvoke.mockRejectedValue(new Error("Push rejected"));

      await expect(gitPush("/worktree")).rejects.toThrow("Push rejected");
    });
  });

  describe("gitStatus", () => {
    it("calls invoke and returns status result", async () => {
      const mockStatus: GitStatusResult = {
        branch: "main",
        files: [
          { path: "file.ts", status: "modified", staged: false },
          { path: "new.ts", status: "added", staged: true },
        ],
        ahead: 2,
        behind: 1,
      };
      mockInvoke.mockResolvedValue(mockStatus);

      const result = await gitStatus("/worktree");

      expect(mockInvoke).toHaveBeenCalledWith("git_status", { worktreePath: "/worktree" });
      expect(result).toEqual(mockStatus);
    });

    it("handles clean repository", async () => {
      const mockStatus: GitStatusResult = {
        branch: "main",
        files: [],
        ahead: 0,
        behind: 0,
      };
      mockInvoke.mockResolvedValue(mockStatus);

      const result = await gitStatus("/worktree");

      expect(result.files).toHaveLength(0);
      expect(result.ahead).toBe(0);
      expect(result.behind).toBe(0);
    });

    it("handles detached HEAD", async () => {
      const mockStatus: GitStatusResult = {
        branch: null,
        files: [],
        ahead: 0,
        behind: 0,
      };
      mockInvoke.mockResolvedValue(mockStatus);

      const result = await gitStatus("/worktree");

      expect(result.branch).toBeNull();
    });

    it("propagates errors from invoke", async () => {
      mockInvoke.mockRejectedValue(new Error("Not a git repository"));

      await expect(gitStatus("/invalid")).rejects.toThrow("Not a git repository");
    });
  });

  describe("gitCommit", () => {
    it("calls invoke with correct parameters", async () => {
      mockInvoke.mockResolvedValue("[main abc1234] Test commit");

      const result = await gitCommit("/worktree", "Test commit");

      expect(mockInvoke).toHaveBeenCalledWith("git_commit", {
        worktreePath: "/worktree",
        message: "Test commit",
      });
      expect(result).toBe("[main abc1234] Test commit");
    });

    it("handles multiline commit messages", async () => {
      const message = "Title\n\nBody paragraph";
      mockInvoke.mockResolvedValue("Committed");

      await gitCommit("/worktree", message);

      expect(mockInvoke).toHaveBeenCalledWith("git_commit", {
        worktreePath: "/worktree",
        message: message,
      });
    });

    it("propagates errors from invoke", async () => {
      mockInvoke.mockRejectedValue(new Error("Nothing to commit"));

      await expect(gitCommit("/worktree", "Empty")).rejects.toThrow("Nothing to commit");
    });
  });

  describe("gitStage", () => {
    it("calls invoke with correct parameters", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await gitStage("/worktree", "file.ts");

      expect(mockInvoke).toHaveBeenCalledWith("git_stage", {
        worktreePath: "/worktree",
        filePath: "file.ts",
      });
    });

    it("handles paths with spaces", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await gitStage("/worktree", "path with spaces/file.ts");

      expect(mockInvoke).toHaveBeenCalledWith("git_stage", {
        worktreePath: "/worktree",
        filePath: "path with spaces/file.ts",
      });
    });

    it("propagates errors from invoke", async () => {
      mockInvoke.mockRejectedValue(new Error("File not found"));

      await expect(gitStage("/worktree", "nonexistent.ts")).rejects.toThrow("File not found");
    });
  });

  describe("gitUnstage", () => {
    it("calls invoke with correct parameters", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await gitUnstage("/worktree", "file.ts");

      expect(mockInvoke).toHaveBeenCalledWith("git_unstage", {
        worktreePath: "/worktree",
        filePath: "file.ts",
      });
    });

    it("propagates errors from invoke", async () => {
      mockInvoke.mockRejectedValue(new Error("File not staged"));

      await expect(gitUnstage("/worktree", "unstaged.ts")).rejects.toThrow("File not staged");
    });
  });

  describe("listBranches", () => {
    it("calls invoke and returns branches", async () => {
      const mockBranches: BranchInfo[] = [
        { name: "main", is_remote: false, is_current: true },
        { name: "feature", is_remote: false, is_current: false },
        { name: "origin/main", is_remote: true, is_current: false },
      ];
      mockInvoke.mockResolvedValue(mockBranches);

      const result = await listBranches("/repo");

      expect(mockInvoke).toHaveBeenCalledWith("list_branches", { repoPath: "/repo" });
      expect(result).toEqual(mockBranches);
    });

    it("returns empty array when no branches", async () => {
      mockInvoke.mockResolvedValue([]);

      const result = await listBranches("/repo");

      expect(result).toEqual([]);
    });

    it("propagates errors from invoke", async () => {
      mockInvoke.mockRejectedValue(new Error("Repository not found"));

      await expect(listBranches("/invalid")).rejects.toThrow("Repository not found");
    });
  });

  describe("checkoutBranch", () => {
    it("calls invoke with correct parameters", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await checkoutBranch("/worktree", "feature");

      expect(mockInvoke).toHaveBeenCalledWith("checkout_branch", {
        worktreePath: "/worktree",
        branch: "feature",
      });
    });

    it("handles branch names with slashes", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await checkoutBranch("/worktree", "feature/my-feature");

      expect(mockInvoke).toHaveBeenCalledWith("checkout_branch", {
        worktreePath: "/worktree",
        branch: "feature/my-feature",
      });
    });

    it("propagates errors from invoke", async () => {
      mockInvoke.mockRejectedValue(new Error("Branch not found"));

      await expect(checkoutBranch("/worktree", "nonexistent")).rejects.toThrow("Branch not found");
    });
  });
});
