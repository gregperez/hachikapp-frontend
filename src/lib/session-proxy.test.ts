import { describe, expect, it } from "vitest";
import { forwardedContentType, isOwnSessionsPath, sessionRefreshHeader, shouldClearCookiesAfterRevoke } from "@/lib/session-proxy";

describe("session proxy helpers", () => {
  it("matches own session collection and item paths", () => {
    expect(isOwnSessionsPath("v1/users/me/sessions")).toBe(true);
    expect(isOwnSessionsPath("v1/users/me/sessions/family-1")).toBe(true);
    expect(isOwnSessionsPath("v1/users/me")).toBe(false);
    expect(isOwnSessionsPath("v1/auth/logout")).toBe(false);
  });

  it("forwards the refresh cookie only when a token is present", () => {
    expect(sessionRefreshHeader(undefined)).toBeUndefined();
    expect(sessionRefreshHeader("  ")).toBeUndefined();
    expect(sessionRefreshHeader("refresh.jwt")).toEqual({ "X-Refresh-Token": "refresh.jwt" });
  });

  it("clears cookies only when the current family was revoked", () => {
    expect(shouldClearCookiesAfterRevoke({ data: { revokedCurrent: true } })).toBe(true);
    expect(shouldClearCookiesAfterRevoke({ data: { revokedCurrent: false } })).toBe(false);
    expect(shouldClearCookiesAfterRevoke({})).toBe(false);
  });

  it("forwards only image content types for binary uploads", () => {
    expect(forwardedContentType("image/jpeg")).toEqual({ "Content-Type": "image/jpeg" });
    expect(forwardedContentType("image/webp")).toEqual({ "Content-Type": "image/webp" });
    expect(forwardedContentType("application/json")).toBeUndefined();
    expect(forwardedContentType("image/svg+xml")).toBeUndefined();
    expect(forwardedContentType(null)).toBeUndefined();
  });
});
