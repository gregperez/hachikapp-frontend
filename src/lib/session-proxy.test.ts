import { describe, expect, it } from "vitest";
import { clientIpFrom, forwardedContentType, scanTokenHeader, isOwnSessionsPath, sessionRefreshHeader, shouldClearCookiesAfterRevoke } from "@/lib/session-proxy";

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
    expect(forwardedContentType("image/png")).toEqual({ "Content-Type": "image/png" });
    expect(forwardedContentType("image/webp")).toBeUndefined();
    expect(forwardedContentType("application/json")).toBeUndefined();
    expect(forwardedContentType("image/svg+xml")).toBeUndefined();
    expect(forwardedContentType(null)).toBeUndefined();
  });
});

describe("clientIpFrom", () => {
  it("uses a single x-forwarded-for value", () => {
    expect(clientIpFrom(new Headers({ "x-forwarded-for": "203.0.113.5" }))).toBe("203.0.113.5");
  });

  it("uses the last x-forwarded-for entry, trimmed", () => {
    expect(clientIpFrom(new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2 ,  203.0.113.5 " }))).toBe("203.0.113.5");
  });

  it("prefers x-real-ip", () => {
    expect(clientIpFrom(new Headers({ "x-real-ip": "198.51.100.7", "x-forwarded-for": "1.1.1.1" }))).toBe("198.51.100.7");
  });

  it("returns undefined when missing or empty", () => {
    expect(clientIpFrom(new Headers())).toBeUndefined();
    expect(clientIpFrom(new Headers({ "x-forwarded-for": "  " }))).toBeUndefined();
    expect(clientIpFrom(new Headers({ "x-real-ip": " " }))).toBeUndefined();
  });
});

describe("scanTokenHeader", () => {
  it("forwards the token only for public scan paths", () => {
    expect(scanTokenHeader("v1/public/scans/s1/contact", "tok")).toEqual({ "X-Scan-Token": "tok" });
    expect(scanTokenHeader("v1/pets", "tok")).toBeUndefined();
    expect(scanTokenHeader("v1/public/tags/ABC/scans", "tok")).toBeUndefined();
    expect(scanTokenHeader("v1/public/scans/s1/contact", null)).toBeUndefined();
    expect(scanTokenHeader("v1/public/scans/s1/contact", "  ")).toBeUndefined();
  });
});
