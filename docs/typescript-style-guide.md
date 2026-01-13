# TypeScript & React Coding Style Guide

This document defines the coding standards for all TypeScript and React code in the Git Worktree Manager project.

## Formatting

Use Prettier with the following config (`.prettierrc`):
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

Use ESLint with TypeScript and React plugins.

## Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| Files (components) | PascalCase | `WorktreeCard.tsx` |
| Files (utilities) | camelCase | `useWorktrees.ts` |
| Files (types) | camelCase | `worktree.ts` |
| Components | PascalCase | `WorktreeCard` |
| Hooks | camelCase with `use` prefix | `useWorktrees` |
| Functions | camelCase | `formatBranchName` |
| Variables | camelCase | `worktreeList` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RECENT_REPOS` |
| Types/Interfaces | PascalCase | `WorktreeInfo` |
| Enums | PascalCase | `FileStatus` |
| Enum members | PascalCase | `FileStatus.Modified` |
| Props interfaces | PascalCase with `Props` suffix | `WorktreeCardProps` |

## TypeScript

### Type Definitions

```typescript
// Prefer interfaces for object shapes
interface WorktreeInfo {
  name: string;
  path: string;
  branch: string | null;
  isMain: boolean;
  isLocked: boolean;
  hasChanges: boolean;
}

// Use type for unions, intersections, mapped types
type WorktreeStatus = 'clean' | 'modified' | 'untracked';
type WithLoading<T> = T & { isLoading: boolean };
```

### Strict Null Checks

```typescript
// Always handle null/undefined explicitly
function getBranchDisplay(branch: string | null): string {
  return branch ?? 'detached HEAD';
}

// Use optional chaining
const branchName = worktree?.branch?.toUpperCase();

// Use nullish coalescing
const displayName = worktree.name || 'Unknown';
```

### Type Assertions

```typescript
// Prefer type guards over assertions
function isWorktreeInfo(obj: unknown): obj is WorktreeInfo {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'path' in obj
  );
}

// When assertion is necessary, use `as`
const data = JSON.parse(response) as WorktreeInfo[];

// Never use `as any` - fix the types instead
```

### Generics

```typescript
// Use descriptive names for generics when meaning isn't obvious
function mapWorktrees<TResult>(
  worktrees: WorktreeInfo[],
  mapper: (wt: WorktreeInfo) => TResult
): TResult[] {
  return worktrees.map(mapper);
}

// Single letter OK for simple, conventional cases
function first<T>(items: T[]): T | undefined {
  return items[0];
}
```

## React Components

### Component Structure

```typescript
// 1. Imports
import { useState, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { WorktreeInfo } from '@/types/worktree';

// 2. Types
interface WorktreeCardProps {
  worktree: WorktreeInfo;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

// 3. Component
export function WorktreeCard({
  worktree,
  isSelected,
  onSelect,
  onDelete,
}: WorktreeCardProps) {
  // 3a. Hooks (useState, useEffect, custom hooks)
  const [isHovered, setIsHovered] = useState(false);

  // 3b. Derived state / computations
  const displayBranch = worktree.branch ?? 'detached';

  // 3c. Event handlers
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  }, [onDelete]);

  // 3d. Render
  return (
    <Card
      className={cn(
        'cursor-pointer transition-colors',
        isSelected && 'border-primary bg-accent'
      )}
      onClick={onSelect}
    >
      {/* ... */}
    </Card>
  );
}
```

### Function Components Only

```typescript
// Always use function components with hooks
export function WorktreeList({ worktrees }: WorktreeListProps) {
  return (/* ... */);
}

// Never use class components
// class WorktreeList extends React.Component {} // Don't do this
```

### Props

```typescript
// Destructure props in function signature
export function WorktreeCard({ worktree, isSelected, onSelect }: WorktreeCardProps) {

// Use explicit prop types, not inline
interface WorktreeCardProps {
  worktree: WorktreeInfo;
  isSelected: boolean;
  onSelect: () => void;
  className?: string;  // Optional props marked with ?
}

// Children prop when needed
interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}
```

### Event Handlers

```typescript
// Name handlers with `handle` prefix
const handleClick = () => { /* ... */ };
const handleSubmit = (e: React.FormEvent) => { /* ... */ };
const handleWorktreeSelect = (name: string) => { /* ... */ };

// Props that accept handlers use `on` prefix
interface Props {
  onClick: () => void;
  onWorktreeSelect: (name: string) => void;
}
```

### Conditional Rendering

```typescript
// Early return for loading/error states
if (isLoading) {
  return <LoadingSpinner />;
}

if (error) {
  return <ErrorMessage error={error} />;
}

// Inline conditions for simple cases
return (
  <div>
    {worktree.hasChanges && <Badge variant="warning">Modified</Badge>}
    {worktree.isMain && <Badge>Main</Badge>}
  </div>
);

// Avoid nested ternaries - use early returns or separate components
```

## Hooks

### Custom Hook Structure

```typescript
// src/hooks/useWorktrees.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import type { WorktreeInfo } from '@/types/worktree';

export function useWorktrees(repoPath: string | null) {
  return useQuery({
    queryKey: ['worktrees', repoPath],
    queryFn: () => invoke<WorktreeInfo[]>('list_worktrees', { repoPath }),
    enabled: !!repoPath,
  });
}

export function useAddWorktree() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: /* ... */,
    onSuccess: (_, { repoPath }) => {
      queryClient.invalidateQueries({ queryKey: ['worktrees', repoPath] });
    },
  });
}
```

### Hook Rules

```typescript
// Hooks at top level of component, never conditional
function MyComponent({ condition }: Props) {
  // Always call hooks
  const data = useWorktrees(repoPath);
  const [state, setState] = useState(false);

  // Use the condition in the hook's enabled option or in render
  // NOT: if (condition) { const data = useWorktrees(); }
}
```

### useEffect Guidelines

```typescript
// Always specify dependencies
useEffect(() => {
  fetchData(id);
}, [id]);

