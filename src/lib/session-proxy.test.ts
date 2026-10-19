import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clientIpFrom, forwardedContentType, proxyResponseHeaders, scanTokenHeader, isOwnSessionsPath, sessionRefreshHeader, shouldClearCookiesAfterRevoke } from "@/lib/session-proxy";

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
  let saved: string | undefined;
  beforeEach(() => {
    saved = process.env.CLIENT_IP_HEADER;
    delete process.env.CLIENT_IP_HEADER;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.CLIENT_IP_HEADER;
    else process.env.CLIENT_IP_HEADER = saved;
  });

  it("defaults to the last x-forwarded-for entry, trimmed", () => {
    expect(clientIpFrom(new Headers({ "x-forwarded-for": "203.0.113.5" }))).toBe("203.0.113.5");
    expect(clientIpFrom(new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2 ,  203.0.113.5 " }))).toBe("203.0.113.5");
    expect(clientIpFrom(new Headers({ "x-forwarded-for": "1.1.1.1, 203.0.113.5" }), "X-Forwarded-For")).toBe("203.0.113.5");
  });

  it("ignores x-real-ip when it is not the configured header", () => {
    expect(clientIpFrom(new Headers({ "x-real-ip": "198.51.100.7", "x-forwarded-for": "1.1.1.1" }))).toBe("1.1.1.1");
    expect(clientIpFrom(new Headers({ "x-real-ip": "198.51.100.7" }))).toBeUndefined();
  });

  it("reads the header named in CLIENT_IP_HEADER", () => {
    process.env.CLIENT_IP_HEADER = "x-real-ip";
    expect(clientIpFrom(new Headers({ "x-real-ip": " 198.51.100.7 ", "x-forwarded-for": "1.1.1.1" }))).toBe("198.51.100.7");
  });

  it("reads an explicit x-real-ip header without falling back", () => {
    expect(clientIpFrom(new Headers({ "x-real-ip": "198.51.100.7", "x-forwarded-for": "1.1.1.1" }), "x-real-ip")).toBe("198.51.100.7");
    expect(clientIpFrom(new Headers({ "x-forwarded-for": "1.1.1.1" }), "x-real-ip")).toBeUndefined();
  });

  it("reads cf-connecting-ip verbatim, first token if comma-separated", () => {
    expect(clientIpFrom(new Headers({ "cf-connecting-ip": "203.0.113.9", "x-forwarded-for": "1.1.1.1" }), "cf-connecting-ip")).toBe("203.0.113.9");
    expect(clientIpFrom(new Headers({ "cf-connecting-ip": " 203.0.113.9 , 5.5.5.5" }), "cf-connecting-ip")).toBe("203.0.113.9");
  });

  it("returns undefined when missing or empty", () => {
    expect(clientIpFrom(new Headers())).toBeUndefined();
    expect(clientIpFrom(new Headers({ "x-forwarded-for": "  " }))).toBeUndefined();
    expect(clientIpFrom(new Headers({ "x-forwarded-for": "1.1.1.1, " }))).toBeUndefined();
    expect(clientIpFrom(new Headers({ "x-real-ip": " " }), "x-real-ip")).toBeUndefined();
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

describe("proxyResponseHeaders", () => {
  it("keeps JSON responses as they were: content type only", () => {
    expect(proxyResponseHeaders("application/json", null)).toEqual({ "Content-Type": "application/json" });
    expect(proxyResponseHeaders("application/problem+json", "no-store")).toEqual({ "Content-Type": "application/problem+json" });
  });

  it("marks non-JSON responses private, no-store unless upstream set a policy", () => {
    expect(proxyResponseHeaders("text/csv; charset=utf-8", null)).toEqual({
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "private, no-store",
    });
    expect(proxyResponseHeaders("text/csv", "no-cache")).toEqual({ "Content-Type": "text/csv", "Cache-Control": "no-cache" });
  });

  it("keeps image caching and adds nosniff", () => {
    expect(proxyResponseHeaders("image/jpeg", "private, max-age=300")).toEqual({
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    });
    expect(proxyResponseHeaders("image/png", null)).toEqual({
      "Content-Type": "image/png",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
  });
});
