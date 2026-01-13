import "@testing-library/jest-dom/vitest";

// Mock Tauri API for testing
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));
