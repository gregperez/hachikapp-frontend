import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_VISIBILITY } from "@/lib/pets";

const PET_ID = "2f1c5a0e-6a43-4f8e-9a51-0c2f3f9b7d11";

const nav = vi.hoisted(() => {
  const state = {
    pathname: "/dashboard/pets/2f1c5a0e-6a43-4f8e-9a51-0c2f3f9b7d11",
    params: { id: "2f1c5a0e-6a43-4f8e-9a51-0c2f3f9b7d11" },
    search: new URLSearchParams("created=1"),
    replaced: [] as string[],
    router: { push: () => {}, replace: (href: string) => { state.replaced.push(href); }, refresh: () => {}, back: () => {} },
  };
  // Also exposed globally so the suite can run where vi.mock is unavailable; harmless under vitest.
  (globalThis as { __nav?: unknown }).__nav = state;
  return state;
});

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useParams: () => nav.params,
  useSearchParams: () => nav.search,
  useRouter: () => nav.router,
}));

import PetDetailPage from "./page";

const pet = {
  id: PET_ID, name: "Luna", species: "dog", breed: "", color: "", sex: "female", birthDate: "", chipNumber: "",
  weightKg: null, size: "", distinctiveFeatures: "",
  health: { allergies: [], surgeries: [], specialConditions: [], temperament: "" },
  owner: { fullName: "Wilson", address: "", comuna: "", phone: "+56 9 1234 5678", phoneAlt: "" },
  secondOwner: { fullName: "", phone: "" },
  publicVisibility: DEFAULT_VISIBILITY, version: 1, createdAt: "", updatedAt: "",
};

const realFetch = globalThis.fetch;

describe("PetDetailPage", () => {
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("shows the created notice once and removes the flag from the URL", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ status: 200, message: "Ok", data: pet }), {
      status: 200, headers: { "Content-Type": "application/json" },
    })) as unknown as typeof fetch;

    render(<PetDetailPage />);
    expect(await screen.findByText(/La ficha quedó creada/)).toBeInTheDocument();
    await waitFor(() => expect(nav.replaced).toEqual([`/dashboard/pets/${PET_ID}`]));
  });
});
