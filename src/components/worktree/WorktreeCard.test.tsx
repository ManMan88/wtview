import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorktreeCard } from './WorktreeCard';
import type { WorktreeInfo } from '@/lib/tauri';

describe('WorktreeCard', () => {
  const mockWorktree: WorktreeInfo = {
    path: '/path/to/worktree',
    branch: 'feature-branch',
    is_main: false,
    is_locked: false,
  };

  it('displays the branch name', () => {
    render(<WorktreeCard worktree={mockWorktree} isSelected={false} onSelect={vi.fn()} />);

    expect(screen.getByText('feature-branch')).toBeInTheDocument();
  });

  it('displays the worktree folder name from path', () => {
    render(<WorktreeCard worktree={mockWorktree} isSelected={false} onSelect={vi.fn()} />);

    expect(screen.getByText('worktree')).toBeInTheDocument();
  });

  it('displays "detached HEAD" when branch is null', () => {
    const detachedWorktree: WorktreeInfo = {
      ...mockWorktree,
      branch: null,
    };

    render(<WorktreeCard worktree={detachedWorktree} isSelected={false} onSelect={vi.fn()} />);

    expect(screen.getByText('detached HEAD')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(<WorktreeCard worktree={mockWorktree} isSelected={false} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('applies selected styling when isSelected is true', () => {
    render(<WorktreeCard worktree={mockWorktree} isSelected={true} onSelect={vi.fn()} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-accent');
    expect(button).toHaveClass('border-primary');
  });

  it('does not apply selected styling when isSelected is false', () => {
    render(<WorktreeCard worktree={mockWorktree} isSelected={false} onSelect={vi.fn()} />);

    const button = screen.getByRole('button');
    expect(button).not.toHaveClass('border-primary');
  });

  it('shows home icon for main worktree', () => {
    const mainWorktree: WorktreeInfo = {
      ...mockWorktree,
      is_main: true,
    };

    render(<WorktreeCard worktree={mainWorktree} isSelected={false} onSelect={vi.fn()} />);

    expect(screen.getByTitle('Main worktree')).toBeInTheDocument();
  });

  it('does not show home icon for non-main worktree', () => {
    render(<WorktreeCard worktree={mockWorktree} isSelected={false} onSelect={vi.fn()} />);

    expect(screen.queryByTitle('Main worktree')).not.toBeInTheDocument();
  });

  it('shows lock icon for locked worktree', () => {
    const lockedWorktree: WorktreeInfo = {
      ...mockWorktree,
      is_locked: true,
    };

    render(<WorktreeCard worktree={lockedWorktree} isSelected={false} onSelect={vi.fn()} />);

    expect(screen.getByTitle('Locked')).toBeInTheDocument();
  });

  it('does not show lock icon for unlocked worktree', () => {
    render(<WorktreeCard worktree={mockWorktree} isSelected={false} onSelect={vi.fn()} />);

    expect(screen.queryByTitle('Locked')).not.toBeInTheDocument();
  });

  it('shows both home and lock icons when main and locked', () => {
    const mainLockedWorktree: WorktreeInfo = {
      ...mockWorktree,
      is_main: true,
      is_locked: true,
    };

    render(<WorktreeCard worktree={mainLockedWorktree} isSelected={false} onSelect={vi.fn()} />);

    expect(screen.getByTitle('Main worktree')).toBeInTheDocument();
    expect(screen.getByTitle('Locked')).toBeInTheDocument();
  });

  it('handles path with single segment', () => {
    const simplePathWorktree: WorktreeInfo = {
      ...mockWorktree,
      path: 'worktree',
    };

    render(<WorktreeCard worktree={simplePathWorktree} isSelected={false} onSelect={vi.fn()} />);

    expect(screen.getByText('worktree')).toBeInTheDocument();
  });
});
