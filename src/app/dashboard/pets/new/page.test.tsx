import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionProvider } from "@/components/session-provider";

const nav = vi.hoisted(() => {
  const state = { pathname: "/dashboard/pets/new", params: {}, search: new URLSearchParams(), router: { push: () => {}, replace: () => {}, refresh: () => {}, back: () => {} } };
  (globalThis as { __nav?: unknown }).__nav = state;
  return state;
});

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useParams: () => nav.params,
  useSearchParams: () => nav.search,
  useRouter: () => nav.router,
}));

import NewPetPage from "./page";

const realFetch = globalThis.fetch;

describe("NewPetPage", () => {
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("waits for the session so typed values are not wiped when it arrives", async () => {
    let resolveSession: (response: Response) => void = () => {};
    globalThis.fetch = vi.fn(
      () => new Promise<Response>((resolve) => { resolveSession = resolve; }),
    ) as unknown as typeof fetch;

    render(<SessionProvider><NewPetPage /></SessionProvider>);
    expect(screen.queryByLabelText(/^Nombre \*/)).not.toBeInTheDocument();
    expect(screen.getByText("Cargando información…")).toBeInTheDocument();

    resolveSession(new Response(JSON.stringify({
      status: 200,
      message: "Ok",
      data: { id: "u1", name: "Wilson Sayago", email: "w@example.com", active: true, isAdmin: false, roles: [], permissions: [] },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    expect(await screen.findByLabelText(/^Nombre \*/)).toBeInTheDocument();
  });
});
