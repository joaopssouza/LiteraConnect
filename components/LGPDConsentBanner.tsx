"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/**
 * LGPDConsentBanner — Componente de Consentimento LGPD
 *
 * Como usar:
 * 1. Adicione <LGPDConsentBanner /> no seu layout raiz (app/layout.tsx)
 * 2. O consentimento é persistido via localStorage com a chave "lgpd_consent_v1"
 * 3. Para verificar o consentimento em outro lugar: localStorage.getItem("lgpd_consent_v1")
 *    → "accepted" | "rejected" | null
 */

type ConsentStatus = "accepted" | "rejected" | null;

export default function LGPDConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [status, setStatus] = useState<ConsentStatus>(null);

  useEffect(() => {
    const stored = localStorage.getItem("lgpd_consent_v1") as ConsentStatus;
    if (!stored) {
      // Pequeno delay para não bloquear o carregamento inicial da página
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
    setStatus(stored);
  }, []);

  const handleAccept = () => {
    localStorage.setItem("lgpd_consent_v1", "accepted");
    localStorage.setItem("lgpd_consent_date", new Date().toISOString());
    setStatus("accepted");
    setVisible(false);
    // Aqui você pode disparar eventos de analytics ou outros scripts
    // que dependem do consentimento do usuário
    window.dispatchEvent(new CustomEvent("lgpd:accepted"));
  };

  const handleReject = () => {
    localStorage.setItem("lgpd_consent_v1", "rejected");
    localStorage.setItem("lgpd_consent_date", new Date().toISOString());
    setStatus("rejected");
    setVisible(false);
    window.dispatchEvent(new CustomEvent("lgpd:rejected"));
  };

  if (!visible) return null;

  return (
    <>
      {/* Overlay sutil para chamar atenção */}
      <div
        className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]"
        aria-hidden="true"
      />

      {/* Banner principal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lgpd-title"
        aria-describedby="lgpd-description"
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-50
                   bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700
                   p-6 animate-in slide-in-from-bottom-4 duration-300"
      >
        {/* Ícone e título */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30
                          flex items-center justify-center text-lg">
            🔒
          </div>
          <div>
            <h2
              id="lgpd-title"
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
            >
              Privacidade e Proteção de Dados
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Conforme a Lei nº 13.709/2018 (LGPD)
            </p>
          </div>
        </div>

        {/* Texto principal */}
        <p
          id="lgpd-description"
          className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed"
        >
          Utilizamos <strong className="text-zinc-800 dark:text-zinc-100">apenas cookies essenciais</strong> para
          autenticação e funcionamento da plataforma. Nenhum dado é
          compartilhado com terceiros ou utilizado para publicidade.
        </p>

        {/* Detalhes expansíveis */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-amber-600 dark:text-amber-400 hover:underline mt-2 flex items-center gap-1"
          aria-expanded={showDetails}
        >
          {showDetails ? "▲ Ocultar detalhes" : "▼ Ver quais cookies usamos"}
        </button>

        {showDetails && (
          <div className="mt-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
            <div>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">sb-access-token</span>
              <br />
              Cookie de sessão autenticada — necessário para login. Duração: 1h.
            </div>
            <div>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">sb-refresh-token</span>
              <br />
              Renovação automática de sessão. Duração: 30 dias.
            </div>
            <p className="text-zinc-500 dark:text-zinc-500 italic">
              Sem Google Analytics, Meta Pixel ou qualquer rastreador externo.
            </p>
          </div>
        )}

        {/* Links para documentos */}
        <div className="flex gap-3 mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          <Link
            href="/privacidade"
            className="hover:text-amber-600 dark:hover:text-amber-400 hover:underline"
          >
            Política de Privacidade
          </Link>
          <span>·</span>
          <Link
            href="/termos"
            className="hover:text-amber-600 dark:hover:text-amber-400 hover:underline"
          >
            Termos de Uso
          </Link>
        </div>

        {/* Botões de ação */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleReject}
            className="flex-1 px-4 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600
                       text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800
                       transition-colors duration-150 font-medium"
          >
            Recusar opcionais
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 px-4 py-2 text-sm rounded-lg bg-amber-500 hover:bg-amber-600
                       text-white font-semibold transition-colors duration-150 shadow-sm"
          >
            Aceitar e continuar
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * Hook utilitário para verificar o status do consentimento em outros componentes
 *
 * Uso:
 *   const { consentStatus, hasConsented } = useLGPDConsent();
 */
export function useLGPDConsent() {
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>(null);

  useEffect(() => {
    const stored = localStorage.getItem("lgpd_consent_v1") as ConsentStatus;
    setConsentStatus(stored);

    const handleAccepted = () => setConsentStatus("accepted");
    const handleRejected = () => setConsentStatus("rejected");

    window.addEventListener("lgpd:accepted", handleAccepted);
    window.addEventListener("lgpd:rejected", handleRejected);

    return () => {
      window.removeEventListener("lgpd:accepted", handleAccepted);
      window.removeEventListener("lgpd:rejected", handleRejected);
    };
  }, []);

  return {
    consentStatus,
    hasConsented: consentStatus === "accepted",
    hasRejected: consentStatus === "rejected",
    isPending: consentStatus === null,
  };
}
