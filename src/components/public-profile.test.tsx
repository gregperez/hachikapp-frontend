import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicProfileView } from "@/components/public-profile";
import type { PublicTagResult } from "@/lib/tags";
import type { PublicProfile } from "@/lib/types";

const CODE = "K7M2Q9XR4P";

const profile: PublicProfile = {
  name: "Luna",
  photoUrl: `/v1/public/tags/${CODE}/photo?v=1`,
  species: "dog",
  breed: "Quiltro",
  sex: "female",
  size: "medium",
  ageMonths: 67,
  allergies: ["Pollo"],
  specialConditions: ["Epilepsia"],
  temperament: "Tímida",
  ownerFirstName: "Camila",
  comuna: "Providencia",
  canContact: true,
  lost: false,
};

function ok(overrides: Partial<PublicProfile> = {}): PublicTagResult {
  return { kind: "ok", view: { state: "active", profile: { ...profile, ...overrides } } };
}

type Reply = { status: number; body?: unknown } | Promise<{ status: number; body?: unknown }>;

function stubApi(routes: Record<string, () => Reply>) {
  const fetchMock = vi.fn(async (url: string) => {
    const key = Object.keys(routes).find((suffix) => url.endsWith(suffix));
    const reply = key ? await routes[key]() : { status: 500 };
    return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, json: async () => reply.body ?? null };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const scanOk = () => ({ status: 201, body: { data: { scanId: "s1", scanToken: "tok" } } });

/** First call issues s1/tok, later calls s2/tok2 (a repeat scan rotates the token). */
function scanSequence() {
  let calls = 0;
  return () => {
    calls += 1;
    return calls === 1 ? scanOk() : { status: 201, body: { data: { scanId: "s2", scanToken: "tok2" } } };
  };
}

function callsTo(fetchMock: ReturnType<typeof stubApi>, suffix: string) {
  return fetchMock.mock.calls.filter((call) => (call[0] as string).endsWith(suffix));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PublicProfileView active", () => {
  it("shows the greeting, important card, both buttons and records the scan once under StrictMode", async () => {
    const fetchMock = stubApi({ "/scans": scanOk });
    render(
      <StrictMode>
        <PublicProfileView code={CODE} result={ok()} />
      </StrictMode>,
    );
    expect(screen.getByRole("heading", { name: "Hola, soy Luna" })).toBeInTheDocument();
    expect(screen.getByAltText("Foto de Luna")).toHaveAttribute("src", `/api/backend/v1/public/tags/${CODE}/photo?v=1`);
    expect(screen.getByText("Importante")).toBeInTheDocument();
    expect(screen.getByText("Pollo")).toBeInTheDocument();
    expect(screen.getByText("Epilepsia")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Avisar a mi familia" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Llamar / WhatsApp" })).toBeInTheDocument();
    expect(screen.queryByText(/Compartir mi ubicación/)).not.toBeInTheDocument();
    expect(screen.getByText("Mi familia: Camila")).toBeInTheDocument();
    expect(screen.getByText("5 años")).toBeInTheDocument();
    await waitFor(() => expect(callsTo(fetchMock, "/scans")).toHaveLength(1));
    const [url, init] = callsTo(fetchMock, "/scans")[0] as unknown as [string, RequestInit];
    expect(url).toBe(`/api/backend/v1/public/tags/${CODE}/scans`);
    expect(init.method).toBe("POST");
  });

  it("hides the photo when it fails to load", () => {
    stubApi({ "/scans": scanOk });
    render(<PublicProfileView code={CODE} result={ok()} />);
    fireEvent.error(screen.getByAltText("Foto de Luna"));
    expect(screen.queryByAltText("Foto de Luna")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Hola, soy Luna" })).toBeInTheDocument();
  });

  it("hides the call button when the owner does not allow contact", () => {
    stubApi({ "/scans": scanOk });
    render(<PublicProfileView code={CODE} result={ok({ canContact: false })} />);
    expect(screen.queryByRole("button", { name: "Llamar / WhatsApp" })).not.toBeInTheDocument();
  });

  it("keeps showing the profile when recording the scan fails", async () => {
    const fetchMock = stubApi({ "/scans": () => ({ status: 500 }) });
    render(<PublicProfileView code={CODE} result={ok()} />);
    await waitFor(() => expect(callsTo(fetchMock, "/scans")).toHaveLength(1));
    expect(screen.getByRole("heading", { name: "Hola, soy Luna" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("PublicProfileView other states", () => {
  it("unassigned links straight to activation (middleware handles login)", () => {
    const fetchMock = stubApi({});
    render(<PublicProfileView code={CODE} result={{ kind: "ok", view: { state: "unassigned" } }} />);
    expect(screen.getByText("Esta placa aún no está activada")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Activar" })).toHaveAttribute("href", `/t/${CODE}/activar`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("disabled shows no data", () => {
    const fetchMock = stubApi({});
    render(<PublicProfileView code={CODE} result={{ kind: "ok", view: { state: "disabled", profile } }} />);
    expect(screen.getByText("Esta placa no está disponible")).toBeInTheDocument();
    expect(screen.queryByText(/Luna/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("not found", () => {
    stubApi({});
    render(<PublicProfileView code={CODE} result={{ kind: "not_found" }} />);
    expect(screen.getByText("No encontramos esta placa")).toBeInTheDocument();
  });

  it("backend error", () => {
    const fetchMock = stubApi({});
    render(<PublicProfileView code={CODE} result={{ kind: "error" }} />);
    expect(screen.getByText("Algo falló, intenta de nuevo")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Avisar a mi familia" })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("PublicProfileView contact", () => {
  it("keeps the phone out of the DOM until tapped, then shows tel and WhatsApp links", async () => {
    const fetchMock = stubApi({
      "/scans": scanOk,
      "/contact": () => ({ status: 200, body: { data: { phone: "+56 9 1234 5678", whatsappUrl: "https://wa.me/56912345678" } } }),
    });
    const user = userEvent.setup();
    render(<PublicProfileView code={CODE} result={ok()} />);
    expect(document.body.innerHTML).not.toContain("1234");
    expect(screen.queryByRole("link", { name: /Llamar/ })).not.toBeInTheDocument();
    await waitFor(() => expect(callsTo(fetchMock, "/scans")).toHaveLength(1));

    await user.click(screen.getByRole("button", { name: "Llamar / WhatsApp" }));
    const call = await waitFor(() => {
      const found = callsTo(fetchMock, "/contact")[0];
      expect(found).toBeDefined();
      return found as unknown as [string, RequestInit];
    });
    expect(call[0]).toBe("/api/backend/v1/public/scans/s1/contact");
    expect(call[1].method).toBe("POST");
    expect((call[1].headers as Record<string, string>)["X-Scan-Token"]).toBe("tok");

    const tel = await screen.findByRole("link", { name: /Llamar/ });
    expect(tel).toHaveAttribute("href", "tel:+56912345678");
    expect(tel).toHaveTextContent("Llamar +56 9 1234 5678");
    const wa = screen.getByRole("link", { name: /WhatsApp/ });
    expect(wa).toHaveAttribute("href", "https://wa.me/56912345678");
    expect(wa).toHaveAttribute("target", "_blank");
    expect(wa).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("404 even with a fresh token tells the finder to leave a message and hides the call button", async () => {
    const fetchMock = stubApi({ "/scans": scanSequence(), "/contact": () => ({ status: 404, body: { title: "Not Found" } }) });
    const user = userEvent.setup();
    render(<PublicProfileView code={CODE} result={ok()} />);
    await waitFor(() => expect(callsTo(fetchMock, "/scans")).toHaveLength(1));
    await user.click(screen.getByRole("button", { name: "Llamar / WhatsApp" }));
    expect(await screen.findByText("Su familia prefiere que le dejes un mensaje")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Llamar / WhatsApp" })).not.toBeInTheDocument();
    expect(callsTo(fetchMock, "/scans")).toHaveLength(2);
    const contacts = callsTo(fetchMock, "/contact") as unknown as Array<[string, RequestInit]>;
    expect(contacts).toHaveLength(2);
    expect(contacts[1][0]).toBe("/api/backend/v1/public/scans/s2/contact");
    expect((contacts[1][1].headers as Record<string, string>)["X-Scan-Token"]).toBe("tok2");
  });

  it("re-scans after a 404 from a rotated token and then reveals the contact", async () => {
    let contactCalls = 0;
    const fetchMock = stubApi({
      "/scans": scanSequence(),
      "/contact": () => {
        contactCalls += 1;
        return contactCalls === 1
          ? { status: 404, body: { title: "Not Found" } }
          : { status: 200, body: { data: { phone: "+56 9 1234 5678", whatsappUrl: "https://wa.me/56912345678" } } };
      },
    });
    const user = userEvent.setup();
    render(<PublicProfileView code={CODE} result={ok()} />);
    await waitFor(() => expect(callsTo(fetchMock, "/scans")).toHaveLength(1));
    await user.click(screen.getByRole("button", { name: "Llamar / WhatsApp" }));
    expect(await screen.findByRole("link", { name: /Llamar/ })).toHaveAttribute("href", "tel:+56912345678");
    expect(screen.queryByText("Su familia prefiere que le dejes un mensaje")).not.toBeInTheDocument();
    expect(callsTo(fetchMock, "/scans")).toHaveLength(2);
    const contacts = callsTo(fetchMock, "/contact") as unknown as Array<[string, RequestInit]>;
    expect(contacts).toHaveLength(2);
    expect((contacts[1][1].headers as Record<string, string>)["X-Scan-Token"]).toBe("tok2");
  });

  it("shares one in-flight scan between the page load and a tap on call", async () => {
    let release: (value: { status: number; body?: unknown }) => void = () => {};
    const pendingScan = new Promise<{ status: number; body?: unknown }>((resolve) => {
      release = resolve;
    });
    const fetchMock = stubApi({
      "/scans": () => pendingScan,
      "/contact": () => ({ status: 200, body: { data: { phone: "+56 9 1234 5678", whatsappUrl: "https://wa.me/56912345678" } } }),
    });
    const user = userEvent.setup();
    render(<PublicProfileView code={CODE} result={ok()} />);
    await waitFor(() => expect(callsTo(fetchMock, "/scans")).toHaveLength(1));
    await user.click(screen.getByRole("button", { name: "Llamar / WhatsApp" }));
    await act(async () => release(scanOk()));
    expect(await screen.findByRole("link", { name: /Llamar/ })).toBeInTheDocument();
    expect(callsTo(fetchMock, "/scans")).toHaveLength(1);
    expect(callsTo(fetchMock, "/contact")).toHaveLength(1);
  });
});

describe("PublicProfileView message form", () => {
  async function openForm() {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Avisar a mi familia" }));
    return user;
  }

  it("disables the submit button while sending and then thanks the finder", async () => {
    let release: (value: { status: number }) => void = () => {};
    const pending = new Promise<{ status: number }>((resolve) => {
      release = resolve;
    });
    const fetchMock = stubApi({ "/scans": scanOk, "/messages": () => pending });
    render(<PublicProfileView code={CODE} result={ok()} />);
    await waitFor(() => expect(callsTo(fetchMock, "/scans")).toHaveLength(1));
    const user = await openForm();

    expect(screen.getByLabelText("Tu mensaje")).toHaveAttribute("required");
    await user.type(screen.getByLabelText("Tu mensaje"), "Está conmigo");
    expect(screen.getByText("12/500")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Tu nombre/), "Ana");
    const submit = screen.getByRole("button", { name: "Enviar mensaje" });
    await user.click(submit);

    await waitFor(() => expect(screen.getByRole("button", { name: /Enviando/ })).toBeDisabled());
    const [url, init] = callsTo(fetchMock, "/messages")[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/backend/v1/public/scans/s1/messages");
    expect((init.headers as Record<string, string>)["X-Scan-Token"]).toBe("tok");
    expect(JSON.parse(init.body as string)).toEqual({ body: "Está conmigo", finderName: "Ana", website: "" });

    await act(async () => release({ status: 202 }));
    expect(await screen.findByText("¡Gracias! Su familia recibirá tu mensaje")).toBeInTheDocument();
    expect(screen.queryByLabelText("Tu mensaje")).not.toBeInTheDocument();
  });

  it("has a hidden honeypot field", async () => {
    stubApi({ "/scans": scanOk });
    render(<PublicProfileView code={CODE} result={ok()} />);
    await openForm();
    const honeypot = document.querySelector('input[name="website"]') as HTMLInputElement;
    expect(honeypot).not.toBeNull();
    expect(honeypot).toHaveAttribute("tabindex", "-1");
    expect(honeypot).toHaveAttribute("autocomplete", "off");
    expect(honeypot.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it("shows Spanish field errors on 422", async () => {
    stubApi({
      "/scans": scanOk,
      "/messages": () => ({ status: 422, body: { errors: [{ field: "finderPhone", code: "phone" }, { field: "body", code: "required" }] } }),
    });
    render(<PublicProfileView code={CODE} result={ok()} />);
    const user = await openForm();
    await user.type(screen.getByLabelText("Tu mensaje"), "Hola");
    await user.click(screen.getByRole("button", { name: "Enviar mensaje" }));
    expect(await screen.findByText("Escribe un mensaje")).toBeInTheDocument();
    expect(screen.getByText("Revisa el teléfono")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar mensaje" })).not.toBeDisabled();
  });

  it("shows the rate-limit message on 429 and a generic one otherwise", async () => {
    let status = 429;
    stubApi({ "/scans": scanOk, "/messages": () => ({ status, body: null }) });
    render(<PublicProfileView code={CODE} result={ok()} />);
    const user = await openForm();
    await user.type(screen.getByLabelText("Tu mensaje"), "Hola");
    await user.click(screen.getByRole("button", { name: "Enviar mensaje" }));
    expect(await screen.findByText("Hiciste muchos intentos. Espera un momento e intenta de nuevo.")).toBeInTheDocument();
    status = 500;
    await user.click(screen.getByRole("button", { name: "Enviar mensaje" }));
    expect(await screen.findByText("Algo falló, intenta de nuevo")).toBeInTheDocument();
  });

  it("does not call the backend when the message is empty or blank", async () => {
    const fetchMock = stubApi({ "/scans": () => ({ status: 500 }) });
    render(<PublicProfileView code={CODE} result={ok()} />);
    await waitFor(() => expect(callsTo(fetchMock, "/scans")).toHaveLength(1));
    const user = await openForm();
    await user.click(screen.getByRole("button", { name: "Enviar mensaje" }));
    expect(await screen.findByText("Escribe un mensaje")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Tu mensaje"), "   ");
    await user.click(screen.getByRole("button", { name: "Enviar mensaje" }));
    expect(screen.getByText("Escribe un mensaje")).toBeInTheDocument();
    expect(callsTo(fetchMock, "/scans")).toHaveLength(1);
    expect(callsTo(fetchMock, "/messages")).toHaveLength(0);
  });

  it("re-scans after a 404 from a rotated token and resends the message once", async () => {
    let messageCalls = 0;
    const fetchMock = stubApi({
      "/scans": scanSequence(),
      "/messages": () => {
        messageCalls += 1;
        return messageCalls === 1 ? { status: 404, body: { title: "Not Found" } } : { status: 202 };
      },
    });
    render(<PublicProfileView code={CODE} result={ok()} />);
    await waitFor(() => expect(callsTo(fetchMock, "/scans")).toHaveLength(1));
    const user = await openForm();
    await user.type(screen.getByLabelText("Tu mensaje"), "Hola");
    await user.click(screen.getByRole("button", { name: "Enviar mensaje" }));
    expect(await screen.findByText("¡Gracias! Su familia recibirá tu mensaje")).toBeInTheDocument();
    expect(callsTo(fetchMock, "/scans")).toHaveLength(2);
    const messages = callsTo(fetchMock, "/messages") as unknown as Array<[string, RequestInit]>;
    expect(messages).toHaveLength(2);
    expect(messages[1][0]).toBe("/api/backend/v1/public/scans/s2/messages");
    expect((messages[1][1].headers as Record<string, string>)["X-Scan-Token"]).toBe("tok2");
    expect(JSON.parse(messages[1][1].body as string)).toEqual({ body: "Hola", website: "" });
  });

  it("shows a generic error when the message still gets 404 with a fresh token", async () => {
    const fetchMock = stubApi({ "/scans": scanSequence(), "/messages": () => ({ status: 404, body: { title: "Not Found" } }) });
    render(<PublicProfileView code={CODE} result={ok()} />);
    await waitFor(() => expect(callsTo(fetchMock, "/scans")).toHaveLength(1));
    const user = await openForm();
    await user.type(screen.getByLabelText("Tu mensaje"), "Hola");
    await user.click(screen.getByRole("button", { name: "Enviar mensaje" }));
    expect(await screen.findByText("Algo falló, intenta de nuevo")).toBeInTheDocument();
    expect(callsTo(fetchMock, "/scans")).toHaveLength(2);
    expect(callsTo(fetchMock, "/messages")).toHaveLength(2);
  });

  it("retries recording the scan on submit and fails gracefully when it still fails", async () => {
    const fetchMock = stubApi({ "/scans": () => ({ status: 500 }) });
    render(<PublicProfileView code={CODE} result={ok()} />);
    await waitFor(() => expect(callsTo(fetchMock, "/scans")).toHaveLength(1));
    const user = await openForm();
    await user.type(screen.getByLabelText("Tu mensaje"), "Hola");
    await user.click(screen.getByRole("button", { name: "Enviar mensaje" }));
    expect(await screen.findByText("Algo falló, intenta de nuevo")).toBeInTheDocument();
    expect(callsTo(fetchMock, "/scans")).toHaveLength(2);
    expect(callsTo(fetchMock, "/messages")).toHaveLength(0);
  });
});