// Cleanup when needed
useEffect(() => {
  const subscription = subscribe(id);
  return () => subscription.unsubscribe();
}, [id]);

// Avoid useEffect for derived state - use useMemo instead
const sortedWorktrees = useMemo(
  () => worktrees.sort((a, b) => a.name.localeCompare(b.name)),
  [worktrees]
);
```

## State Management

### Zustand Store

```typescript
// src/stores/appStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // State
  currentRepoPath: string | null;
  selectedWorktree: string | null;

  // Actions
  setCurrentRepo: (path: string) => void;
  selectWorktree: (name: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentRepoPath: null,
      selectedWorktree: null,

      setCurrentRepo: (path) => set({ currentRepoPath: path }),
      selectWorktree: (name) => set({ selectedWorktree: name }),
    }),
    { name: 'app-storage' }
  )
);
```

### State Location Rules

```typescript
// Server state → TanStack Query
const { data: worktrees } = useWorktrees(repoPath);

// Global UI state → Zustand
const selectedWorktree = useAppStore((s) => s.selectedWorktree);

// Local component state → useState
const [isDialogOpen, setIsDialogOpen] = useState(false);
```

## Styling with Tailwind

### Class Organization

```typescript
// Order: layout → sizing → spacing → typography → colors → effects → states
<div
  className={cn(
    // Layout
    'flex flex-col',
    // Sizing
    'w-full max-w-md',
    // Spacing
    'p-4 gap-2',
    // Typography
    'text-sm font-medium',
    // Colors
    'bg-background text-foreground',
    // Effects
    'rounded-lg shadow-sm',
    // States
    'hover:bg-accent focus:ring-2'
  )}
/>
```

### Conditional Classes

```typescript
// Use cn() utility from @/lib/utils
import { cn } from '@/lib/utils';

<Card
  className={cn(
    'transition-colors',
    isSelected && 'border-primary bg-accent',
    isDisabled && 'opacity-50 cursor-not-allowed'
  )}
/>
```

### Avoid Inline Styles

```typescript
// Prefer Tailwind classes
<div className="mt-4 p-2" />

// Avoid inline styles
<div style={{ marginTop: 16, padding: 8 }} />  // Don't do this

// Exception: truly dynamic values
<div style={{ width: `${percentage}%` }} />
```

## Imports

### Import Order

```typescript
// 1. React
import { useState, useEffect } from 'react';

// 2. External libraries
import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

// 3. Internal components
import { Button } from '@/components/ui/button';
import { WorktreeCard } from '@/components/worktree/WorktreeCard';

// 4. Hooks and utilities
import { useWorktrees } from '@/hooks/useWorktrees';
import { cn } from '@/lib/utils';

// 5. Types (use `import type`)
import type { WorktreeInfo } from '@/types/worktree';
```

### Path Aliases

```typescript
// Use @/ alias for src imports
import { Button } from '@/components/ui/button';

// Avoid relative paths that go up multiple levels
import { Button } from '../../../components/ui/button';  // Don't do this
```

## Error Handling

### Tauri Invoke Errors

```typescript
// Errors from Tauri are serialized - parse them
try {
  await invoke('some_command');
} catch (error) {
  const parsed = JSON.parse(error as string) as AppError;
  toast.error(parsed.message);
}

// Or handle in mutation's onError
useMutation({
  mutationFn: /* ... */,
  onError: (error) => {
    const parsed = JSON.parse(error as string) as AppError;
    toast.error(`Operation failed: ${parsed.message}`);
  },
});
```

### Loading and Error States

```typescript
function WorktreeList() {
  const { data, isLoading, error } = useWorktrees(repoPath);

  if (isLoading) {
    return <Skeleton className="h-32" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load worktrees</AlertDescription>
      </Alert>
    );
  }

  return (/* render data */);
}
```

## File Organization

```
src/
├── components/
│   ├── ui/                    # shadcn/ui (don't modify)
│   ├── layout/                # Layout components
│   │   └── Header.tsx
│   ├── worktree/              # Feature components
│   │   ├── WorktreeList.tsx
│   │   ├── WorktreeCard.tsx
│   │   └── index.ts           # Re-exports
│   └── git/
│       └── BranchSelector.tsx
├── hooks/
│   ├── useWorktrees.ts
│   └── index.ts               # Re-exports
├── stores/
│   └── appStore.ts
├── types/
│   ├── worktree.ts
│   └── index.ts               # Re-exports
├── lib/
│   ├── utils.ts               # cn() and utilities
│   └── tauri.ts               # Typed invoke wrappers
└── styles/
    └── globals.css
```

## Testing

### Test File Location

```
src/
├── components/
│   └── worktree/
│       ├── WorktreeCard.tsx
│       └── WorktreeCard.test.tsx  # Co-located
├── hooks/
│   ├── useWorktrees.ts
│   └── useWorktrees.test.tsx
```

### Test Structure

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { WorktreeCard } from './WorktreeCard';

describe('WorktreeCard', () => {
  const defaultProps = {
    worktree: { /* ... */ },
    isSelected: false,
    onSelect: vi.fn(),
    onDelete: vi.fn(),
  };

  it('renders worktree name', () => {
    render(<WorktreeCard {...defaultProps} />);
    expect(screen.getByText(defaultProps.worktree.name)).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(<WorktreeCard {...defaultProps} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('article'));

    expect(onSelect).toHaveBeenCalledOnce();
  });
});
```
