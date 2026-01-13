import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './appStore';

describe('appStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      currentRepo: null,
      selectedWorktreePath: null,
      recentRepos: [],
    });
  });

  describe('initial state', () => {
    it('has null currentRepo', () => {
      const { currentRepo } = useAppStore.getState();
      expect(currentRepo).toBeNull();
    });

    it('has null selectedWorktreePath', () => {
      const { selectedWorktreePath } = useAppStore.getState();
      expect(selectedWorktreePath).toBeNull();
    });

    it('has empty recentRepos', () => {
      const { recentRepos } = useAppStore.getState();
      expect(recentRepos).toEqual([]);
    });
  });

  describe('setCurrentRepo', () => {
    it('sets the current repository', () => {
      const mockRepo = {
        path: '/home/user/my-repo',
        name: 'my-repo',
        is_bare: false,
      };

      useAppStore.getState().setCurrentRepo(mockRepo);

      const { currentRepo } = useAppStore.getState();
      expect(currentRepo).toEqual(mockRepo);
    });

    it('clears selectedWorktreePath when setting new repo', () => {
      useAppStore.setState({ selectedWorktreePath: '/some/path' });

      const mockRepo = {
        path: '/home/user/my-repo',
        name: 'my-repo',
        is_bare: false,
      };
      useAppStore.getState().setCurrentRepo(mockRepo);

      const { selectedWorktreePath } = useAppStore.getState();
      expect(selectedWorktreePath).toBeNull();
    });

    it('can set currentRepo to null', () => {
      const mockRepo = {
        path: '/home/user/my-repo',
        name: 'my-repo',
        is_bare: false,
      };
      useAppStore.setState({ currentRepo: mockRepo });

      useAppStore.getState().setCurrentRepo(null);

      const { currentRepo } = useAppStore.getState();
      expect(currentRepo).toBeNull();
    });
  });

  describe('selectWorktree', () => {
    it('sets the selected worktree path', () => {
      useAppStore.getState().selectWorktree('/path/to/worktree');

      const { selectedWorktreePath } = useAppStore.getState();
      expect(selectedWorktreePath).toBe('/path/to/worktree');
    });

    it('can clear the selected worktree', () => {
      useAppStore.setState({ selectedWorktreePath: '/some/path' });

      useAppStore.getState().selectWorktree(null);

      const { selectedWorktreePath } = useAppStore.getState();
      expect(selectedWorktreePath).toBeNull();
    });
  });

  describe('addRecentRepo', () => {
    it('adds a new repo to the beginning of recentRepos', () => {
      useAppStore.getState().addRecentRepo('/path/to/repo1');

      const { recentRepos } = useAppStore.getState();
      expect(recentRepos).toEqual(['/path/to/repo1']);
    });

    it('adds new repos at the beginning', () => {
      useAppStore.getState().addRecentRepo('/path/to/repo1');
      useAppStore.getState().addRecentRepo('/path/to/repo2');

      const { recentRepos } = useAppStore.getState();
      expect(recentRepos).toEqual(['/path/to/repo2', '/path/to/repo1']);
    });

    it('moves existing repo to the beginning if already in list', () => {
      useAppStore.setState({
        recentRepos: ['/path/to/repo1', '/path/to/repo2', '/path/to/repo3'],
      });

      useAppStore.getState().addRecentRepo('/path/to/repo2');

      const { recentRepos } = useAppStore.getState();
      expect(recentRepos).toEqual(['/path/to/repo2', '/path/to/repo1', '/path/to/repo3']);
    });

    it('limits to 10 recent repos', () => {
      // Add 12 repos
      for (let i = 1; i <= 12; i++) {
        useAppStore.getState().addRecentRepo(`/path/to/repo${i}`);
      }

      const { recentRepos } = useAppStore.getState();
      expect(recentRepos).toHaveLength(10);
      expect(recentRepos[0]).toBe('/path/to/repo12');
      expect(recentRepos[9]).toBe('/path/to/repo3');
    });

    it('does not duplicate when adding same repo', () => {
      useAppStore.getState().addRecentRepo('/path/to/repo1');
      useAppStore.getState().addRecentRepo('/path/to/repo1');

      const { recentRepos } = useAppStore.getState();
      expect(recentRepos).toEqual(['/path/to/repo1']);
    });
  });

  describe('clearRecentRepos', () => {
    it('clears all recent repos', () => {
      useAppStore.setState({
        recentRepos: ['/path/to/repo1', '/path/to/repo2'],
      });

      useAppStore.getState().clearRecentRepos();

      const { recentRepos } = useAppStore.getState();
      expect(recentRepos).toEqual([]);
    });

    it('does nothing when already empty', () => {
      useAppStore.getState().clearRecentRepos();

      const { recentRepos } = useAppStore.getState();
      expect(recentRepos).toEqual([]);
    });
  });
});
