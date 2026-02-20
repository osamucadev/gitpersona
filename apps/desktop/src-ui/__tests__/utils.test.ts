import { describe, expect, it } from "vitest";
import { relativeTime, profileColor } from "@/lib/utils";

describe("relativeTime", () => {
  it("returns 'just now' for very recent timestamps", () => {
    const now = new Date().toISOString();
    expect(relativeTime(now)).toBe("just now");
  });

  it("returns minutes for timestamps < 1h ago", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(relativeTime(fiveMinutesAgo)).toBe("5m ago");
  });
});

describe("profileColor", () => {
  it("returns a non-empty string for any label", () => {
    expect(profileColor("WORK")).toBeTruthy();
    expect(profileColor("PERSONAL")).toBeTruthy();
    expect(profileColor("")).toBeTruthy();
  });

  it("returns consistent color for the same label", () => {
    expect(profileColor("WORK")).toBe(profileColor("WORK"));
  });

  it("may return different colors for different labels", () => {
    // Not guaranteed to differ but at least one pair should
    const colors = ["A", "B", "C", "D", "E", "F"].map(profileColor);
    const unique = new Set(colors);
    expect(unique.size).toBeGreaterThan(1);
  });
});
