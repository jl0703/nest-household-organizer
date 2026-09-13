import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/safe-redirect";

describe("safeRedirectPath", () => {
  it("returns the fallback when no value is provided", () => {
    expect(safeRedirectPath(null)).toBe("/households/new");
    expect(safeRedirectPath(undefined)).toBe("/households/new");
    expect(safeRedirectPath("")).toBe("/households/new");
  });

  it("allows a same-origin relative path", () => {
    expect(safeRedirectPath("/households/abc-123")).toBe("/households/abc-123");
  });

  it("rejects a host-widening payload that would concatenate into an attacker domain", () => {
    expect(safeRedirectPath(".attacker.com/phish")).toBe("/households/new");
  });

  it("rejects a protocol-relative payload", () => {
    expect(safeRedirectPath("//attacker.com/phish")).toBe("/households/new");
  });

  it("rejects an absolute URL to another host", () => {
    expect(safeRedirectPath("https://attacker.com/phish")).toBe("/households/new");
  });
});
