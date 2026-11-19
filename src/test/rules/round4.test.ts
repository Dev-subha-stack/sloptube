import { describe, expect, it } from "vitest";
import { canOpenTab, MODERATOR_PERMISSIONS, roleProblem } from "@/lib/admin/permissions";

describe("staff powers", () => {
  it("admins open every tab, including roles", () => {
    expect(canOpenTab("roles", new Set(), true)).toBe(true);
    expect(canOpenTab("videos", new Set(), true)).toBe(true);
  });

  it("only admins manage roles and badges", () => {
    expect(canOpenTab("roles", new Set(["manage_videos", "edit_usernames", "view_users"]), false)).toBe(false);
  });

  it("a custom role opens only the tabs for its powers", () => {
    const helper = new Set(["manage_videos", "view_log"]);
    expect(canOpenTab("videos", helper, false)).toBe(true);
    expect(canOpenTab("log", helper, false)).toBe(true);
    expect(canOpenTab("bugs", helper, false)).toBe(false);
    expect(canOpenTab("users", helper, false)).toBe(false);
  });

  it("moderators handle bugs, suggestions and comments by default", () => {
    expect([...MODERATOR_PERMISSIONS].sort()).toEqual(["manage_bugs", "manage_comments", "manage_suggestions"]);
  });

  it("role badges need a name and a hex colour", () => {
    expect(roleProblem("Helper", "#ff8800")).toBeNull();
    expect(roleProblem("", "#ff8800")).not.toBeNull();
    expect(roleProblem("Helper", "orange")).not.toBeNull();
  });
});
