export function isOwnSessionsPath(apiPath: string): boolean {
  return apiPath === "v1/users/me/sessions" || apiPath.startsWith("v1/users/me/sessions/");
}

export function sessionRefreshHeader(refreshToken?: string): Record<string, string> | undefined {
  const token = refreshToken?.trim();
  if (!token) {
    return undefined;
  }
  return { "X-Refresh-Token": token };
}

export function shouldClearCookiesAfterRevoke(payload: { data?: { revokedCurrent?: boolean } } | null | undefined): boolean {
  return payload?.data?.revokedCurrent === true;
}

/**
 * Client IP for the backend rate limiter, read only from the header the
 * deployment's proxy sets or overwrites (CLIENT_IP_HEADER). Unset or
 * "x-forwarded-for": the last x-forwarded-for entry, i.e. the hop added by
 * the nearest proxy. Any other name (x-real-ip, cf-connecting-ip, ...): that
 * header verbatim, first token if comma-separated. Never falls back to a
 * different header, so a client cannot pick its own IP through one.
 */
export function clientIpFrom(headers: Headers, headerName: string | undefined = process.env.CLIENT_IP_HEADER): string | undefined {
  const name = headerName?.trim().toLowerCase() || "x-forwarded-for";
  const value = headers.get(name);
  if (!value) return undefined;
  const parts = value.split(",");
  const picked = name === "x-forwarded-for" ? parts[parts.length - 1] : parts[0];
  return picked?.trim() || undefined;
}

/** The finder's scan token is forwarded only to the public scan endpoints. */
export function scanTokenHeader(apiPath: string, token: string | null | undefined): Record<string, string> | undefined {
  const value = token?.trim();
  if (!value || !apiPath.startsWith("v1/public/scans/")) return undefined;
  return { "X-Scan-Token": value };
}

/** Forwards non-JSON request bodies (e.g. image uploads) with their own content type. */
export function forwardedContentType(contentType: string | null): Record<string, string> | undefined {
  const value = contentType?.trim();
  if (!value || value.toLowerCase().includes("json")) return undefined;
  return /^image\/(jpeg|png)$/i.test(value) ? { "Content-Type": value } : undefined;
}

/**
 * Headers the backend proxy sends back. JSON keeps only its content type.
 * Anything else (pet photos, the admin codes.csv) keeps the upstream
 * Cache-Control or gets "private, no-store"; images also get nosniff.
 */
export function proxyResponseHeaders(contentType: string, upstreamCacheControl: string | null): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": contentType };
  if (contentType.toLowerCase().includes("json")) return headers;
  headers["Cache-Control"] = upstreamCacheControl || "private, no-store";
  if (contentType.startsWith("image/")) headers["X-Content-Type-Options"] = "nosniff";
  return headers;
}
