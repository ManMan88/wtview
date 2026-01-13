import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  listWorktrees,
  addWorktree,
  removeWorktree,
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
} from "./tauri";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

describe("Tauri API wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
