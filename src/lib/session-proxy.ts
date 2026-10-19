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

/** Client IP for the backend rate limiter: x-real-ip, else the last x-forwarded-for entry. */
export function clientIpFrom(headers: Headers): string | undefined {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = headers.get("x-forwarded-for");
  if (!forwarded) return undefined;
  const last = forwarded.split(",").pop()?.trim();
  return last || undefined;
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
