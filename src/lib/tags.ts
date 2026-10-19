import { api, dataOf } from "@/lib/api";
import { formatMonths, petPhotoSrc } from "@/lib/pets";
import QRCode from "qrcode";
import type { ApiEnvelope, FinderMessageInput, PublicContact, PublicTagView, ScanReceipt } from "@/lib/types";

const VISITOR_KEY = "hachikapp.visitorId";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Used when storage is unavailable; stable for the lifetime of the page.
let sessionVisitorId: string | undefined;

function defaultStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** v4 UUID; randomUUID is missing on insecure origins (plain-HTTP LAN dev), so fall back to getRandomValues. */
function newUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Anonymous per-browser id sent with each scan; falls back to memory if storage is blocked. */
export function getVisitorId(storage?: Storage): string {
  const store = storage ?? defaultStorage();
  try {
    const stored = store?.getItem(VISITOR_KEY);
    if (stored && UUID_PATTERN.test(stored)) return stored;
    const id = newUuid();
    store?.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    sessionVisitorId ??= newUuid();
    return sessionVisitorId;
  }
}

export async function recordScan(code: string, visitorId: string = getVisitorId()): Promise<ScanReceipt> {
  const envelope = await api<ApiEnvelope<ScanReceipt>>(`v1/public/tags/${encodeURIComponent(code)}/scans`, {
    method: "POST",
    body: JSON.stringify({ visitorId }),
  });
  return dataOf(envelope);
}

export async function sendFinderMessage(scanId: string, token: string, input: FinderMessageInput): Promise<void> {
  await api<unknown>(`v1/public/scans/${encodeURIComponent(scanId)}/messages`, {
    method: "POST",
    headers: { "X-Scan-Token": token },
    body: JSON.stringify(input),
  });
}

export async function revealContact(scanId: string, token: string): Promise<PublicContact> {
  const envelope = await api<ApiEnvelope<PublicContact>>(`v1/public/scans/${encodeURIComponent(scanId)}/contact`, {
    method: "POST",
    headers: { "X-Scan-Token": token },
  });
  return dataOf(envelope);
}

/** Public URL of a tag page (what the QR/NFC encodes). */
export function tagUrl(code: string): string {
  const base = (process.env.NEXT_PUBLIC_PUBLIC_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
  return `${base}/t/${code}`;
}

/** SVG markup of the QR that encodes a tag URL. */
export function tagQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 2 });
}

/** Same-origin proxy URL for a backend-relative photoUrl. */
export function tagPhotoUrl(photoUrl?: string): string | undefined {
  return petPhotoSrc(photoUrl);
}

export function formatAgeMonths(months?: number): string {
  return months === undefined || months === null || months < 0 ? "" : formatMonths(months);
}

export type PublicTagResult = { kind: "ok"; view: PublicTagView } | { kind: "not_found" } | { kind: "error" };

/** Server-side fetch of the public tag view (no cookies); never throws. */
export async function loadPublicTag(code: string, ip?: string): Promise<PublicTagResult> {
  const base = (process.env.BACKEND_URL || "http://localhost:8080").replace(/\/$/, "");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (ip) headers["X-Forwarded-For"] = ip;
  try {
    const response = await fetch(`${base}/v1/public/tags/${encodeURIComponent(code)}`, { cache: "no-store", headers });
    if (response.status === 404) return { kind: "not_found" };
    if (!response.ok) return { kind: "error" };
    const body = (await response.json()) as ApiEnvelope<PublicTagView> | null;
    if (!body?.data) return { kind: "error" };
    return { kind: "ok", view: body.data };
  } catch {
    return { kind: "error" };
  }
}

const CODE_ALPHABET = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{10}$/;

/** Mirrors the backend: uppercase, drop spaces/hyphens, O→0, I/L→1; null unless 10 Crockford characters. */
export function normalizeTagCode(raw: string): string | null {
  const code = raw.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  return CODE_ALPHABET.test(code) ? code : null;
}

/** "K7M2Q9XR40" → "K7M2 Q9XR 40" for easier reading. */
export function groupTagCode(code: string): string {
  return code.replace(/(.{4})(?=.)/g, "$1 ");
}

const CHILE_TZ = "America/Santiago";

/** Date and time in Chilean time, whatever the viewer's device timezone is. */
export function formatChileDateTime(value?: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: CHILE_TZ,
  }).format(new Date(value));
}

export function formatChileDate(value?: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric", timeZone: CHILE_TZ }).format(new Date(value));
}

export function deviceLabel(family: string): string {
  switch (family) {
    case "ios": return "iPhone o iPad";
    case "android": return "Android";
    case "desktop": return "Computador";
    default: return "Otro dispositivo";
  }
}

export function tagKindLabel(kind: string): string {
  return kind === "digital" ? "Placa digital" : "Placa física";
}

export function tagStatusLabel(status: string): string {
  return status === "active" ? "Activa" : "Desactivada";
}

/** Keeps only digits and a leading + so the value is safe inside a tel: href. */
export function telHref(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return `tel:${cleaned}`;
}
