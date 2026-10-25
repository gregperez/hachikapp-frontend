import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PetScans } from "./pet-scans";

const PET = "2f1c5a0e-6a43-4f8e-9a51-0c2f3f9b7d11";

function page(items: unknown[], hasNext = false, nextCursor?: string) {
  return new Response(JSON.stringify({ status: 200, message: "Ok", data: { data: items, limit: 10, hasNext, nextCursor } }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
}

const scan = {
  id: "s1", tagCode: "K7M2Q9XR40", scannedAt: "2026-10-01T15:30:00Z", userAgentFamily: "ios", phoneRevealedAt: "2026-10-01T15:31:00Z",
  messages: [{ id: "m1", body: "Lo encontré\nen la plaza", finderName: "Camila", finderPhone: "+56 9 8765 4321", createdAt: "2026-10-01T15:32:00Z" }],
};

describe("PetScans", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("shows the empty text", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => page([])));
    render(<PetScans petId={PET} />);
    expect(await screen.findByText("Aún nadie ha escaneado sus placas")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(`/api/backend/v1/pets/${PET}/scans?limit=10`, expect.anything());
  });

  it("renders a scan with its message, finder phone link and reveal badge", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => page([scan])));
    render(<PetScans petId={PET} />);
    expect(await screen.findByText("iPhone o iPad")).toBeInTheDocument();
    expect(screen.getByText("K7M2 Q9XR 40")).toBeInTheDocument();
    expect(screen.getByText("Vio tu número")).toBeInTheDocument();
    expect(screen.getByText(/Lo encontré/)).toBeInTheDocument();
    expect(screen.getByText("Camila")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "+56 9 8765 4321" })).toHaveAttribute("href", "tel:+56987654321");
  });

  it("loads more with the cursor", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(page([scan], true, "CUR1"))
      .mockResolvedValueOnce(page([{ ...scan, id: "s2", userAgentFamily: "android", phoneRevealedAt: undefined, messages: [] }]));
    vi.stubGlobal("fetch", fetchMock);
    render(<PetScans petId={PET} />);
    await userEvent.click(await screen.findByRole("button", { name: "Ver más" }));
    expect(await screen.findByText("Android")).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toBe(`/api/backend/v1/pets/${PET}/scans?limit=10&cursor=CUR1`);
    expect(screen.getByText("iPhone o iPad")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver más" })).not.toBeInTheDocument();
  });

  it("shows the shared location with a map link", async () => {
    const located = { ...scan, location: { lat: -33.45, lng: -70.66, accuracyM: 12, at: "2026-10-01T15:31:00Z" } };
    vi.stubGlobal("fetch", vi.fn(async () => page([located])));
    render(<PetScans petId={PET} />);
    expect(await screen.findByText("Compartió su ubicación")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Ver en el mapa" });
    expect(link).toHaveAttribute("href", "https://maps.google.com/?q=-33.450000,-70.660000");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows no location text when the scan has no location", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => page([scan])));
    render(<PetScans petId={PET} />);
    expect(await screen.findByText("iPhone o iPad")).toBeInTheDocument();
    expect(screen.queryByText("Compartió su ubicación")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ver en el mapa" })).not.toBeInTheDocument();
  });
});
