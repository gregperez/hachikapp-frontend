import { NextRequest, NextResponse } from "next/server";
import { forwardedContentType, isOwnSessionsPath, sessionRefreshHeader, shouldClearCookiesAfterRevoke } from "@/lib/session-proxy";

const backendUrl = (process.env.BACKEND_URL || "http://localhost:8080").replace(/\/$/, "");
const ACCESS_COOKIE = "base_access";
const REFRESH_COOKIE = "base_refresh";

type TokenEnvelope = {
  status?: number;
  message?: string;
  data?: { accessToken?: string; refreshToken?: string };
};

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

function saveTokens(response: NextResponse, payload: TokenEnvelope) {
  if (payload.data?.accessToken) {
    response.cookies.set(ACCESS_COOKIE, payload.data.accessToken, cookieOptions(15 * 60));
  }
  if (payload.data?.refreshToken) {
    response.cookies.set(REFRESH_COOKIE, payload.data.refreshToken, cookieOptions(7 * 24 * 60 * 60));
  }
}

function clearTokens(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", cookieOptions(0));
  response.cookies.set(REFRESH_COOKIE, "", cookieOptions(0));
}

async function backendFetch(
  url: string,
  method: string,
  body: ArrayBuffer | undefined,
  accessToken?: string,
  extraHeaders?: HeadersInit,
) {
  const headers = new Headers({ Accept: "application/json" });
  if (body?.byteLength) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (extraHeaders) {
    new Headers(extraHeaders).forEach((value, key) => headers.set(key, value));
  }
  return fetch(url, { method, headers, body: body?.byteLength ? body : undefined, cache: "no-store" });
}

async function makeResponse(source: Response) {
  const contentType = source.headers.get("content-type") || "application/json";
  const responseBody = source.status === 204 ? null : await source.arrayBuffer();
  const headers: Record<string, string> = { "Content-Type": contentType };
  // Binary payloads (pet photos) keep the upstream caching and sniffing rules.
  if (contentType.startsWith("image/")) {
    headers["Cache-Control"] = source.headers.get("cache-control") || "private, no-store";
    headers["X-Content-Type-Options"] = "nosniff";
  }
  return new NextResponse(responseBody, { status: source.status, headers });
}

async function handler(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    return await proxyRequest(request, context);
  } catch (error) {
    console.error("Backend proxy request failed", error);
    return NextResponse.json(
      {
        type: "about:blank",
        title: "Backend no disponible",
        status: 502,
        code: "backend_unavailable",
        detail: `No fue posible conectar con la API configurada en ${backendUrl}.`,
      },
      { status: 502 },
    );
  }
}

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const apiPath = path.join("/");
  // Gin registers collection handlers with a trailing slash. Going directly to
  // that canonical URL avoids an unnecessary redirect for POST requests.
  const upstreamPath = apiPath === "v1/roles" || apiPath === "v1/users" ? `${apiPath}/` : apiPath;
  const url = `${backendUrl}/${upstreamPath}${request.nextUrl.search}`;
  const method = request.method;
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const bodyHeaders = forwardedContentType(request.headers.get("content-type"));
  let sessionHeaders = isOwnSessionsPath(apiPath) ? sessionRefreshHeader(refreshToken) : undefined;

  if (apiPath === "v1/auth/logout") {
    const logoutBody = new TextEncoder().encode(JSON.stringify({ refreshToken })).buffer;
    const upstream = await backendFetch(url, "POST", logoutBody, accessToken);
    const response = await makeResponse(upstream);
    clearTokens(response);
    return response;
  }

  let upstream = await backendFetch(url, method, body, accessToken, { ...sessionHeaders, ...bodyHeaders });
  let rotatedTokens: TokenEnvelope | undefined;

  const isSessionStart = apiPath === "v1/auth/login" || apiPath === "v1/auth/oidc/google/exchange";
  if (isSessionStart && upstream.ok) {
    const payload = (await upstream.json()) as TokenEnvelope;
    const response = NextResponse.json(
      { status: payload.status ?? 200, message: payload.message ?? "Sesión iniciada", data: null },
      { status: upstream.status },
    );
    saveTokens(response, payload);
    return response;
  }

  const canRefresh = upstream.status === 401 && refreshToken && !apiPath.startsWith("v1/auth/");
  if (canRefresh) {
    const refreshResponse = await backendFetch(
      `${backendUrl}/v1/auth/refresh-token`,
      "POST",
      new TextEncoder().encode(JSON.stringify({ refreshToken })).buffer,
    );
    if (refreshResponse.ok) {
      rotatedTokens = (await refreshResponse.json()) as TokenEnvelope;
      if (isOwnSessionsPath(apiPath)) {
        sessionHeaders = sessionRefreshHeader(rotatedTokens.data?.refreshToken || refreshToken);
      }
      upstream = await backendFetch(url, method, body, rotatedTokens.data?.accessToken, { ...sessionHeaders, ...bodyHeaders });
    }
  }

  if (method === "DELETE" && isOwnSessionsPath(apiPath) && upstream.ok) {
    const payload = (await upstream.json()) as { data?: { revokedCurrent?: boolean } };
    const response = NextResponse.json(payload, { status: upstream.status });
    if (rotatedTokens) saveTokens(response, rotatedTokens);
    if (shouldClearCookiesAfterRevoke(payload)) clearTokens(response);
    return response;
  }

  const response = await makeResponse(upstream);
  if (rotatedTokens) saveTokens(response, rotatedTokens);
  if (upstream.status === 401 && refreshToken && !rotatedTokens) clearTokens(response);
  return response;
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
