import { describe, expect, it } from "vitest";
import {
  channelForSession,
  channelForUser,
  isNavigatePathAllowed,
  ALLOWED_REMOTE_ACTIONS,
} from "./remoteEvents";

describe("channelForUser", () => {
  it("produces a per-user channel name", () => {
    expect(channelForUser(42)).toBe("user:42");
  });
});

describe("channelForSession", () => {
  it("produces a per-session channel name", () => {
    expect(channelForSession("abc123")).toBe("session:abc123");
  });
});

describe("isNavigatePathAllowed", () => {
  it("allows normal app routes", () => {
    expect(isNavigatePathAllowed("/")).toBe(true);
    expect(isNavigatePathAllowed("/player")).toBe(true);
    expect(isNavigatePathAllowed("/library")).toBe(true);
    expect(isNavigatePathAllowed("/search?q=foo")).toBe(true);
  });

  it("blocks admin paths", () => {
    expect(isNavigatePathAllowed("/admin")).toBe(false);
    expect(isNavigatePathAllowed("/admin/users")).toBe(false);
  });

  it("blocks logout and oauth flows", () => {
    expect(isNavigatePathAllowed("/logout")).toBe(false);
    expect(isNavigatePathAllowed("/oauth/callback")).toBe(false);
  });

  it("blocks family/relation management paths", () => {
    expect(isNavigatePathAllowed("/settings/family")).toBe(false);
    expect(isNavigatePathAllowed("/settings/family/revoke/1")).toBe(false);
  });

  it("still allows sibling settings paths", () => {
    expect(isNavigatePathAllowed("/settings")).toBe(true);
    expect(isNavigatePathAllowed("/settings/audio")).toBe(true);
  });

  it("normalizes missing leading slash", () => {
    expect(isNavigatePathAllowed("admin")).toBe(false);
    expect(isNavigatePathAllowed("player")).toBe(true);
  });
});

describe("ALLOWED_REMOTE_ACTIONS", () => {
  it("omits sensitive actions", () => {
    const list = ALLOWED_REMOTE_ACTIONS as readonly string[];
    expect(list).not.toContain("auth:logout");
    expect(list).not.toContain("relation:revoke");
    expect(list).not.toContain("admin:access");
  });

  it("includes the core helper actions", () => {
    const list = ALLOWED_REMOTE_ACTIONS as readonly string[];
    expect(list).toContain("action:navigate");
    expect(list).toContain("action:play");
    expect(list).toContain("action:search");
    expect(list).toContain("action:speak");
    expect(list).toContain("action:highlight");
  });
});
