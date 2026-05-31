'use client';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useEffect, useState, useCallback } from 'react';
import {
  Loader2,
  MonitorSmartphone,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  QrCode,
  Key,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

// ────────────────────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────────────────────
interface MfaFactor {
  id: string;
  status: 'verified' | 'unverified';
  friendly_name?: string;
}

interface MfaEnrollData {
  id: string;
  totp: { qr_code: string; secret: string };
}

// ────────────────────────────────────────────────────────────────────────────
// Componente Principal
// ────────────────────────────────────────────────────────────────────────────
export default function SecurityClient() {
  const { user } = useAuth();

  // Sessões
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Senha
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // 2FA
  const [mfaFactors, setMfaFactors] = useState<MfaFactor[]>([]);
  const [hasMfa, setHasMfa] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [enrollData, setEnrollData] = useState<MfaEnrollData | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  // ── Carregar sessões ──────────────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/security/sessions');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {
      toast.error('Erro ao listar sessões ativas.');
    }
  }, []);

  // ── Carregar fatores MFA ──────────────────────────────────────────────────
  const loadMfaFactors = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/mfa/verify');
      if (!res.ok) return;
      const data = await res.json();
      setMfaFactors(data.factors || []);
      setHasMfa(data.hasMfa || false);
    } catch {
      // Silencioso — MFA pode não estar configurado
    }
  }, []);

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([loadSessions(), loadMfaFactors()]).finally(() => setLoading(false));
    }
  }, [user, loadSessions, loadMfaFactors]);

  // ── Alterar senha ─────────────────────────────────────────────────────────
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return toast.error('As senhas não coincidem.');
    if (newPassword.length < 6) return toast.error('A senha deve ter pelo menos 6 caracteres.');

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Senha atualizada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar senha.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // ── Encerrar outras sessões ───────────────────────────────────────────────
  const handleSignOutOthers = async () => {
    if (!confirm('Tem certeza que deseja desconectar todos os outros dispositivos?')) return;
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      if (error) throw error;
      toast.success('Todos os outros dispositivos foram desconectados.');
      await loadSessions();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao realizar logoff nos outros dispositivos.');
    } finally {
      setIsSigningOut(false);
    }
  };

  // ── MFA: Iniciar Enroll ───────────────────────────────────────────────────
  const handleStartEnroll = async () => {
    setMfaLoading(true);
    try {
      const res = await fetch('/api/settings/mfa/enroll', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEnrollData(data);
      setShowEnrollModal(true);
      setVerifyCode('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar configuração do 2FA.');
    } finally {
      setMfaLoading(false);
    }
  };

  // ── MFA: Verificar Código e Ativar ────────────────────────────────────────
  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollData || verifyCode.length !== 6) {
      return toast.error('Digite o código de 6 dígitos do seu aplicativo autenticador.');
    }
    setIsVerifying(true);
    try {
      const res = await fetch('/api/settings/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorId: enrollData.id, code: verifyCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Autenticação de dois fatores ativada com sucesso! 🔐');
      setShowEnrollModal(false);
      setEnrollData(null);
      await loadMfaFactors();
    } catch (err: any) {
      toast.error(err.message || 'Código inválido. Verifique no seu app autenticador.');
    } finally {
      setIsVerifying(false);
    }
  };

  // ── MFA: Remover ─────────────────────────────────────────────────────────
  const handleRemoveMfa = async (factorId: string) => {
    if (!confirm('Tem certeza que deseja remover o 2FA? Sua conta ficará menos segura.')) return;
    setMfaLoading(true);
    try {
      const res = await fetch('/api/settings/mfa/verify', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('2FA removido com sucesso.');
      await loadMfaFactors();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover 2FA.');
    } finally {
      setMfaLoading(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getDeviceName = (userAgent: string) => {
    if (!userAgent) return 'Dispositivo Desconhecido';
    let device = 'Desktop';
    let browser = 'Navegador';
    if (/Windows/.test(userAgent)) device = 'Windows';
    else if (/Mac OS/.test(userAgent)) device = 'macOS';
    else if (/Linux/.test(userAgent)) device = 'Linux';
    else if (/Android/.test(userAgent)) device = 'Android';
    else if (/iPhone|iPad/.test(userAgent)) device = 'iOS';
    if (/Chrome/.test(userAgent) && !/Edg/.test(userAgent)) browser = 'Chrome';
    else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) browser = 'Safari';
    else if (/Firefox/.test(userAgent)) browser = 'Firefox';
    else if (/Edg/.test(userAgent)) browser = 'Edge';
    return `${device} • ${browser}`;
  };

  if (loading) {
    return (
      <div className="space-y-8 max-w-xl animate-pulse">
        <div className="h-8 bg-[var(--border)] rounded w-1/3 mb-2" />
        <div className="h-4 bg-[var(--border)] rounded w-2/3" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">Segurança</h2>
        <p className="text-[var(--text-main)]/60">Gerencie sessões e o acesso à sua conta.</p>
      </div>

      {/* ── Sessões Ativas ─────────────────────────────────────────────────── */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-main)] mb-1">Sessões Ativas</h3>
          <p className="text-sm text-[var(--text-main)]/60 mb-6">Dispositivos logados com a sua conta.</p>

          <div className="space-y-3">
            {sessions.map((session, idx) => (
              <div
                key={session.id}
                className="border border-[var(--border)] rounded-xl p-4 bg-[var(--bg-main)] flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
                    <MonitorSmartphone size={20} className="text-[var(--text-main)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-main)] text-sm flex items-center gap-2">
                      {getDeviceName(session.user_agent)}
                      {idx === 0 && (
                        <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                          Atual
                        </span>
                      )}
                    </p>
                    <div className="text-xs text-[var(--text-main)]/50 mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span>IP: {session.ip || 'Desconhecido'}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> Último acesso:{' '}
                        {new Date(session.updated_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {sessions.length === 0 && (
              <div className="p-4 text-center text-sm text-[var(--text-main)]/40">
                Nenhuma sessão encontrada.
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-[var(--border)]">
            <button
              onClick={handleSignOutOthers}
              disabled={isSigningOut || sessions.length <= 1}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-colors w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSigningOut ? <Loader2 size={16} className="animate-spin" /> : <ShieldAlert size={16} />}
              Encerrar outras sessões
            </button>
            <p className="text-xs text-[var(--text-main)]/40 text-center mt-2">
              Isso desconectará sua conta de todos os dispositivos, exceto este.
            </p>
          </div>
        </div>

        <hr className="border-[var(--border)]" />

        {/* ── 2FA / MFA ─────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-[var(--text-main)]">
              Autenticação de Dois Fatores (2FA)
            </h3>
            {hasMfa ? (
              <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 size={10} /> Ativo
              </span>
            ) : (
              <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                Inativo
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text-main)]/60 mb-6">
            Adicione uma camada extra de segurança usando um aplicativo autenticador (Google Authenticator, Authy, etc).
          </p>

          {hasMfa ? (
            <div className="space-y-3">
              {mfaFactors
                .filter((f) => f.status === 'verified')
                .map((factor) => (
                  <div
                    key={factor.id}
                    className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck size={20} className="text-emerald-500 shrink-0" />
                      <div>
                        <p className="font-medium text-[var(--text-main)] text-sm">
                          Aplicativo Autenticador
                        </p>
                        <p className="text-xs text-[var(--text-main)]/50">
                          TOTP • Ativado
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveMfa(factor.id)}
                      disabled={mfaLoading}
                      className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {mfaLoading ? <Loader2 size={12} className="animate-spin" /> : <ShieldX size={12} />}
                      Remover
                    </button>
                  </div>
                ))}
            </div>
          ) : (
            <button
              onClick={handleStartEnroll}
              disabled={mfaLoading}
              className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 bg-brand-2 text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mfaLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <QrCode size={16} />
              )}
              Configurar 2FA
            </button>
          )}
        </div>

        <hr className="border-[var(--border)]" />

        {/* ── Alterar Senha ─────────────────────────────────────────────────── */}
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-main)] mb-1">Alterar Senha</h3>
          <p className="text-sm text-[var(--text-main)]/60 mb-6">Defina uma nova senha para sua conta.</p>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-2 uppercase tracking-wider ml-1">
                Nova Senha
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                className="block w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm bg-[var(--bg-main)] text-[var(--text-main)] outline-none focus:ring-2 focus:ring-brand-2/30 focus:border-brand-2 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-2 uppercase tracking-wider ml-1">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                autoComplete="new-password"
                className="block w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm bg-[var(--bg-main)] text-[var(--text-main)] outline-none focus:ring-2 focus:ring-brand-2/30 focus:border-brand-2 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="flex items-center gap-2 text-sm font-bold px-6 py-2.5 bg-brand-2 text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdatingPassword ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Atualizando...
                </>
              ) : (
                'Salvar nova senha'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ── Modal de Enroll 2FA ──────────────────────────────────────────────── */}
      {showEnrollModal && enrollData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="w-14 h-14 bg-brand-2/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-7 h-7 text-brand-2" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-main)]">Configurar 2FA</h3>
              <p className="text-sm text-[var(--text-main)]/60 mt-1">
                Escaneie o QR Code com seu app autenticador e insira o código gerado.
              </p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white p-3 rounded-2xl shadow-sm">
                {/* QR Code como imagem do data URL retornado pelo Supabase */}
                <img
                  src={enrollData.totp.qr_code}
                  alt="QR Code 2FA"
                  width={180}
                  height={180}
                  className="rounded-lg"
                />
              </div>
            </div>

            {/* Chave manual */}
            <div className="bg-[var(--bg-main)] border border-[var(--border)] rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold text-[var(--text-main)]/40 uppercase tracking-widest mb-1.5">
                Ou insira a chave manualmente
              </p>
              <div className="flex items-center gap-2 justify-center">
                <Key size={12} className="text-brand-2 shrink-0" />
                <code className="text-xs font-mono text-[var(--text-main)] break-all select-all">
                  {enrollData.totp.secret}
                </code>
              </div>
            </div>

            {/* Formulário de verificação */}
            <form onSubmit={handleVerifyMfa} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-2 uppercase tracking-wider ml-1">
                  Código de Verificação
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="block w-full text-center text-2xl font-mono tracking-[0.5em] rounded-xl border border-[var(--border)] px-4 py-3 bg-[var(--bg-main)] text-[var(--text-main)] outline-none focus:ring-2 focus:ring-brand-2/30 focus:border-brand-2 transition-all"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowEnrollModal(false); setEnrollData(null); }}
                  className="flex-1 py-2.5 text-sm font-bold border border-[var(--border)] text-[var(--text-main)]/60 hover:text-[var(--text-main)] rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || verifyCode.length !== 6}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold bg-brand-2 text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {isVerifying ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    'Ativar 2FA'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
