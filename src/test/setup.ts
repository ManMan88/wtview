import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock Tauri API for testing
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Polyfill for Radix UI components that use pointer capture
// JSDOM doesn't implement these methods
if (typeof Element.prototype.hasPointerCapture !== "function") {
  Element.prototype.hasPointerCapture = function () {
    return false;
  };
}

if (typeof Element.prototype.setPointerCapture !== "function") {
  Element.prototype.setPointerCapture = function () {};
}

if (typeof Element.prototype.releasePointerCapture !== "function") {
  Element.prototype.releasePointerCapture = function () {};
}

// Mock ResizeObserver for components that use it
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock scrollIntoView for Radix UI Select component
if (typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = function () {};
}
