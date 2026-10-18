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

/** Forwards non-JSON request bodies (e.g. image uploads) with their own content type. */
export function forwardedContentType(contentType: string | null): Record<string, string> | undefined {
  const value = contentType?.trim();
  if (!value || value.toLowerCase().includes("json")) return undefined;
  return /^image\/(jpeg|png)$/i.test(value) ? { "Content-Type": value } : undefined;
}
