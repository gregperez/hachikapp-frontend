import { api, dataOf } from "@/lib/api";
import { formatMonths, petPhotoSrc } from "@/lib/pets";
import type { ApiEnvelope, FinderMessageInput, PublicContact, ScanReceipt } from "@/lib/types";

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

/** Anonymous per-browser id sent with each scan; falls back to memory if storage is blocked. */
export function getVisitorId(storage?: Storage): string {
  const store = storage ?? defaultStorage();
  try {
    const stored = store?.getItem(VISITOR_KEY);
    if (stored && UUID_PATTERN.test(stored)) return stored;
    const id = crypto.randomUUID();
    store?.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    sessionVisitorId ??= crypto.randomUUID();
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

/** Same-origin proxy URL for a backend-relative photoUrl. */
export function tagPhotoUrl(photoUrl?: string): string | undefined {
  return petPhotoSrc(photoUrl);
}

export function formatAgeMonths(months?: number): string {
  return months === undefined || months === null || months < 0 ? "" : formatMonths(months);
}
