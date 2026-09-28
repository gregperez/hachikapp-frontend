"use client";

import { Check, Circle, Info } from "lucide-react";

const MIN_PASSWORD_LENGTH = 15;
const MAX_PASSWORD_LENGTH = 128;

function normalize(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase();
}

function contextualTokens(name: string, email: string) {
  return `${name} ${email}`
    .normalize("NFKC")
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => Array.from(token).length >= 3);
}

export function visiblePasswordChecks(password: string, name = "", email = "") {
  const length = Array.from(password).length;
  const normalizedPassword = normalize(password);
  const includesContext = contextualTokens(name, email).some((token) => normalizedPassword.includes(token));

  return {
    validLength: length >= MIN_PASSWORD_LENGTH && length <= MAX_PASSWORD_LENGTH,
    excludesPersonalData: !includesContext,
    valid: length >= MIN_PASSWORD_LENGTH && length <= MAX_PASSWORD_LENGTH && !includesContext,
    length,
  };
}

export function PasswordPolicy({ password, name, email }: { password: string; name?: string; email?: string }) {
  const checks = visiblePasswordChecks(password, name, email);
  const hasValue = password.length > 0;

  return (
    <div className="password-policy" aria-live="polite">
      <strong>La contraseña debe cumplir lo siguiente:</strong>
      <ul>
        <PolicyItem met={checks.validLength} active={hasValue}>
          Entre {MIN_PASSWORD_LENGTH} y {MAX_PASSWORD_LENGTH} caracteres
          {hasValue && <small> ({checks.length})</small>}
        </PolicyItem>
        <PolicyItem met={checks.excludesPersonalData} active={hasValue}>
          No incluir el nombre ni partes del correo electrónico
        </PolicyItem>
        <li className="policy-info"><Info size={14} /> No ser una contraseña común incluida en la lista de bloqueo</li>
      </ul>
      <p>Puedes usar espacios y cualquier combinación de letras, números o símbolos.</p>
    </div>
  );
}

function PolicyItem({ met, active, children }: { met: boolean; active: boolean; children: React.ReactNode }) {
  return (
    <li className={active ? (met ? "policy-met" : "policy-unmet") : ""}>
      {active && met ? <Check size={14} /> : <Circle size={11} />}
      <span>{children}</span>
    </li>
  );
}
