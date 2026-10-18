"use client";

import { api, errorMessage } from "@/lib/api";
import { PawPrint } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function CallbackContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const grant = params.get("grant");
    const linked = params.get("linked");
    if (linked) {
      router.replace("/dashboard/profile?linked=1");
      return;
    }
    if (!grant) {
      setError(params.get("error") || "Google no devolvió una autorización válida.");
      return;
    }
    api("v1/auth/oidc/google/exchange", {
      method: "POST",
      body: JSON.stringify({ grant }),
    })
      .then(() => router.replace("/dashboard"))
      .catch((caught) => setError(errorMessage(caught)));
  }, [params, router]);

  return (
    <main className="callback-page">
      <div className="callback-card">
        <span className="brand-mark brand-mark-large"><PawPrint size={28} /></span>
        {error ? (
          <>
            <h1>No pudimos iniciar sesión</h1>
            <p>{error}</p>
            <button className="button primary" onClick={() => router.replace("/login")}>Volver al ingreso</button>
          </>
        ) : (
          <>
            <span className="spinner callback-spinner" />
            <h1>Completando el acceso</h1>
            <p>Estamos verificando tu identidad con Google.</p>
          </>
        )}
      </div>
    </main>
  );
}

export default function CallbackPage() {
  return <Suspense><CallbackContent /></Suspense>;
}
