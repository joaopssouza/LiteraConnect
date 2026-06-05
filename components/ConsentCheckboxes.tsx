"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * ConsentCheckboxes — Checkboxes de consentimento para formulário de cadastro
 *
 * Como usar (no seu formulário de signup):
 *
 *   const [consents, setConsents] = useState<ConsentState>({ terms: false, privacy: false, age: false });
 *   const allConsented = consents.terms && consents.privacy && consents.age;
 *
 *   <ConsentCheckboxes value={consents} onChange={setConsents} />
 *   <button disabled={!allConsented}>Criar conta</button>
 *
 * O objeto ConsentState deve ser salvo no banco junto ao registro do usuário
 * (ver ConsentRecord abaixo para a estrutura recomendada)
 */

export interface ConsentState {
  terms: boolean;        // Aceite dos Termos de Uso
  privacy: boolean;      // Aceite da Política de Privacidade
  age: boolean;          // Confirmação de maioridade (18+)
  marketing?: boolean;   // Opcional: notificações de novidades (pode ser false)
}

interface ConsentCheckboxesProps {
  value: ConsentState;
  onChange: (state: ConsentState) => void;
  disabled?: boolean;
}

export default function ConsentCheckboxes({
  value,
  onChange,
  disabled = false,
}: ConsentCheckboxesProps) {
  const toggle = (key: keyof ConsentState) => {
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <fieldset className="space-y-3 mt-4" disabled={disabled}>
      <legend className="sr-only">Termos e consentimentos obrigatórios</legend>

      {/* Obrigatório: Termos de Uso */}
      <ConsentItem
        id="consent-terms"
        checked={value.terms}
        onChange={() => toggle("terms")}
        required
        label={
          <>
            Li e concordo com os{" "}
            <Link
              href="/termos"
              target="_blank"
              className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
            >
              Termos de Uso
            </Link>
          </>
        }
      />

      {/* Obrigatório: Política de Privacidade */}
      <ConsentItem
        id="consent-privacy"
        checked={value.privacy}
        onChange={() => toggle("privacy")}
        required
        label={
          <>
            Li e concordo com a{" "}
            <Link
              href="/privacidade"
              target="_blank"
              className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
            >
              Política de Privacidade
            </Link>{" "}
            e autorizo o tratamento dos meus dados pessoais para os fins
            descritos, conforme a Lei nº 13.709/2018 (LGPD)
          </>
        }
      />

      {/* Obrigatório: Confirmação de maioridade */}
      <ConsentItem
        id="consent-age"
        checked={value.age}
        onChange={() => toggle("age")}
        required
        label="Declaro ter 18 anos ou mais e que as informações fornecidas são verdadeiras"
      />

      {/* Opcional: Marketing */}
      <ConsentItem
        id="consent-marketing"
        checked={value.marketing ?? false}
        onChange={() => toggle("marketing")}
        required={false}
        optional
        label="Aceito receber novidades, artigos em destaque e atualizações da plataforma por e-mail (opcional)"
      />

      {/* Nota LGPD */}
      <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed pt-1">
        Seus dados são armazenados exclusivamente em servidores próprios e nunca
        compartilhados com terceiros para fins comerciais. Você pode revogar
        este consentimento a qualquer momento nas configurações da conta.
      </p>
    </fieldset>
  );
}

/* ─── Item de checkbox individual ─── */

interface ConsentItemProps {
  id: string;
  checked: boolean;
  onChange: () => void;
  label: React.ReactNode;
  required?: boolean;
  optional?: boolean;
}

function ConsentItem({
  id,
  checked,
  onChange,
  label,
  required = false,
  optional = false,
}: ConsentItemProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-3 cursor-pointer group select-none"
    >
      <div className="relative flex-shrink-0 mt-0.5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          required={required}
          aria-required={required}
          className="sr-only peer"
        />
        <div
          className={`w-4.5 h-4.5 rounded border transition-all duration-150
            ${checked
              ? "bg-amber-500 border-amber-500"
              : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 group-hover:border-amber-400"
            }
            peer-focus-visible:ring-2 peer-focus-visible:ring-amber-400 peer-focus-visible:ring-offset-2`}
          aria-hidden="true"
        >
          {checked && (
            <svg
              className="w-3 h-3 m-auto mt-0.5 text-white"
              fill="none"
              viewBox="0 0 12 9"
              aria-hidden="true"
            >
              <path
                d="M1 4.5L4.5 8L11 1"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>

      <span className="text-sm text-zinc-700 dark:text-zinc-300 leading-snug">
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="obrigatório">*</span>
        )}
        {optional && (
          <span className="text-zinc-400 dark:text-zinc-500 ml-1 text-xs">(opcional)</span>
        )}
      </span>
    </label>
  );
}


/**
 * ConsentRecord — Estrutura recomendada para salvar no banco de dados
 * junto ao registro do usuário (tabela users ou user_consents no PostgreSQL)
 *
 * SQL sugerido (adicionar à tabela users ou criar tabela separada):
 *
 * ALTER TABLE users ADD COLUMN IF NOT EXISTS
 *   consent_terms_accepted_at TIMESTAMPTZ,
 *   consent_privacy_accepted_at TIMESTAMPTZ,
 *   consent_age_declared_at TIMESTAMPTZ,
 *   consent_marketing_accepted_at TIMESTAMPTZ,
 *   consent_ip TEXT,
 *   consent_version TEXT DEFAULT '1.0';
 */
export interface ConsentRecord {
  userId: string;
  termsAcceptedAt: string;      // ISO 8601
  privacyAcceptedAt: string;    // ISO 8601
  ageConfirmedAt: string;       // ISO 8601
  marketingAcceptedAt?: string; // ISO 8601 | null
  ipAddress: string;            // IP coletado no servidor (Next.js API Route)
  userAgent: string;            // User-Agent do navegador
  consentVersion: string;       // "1.0" — incrementar ao atualizar termos
}

/**
 * Utilitário para construir o registro de consentimento a partir dos checkboxes.
 * Chame no server action ou API route de cadastro.
 *
 * Exemplo de uso no Server Action (app/actions/auth.ts):
 *
 *   import { headers } from "next/headers";
 *
 *   export async function registerUser(formData: FormData) {
 *     const ip = headers().get("x-forwarded-for") ?? "unknown";
 *     const ua = headers().get("user-agent") ?? "unknown";
 *
 *     const consentRecord = buildConsentRecord(userId, ip, ua);
 *
 *     await supabase.from("user_consents").insert(consentRecord);
 *   }
 */
export function buildConsentRecord(
  userId: string,
  ipAddress: string,
  userAgent: string,
  marketingAccepted = false,
  version = "1.0"
): ConsentRecord {
  const now = new Date().toISOString();
  return {
    userId,
    termsAcceptedAt: now,
    privacyAcceptedAt: now,
    ageConfirmedAt: now,
    marketingAcceptedAt: marketingAccepted ? now : undefined,
    ipAddress,
    userAgent,
    consentVersion: version,
  };
}
