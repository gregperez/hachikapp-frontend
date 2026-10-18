"use client";

import { BrandMark } from "@/components/brand-mark";
import { useSettings } from "@/components/settings-provider";
import { api, errorMessage } from "@/lib/api";
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const { settings } = useSettings();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api("v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.replace(params.get("from") || "/dashboard");
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  function googleLogin() {
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
    const returnTo = `${window.location.origin}/auth/callback`;
    window.location.href = `${backend}/v1/auth/oidc/google/login?return_to=${encodeURIComponent(returnTo)}`;
  }

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-glow login-glow-one" />
        <div className="login-glow login-glow-two" />
        <div className="login-story-content">
          <BrandMark name={settings.displayName} logoUrl={settings.logoUrl} light />
          <div className="story-copy">
            <p className="eyebrow light">EL CARNET DE TU MASCOTA, SIEMPRE CONTIGO</p>
            <h1>Cuidar es más<br />simple juntos.</h1>
            <p>Toda la información de tu mascota, a mano cuando la necesitas. Ingresa para administrar Hachikapp.</p>
            <ul>
              <li><CheckCircle2 size={18} /> Sesiones JWT con renovación automática</li>
              <li><CheckCircle2 size={18} /> Permisos granulares por recurso</li>
              <li><CheckCircle2 size={18} /> Integración opcional con Google</li>
            </ul>
          </div>
          <p className="story-footer">Inspirados en Hachikō: cuidar, acompañar y ayudar a volver a casa.</p>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="mobile-brand">
            <BrandMark name={settings.displayName} logoUrl={settings.logoUrl} />
          </div>
          <div className="login-heading">
            <span className="login-icon"><LockKeyhole size={22} /></span>
            <h2>Bienvenido de vuelta</h2>
            <p>Ingresa tus credenciales para continuar.</p>
          </div>

          {error && <div className="form-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} className="stack-form">
            <label>
              Correo electrónico
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@correo.com" autoComplete="email" required autoFocus />
            </label>
            <label>
              Contraseña
              <span className="password-field">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Ingresa tu contraseña" autoComplete="current-password" required />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            <button className="button primary button-large" type="submit" disabled={submitting}>
              {submitting ? <span className="spinner spinner-light" /> : <>Iniciar sesión <ArrowRight size={18} /></>}
            </button>
          </form>

          <div className="divider"><span>o continúa con</span></div>
          <button className="button secondary button-large google-button" type="button" onClick={googleLogin}>
            <span className="google-g">G</span> Google
          </button>
          <p className="login-note">El acceso está reservado a usuarios autorizados.</p>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
