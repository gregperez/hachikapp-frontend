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
