import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import {
  formatAgeMonths,
  getVisitorId,
  recordScan,
  revealContact,
  sendFinderMessage,
  tagPhotoUrl,
  tagUrl,
} from "@/lib/tags";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    removeItem: (key: string) => void data.delete(key),
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

function throwingStorage(on: "getItem" | "setItem" | "both"): Storage {
  const base = memoryStorage();
  return {
    ...base,
    getItem: (key: string) => {
      if (on !== "setItem") throw new Error("blocked");
      return base.getItem(key);
    },
    setItem: (key: string, value: string) => {
      if (on !== "getItem") throw new Error("quota");
      base.setItem(key, value);
    },
  } as Storage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getVisitorId", () => {
  it("generates a UUID, stores it and reuses it", () => {
    const storage = memoryStorage();
    const first = getVisitorId(storage);
    expect(first).toMatch(UUID);
    expect(storage.getItem("hachikapp.visitorId")).toBe(first);
    expect(getVisitorId(storage)).toBe(first);
  });

  it("reuses a valid stored id", () => {
    const stored = "3c0b7f8e-1d2e-4f5a-9b6c-7d8e9f0a1b2c";
    expect(getVisitorId(memoryStorage({ "hachikapp.visitorId": stored }))).toBe(stored);
  });

  it("regenerates when the stored value is not a UUID", () => {
    const storage = memoryStorage({ "hachikapp.visitorId": "not-a-uuid" });
    const id = getVisitorId(storage);
    expect(id).toMatch(UUID);
    expect(storage.getItem("hachikapp.visitorId")).toBe(id);
  });

  it("returns a stable session id when setItem throws", () => {
    const storage = throwingStorage("setItem");
    const first = getVisitorId(storage);
    expect(first).toMatch(UUID);
    expect(getVisitorId(storage)).toBe(first);
  });

  it("returns a stable session id when getItem throws", () => {
    const storage = throwingStorage("getItem");
    const first = getVisitorId(storage);
    expect(first).toMatch(UUID);
    expect(getVisitorId(storage)).toBe(first);
  });
});

describe("formatAgeMonths", () => {
  it.each([
    [0, "Menos de 1 mes"],
    [1, "1 mes"],
    [8, "8 meses"],
    [12, "1 año"],
    [67, "5 años"],
    [undefined, ""],
  ])("formats %s", (months, expected) => {
    expect(formatAgeMonths(months)).toBe(expected);
  });
});

describe("tagUrl and tagPhotoUrl", () => {
  it("builds the public URL from the current origin", () => {
    expect(tagUrl("K7M2Q9XR4P")).toBe(`${window.location.origin}/t/K7M2Q9XR4P`);
  });

  it("prefixes the proxy path to the photo URL", () => {
    expect(tagPhotoUrl("/v1/public/tags/K7M2Q9XR4P/photo?v=1")).toBe("/api/backend/v1/public/tags/K7M2Q9XR4P/photo?v=1");
    expect(tagPhotoUrl(undefined)).toBeUndefined();
  });
});

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("public scan client", () => {
  it("records a scan with the visitor id", async () => {
    const fetchMock = stubFetch(201, { data: { scanId: "s1", scanToken: "tok" } });
    const receipt = await recordScan("K7M2Q9XR4P", "3c0b7f8e-1d2e-4f5a-9b6c-7d8e9f0a1b2c");
    expect(receipt).toEqual({ scanId: "s1", scanToken: "tok" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/backend/v1/public/tags/K7M2Q9XR4P/scans");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ visitorId: "3c0b7f8e-1d2e-4f5a-9b6c-7d8e9f0a1b2c" });
  });

  it("sends the finder message with the scan token", async () => {
    const fetchMock = stubFetch(202, null);
    await sendFinderMessage("s1", "tok", { body: "Lo encontré", finderName: "Camila" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/backend/v1/public/scans/s1/messages");
    expect(init.headers["X-Scan-Token"]).toBe("tok");
    expect(JSON.parse(init.body)).toEqual({ body: "Lo encontré", finderName: "Camila" });
  });

  it("reveals the contact sending X-Scan-Token", async () => {
    const fetchMock = stubFetch(200, { data: { phone: "+56 9 1234 5678", whatsappUrl: "https://wa.me/56912345678" } });
    const contact = await revealContact("s1", "tok");
    expect(contact.whatsappUrl).toBe("https://wa.me/56912345678");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/backend/v1/public/scans/s1/contact");
    expect(init.method).toBe("POST");
    expect(init.headers["X-Scan-Token"]).toBe("tok");
  });

  it("throws ApiError on failure", async () => {
    stubFetch(404, { title: "Not Found", detail: "Tag not found" });
    const error = await revealContact("s1", "tok").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
  });
});
