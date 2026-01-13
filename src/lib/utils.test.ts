import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn utility function", () => {
  it("merges class names", () => {
    const result = cn("class1", "class2");
    expect(result).toBe("class1 class2");
  });

  it("handles undefined values", () => {
    const result = cn("class1", undefined, "class2");
    expect(result).toBe("class1 class2");
  });

  it("handles null values", () => {
    const result = cn("class1", null, "class2");
    expect(result).toBe("class1 class2");
  });

  it("handles false values", () => {
    const result = cn("class1", false, "class2");
    expect(result).toBe("class1 class2");
  });

  it("handles conditional class names", () => {
    const isActive = true;
    const result = cn("base", isActive && "active");
    expect(result).toBe("base active");
  });

  it("handles conditional class names when false", () => {
    const isActive = false;
    const result = cn("base", isActive && "active");
    expect(result).toBe("base");
  });

  it("merges Tailwind classes correctly - last one wins", () => {
    const result = cn("px-2", "px-4");
    expect(result).toBe("px-4");
  });

  it("merges conflicting Tailwind classes", () => {
    const result = cn("text-red-500", "text-blue-500");
    expect(result).toBe("text-blue-500");
  });

  it("preserves non-conflicting Tailwind classes", () => {
    const result = cn("px-2", "py-4", "text-red-500");
    expect(result).toBe("px-2 py-4 text-red-500");
  });

  it("handles array of class names", () => {
    const result = cn(["class1", "class2"]);
    expect(result).toBe("class1 class2");
  });

  it("handles object syntax", () => {
    const result = cn({
      "class1": true,
      "class2": false,
      "class3": true,
    });
    expect(result).toBe("class1 class3");
  });

  it("handles mixed inputs", () => {
    const result = cn("base", ["array-class"], { "object-class": true });
    expect(result).toBe("base array-class object-class");
  });

  it("handles empty string", () => {
    const result = cn("");
    expect(result).toBe("");
  });

  it("handles no arguments", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("handles whitespace-only strings", () => {
    const result = cn("  ");
    expect(result).toBe("");
  });

  it("deduplicates identical Tailwind classes", () => {
    // tailwind-merge only deduplicates Tailwind utility classes, not arbitrary class names
    const result = cn("bg-red-500", "bg-red-500");
    expect(result).toBe("bg-red-500");
  });

  it("handles complex Tailwind variants", () => {
    const result = cn("hover:bg-red-500", "hover:bg-blue-500");
    expect(result).toBe("hover:bg-blue-500");
  });

  it("preserves responsive variants correctly", () => {
    const result = cn("sm:px-2", "md:px-4", "lg:px-6");
    expect(result).toBe("sm:px-2 md:px-4 lg:px-6");
  });

  it("handles dark mode variants", () => {
    const result = cn("bg-white", "dark:bg-black");
    expect(result).toBe("bg-white dark:bg-black");
  });
});
