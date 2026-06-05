'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { BookOpen, Loader2, ArrowLeft } from 'lucide-react';
import ConsentCheckboxes, { ConsentState } from '@/components/ConsentCheckboxes';

// Ícone SVG do Google (sem dependência externa)
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function LoginClient() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMfaRequired, setIsMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [consents, setConsents] = useState<ConsentState>({ terms: false, privacy: false, age: false, marketing: false });
  const router = useRouter();
  
  const allConsented = consents.terms && consents.privacy && consents.age;
  const isSubmitDisabled = loading || (!isLogin && !isForgotPassword && !allConsented);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      // OTIMIZAÇÃO: Limpar cookies e local storage antigos ANTES de iniciar um novo fluxo OAuth.
      // Isso previne o acúmulo de 'lixo' de identidades que causa o Erro 431 (Headers Too Large) nos WebSockets.
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        await supabase.auth.signOut();
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
            // hd: 'senaimgaluno.com.br', // Temporariamente desativado para testes
          },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Erro ao autenticar com Google.');
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Temporariamente desativado para testes
      // if (!isForgotPassword && !email.endsWith('@senaimgaluno.com.br')) {
      //   throw new Error('Apenas e-mails institucionais (@senaimgaluno.com.br) são permitidos.');
      // }

      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/settings/security`,
        });
        if (error) throw error;
        setMessage('Instruções de recuperação enviadas para o seu e-mail.');
      } else if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Verifica MFA
        const { data: mfaData, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (mfaError) throw mfaError;

        if (mfaData.nextLevel === 'aal2' && mfaData.currentLevel !== 'aal2') {
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const totpFactor = factors?.all.find(f => f.factor_type === 'totp' && f.status === 'verified');
          if (totpFactor) {
            const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
            if (challengeError) throw challengeError;
            
            setFactorId(totpFactor.id);
            setChallengeId(challenge.id);
            setIsMfaRequired(true);
            setLoading(false);
            return;
          }
        }

        router.push('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: {
              full_name: name,
              handle: handle.toLowerCase().replace(/[^a-z0-9_]/g, ''),
              birth_date: birthDate,
              gender: gender,
              consent_terms_accepted_at: consents.terms ? new Date().toISOString() : null,
              consent_privacy_accepted_at: consents.privacy ? new Date().toISOString() : null,
              consent_age_declared_at: consents.age ? new Date().toISOString() : null,
              consent_marketing_accepted_at: consents.marketing ? new Date().toISOString() : null,
              consent_version: '1.0'
            },
          },
        });
        if (error) throw error;
        alert('Cadastro realizado com sucesso! Verifique seu email se necessário.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro na autenticação.');
    } finally {
      if (!isMfaRequired) setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: factorId!,
        challengeId: challengeId!,
        code: mfaCode,
      });
      if (error) throw error;
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Código de verificação inválido.');
    } finally {
      setLoading(false);
    }
  };

  const toggleForgotPassword = () => {
    setIsForgotPassword(!isForgotPassword);
    setError(null);
    setMessage(null);
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setIsForgotPassword(false);
    setError(null);
    setMessage(null);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-brand-2 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-2/20 transform -rotate-6">
            <BookOpen className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-10 text-center text-3xl font-black tracking-tight text-[var(--text-main)]">
          {isForgotPassword 
            ? 'Recuperar senha' 
            : isLogin ? 'Bem-vindo de volta' : 'Comece sua jornada'}
        </h2>
        {!isForgotPassword && (
          <p className="mt-3 text-center text-sm text-[var(--text-main)]/50">
            {isLogin ? 'Não tem uma conta? ' : 'Já faz parte da rede? '}
            <button
              onClick={toggleAuthMode}
              className="font-bold text-brand-2 hover:underline transition-all"
            >
              {isLogin ? 'Crie uma agora' : 'Faça login'}
            </button>
          </p>
        )}
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[var(--surface)] py-10 px-6 shadow-2xl sm:rounded-3xl sm:px-12 border border-[var(--border)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-brand-2 opacity-50" />
          
          {isMfaRequired ? (
            <form className="space-y-6" onSubmit={handleMfaSubmit}>
              <div>
                <label className="block text-xs font-bold text-brand-2 uppercase tracking-widest ml-1 text-center mb-2">
                  Código de Autenticação 2FA
                </label>
                <div className="mt-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="block w-full text-center text-2xl font-mono tracking-[0.5em] rounded-xl border border-[var(--border)] px-4 py-3 bg-[var(--bg-main)] text-[var(--text-main)] outline-none focus:ring-2 focus:ring-brand-2/30 focus:border-brand-2 transition-all"
                  />
                </div>
              </div>
              
              {error && (
                <div className="text-red-500 text-xs bg-red-500/10 p-4 rounded-xl border border-red-500/20 font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || mfaCode.length !== 6}
                className="flex w-full justify-center items-center gap-2 rounded-xl bg-brand-2 px-4 py-4 text-sm font-black text-white shadow-lg shadow-brand-2/20 hover:opacity-90 focus:outline-none transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <span>Confirmar Código</span>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setIsMfaRequired(false);
                  setMfaCode('');
                  supabase.auth.signOut();
                }}
                className="flex w-full justify-center items-center gap-2 text-xs font-bold text-[var(--text-main)]/40 hover:text-[var(--text-main)]/60 transition-all py-2"
              >
                <ArrowLeft className="w-3 h-3" />
                Voltar para o login
              </button>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleAuth}>
            {!isLogin && !isForgotPassword && (
              <>
                <div>
                  <label className="block text-xs font-bold text-brand-2 uppercase tracking-widest ml-1">Nome completo</label>
                  <div className="mt-1.5">
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full appearance-none rounded-xl border border-[var(--border)] px-4 py-3 text-[var(--text-main)] placeholder-[var(--text-main)]/20 shadow-sm focus:ring-2 focus:ring-brand-2/30 focus:border-brand-2 outline-none sm:text-sm bg-[var(--bg-main)] transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-brand-2 uppercase tracking-widest ml-1">Nome de usuário (@handle)</label>
                  <div className="mt-1.5">
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="ex: joao_leitor"
                      className="block w-full appearance-none rounded-xl border border-[var(--border)] px-4 py-3 text-[var(--text-main)] placeholder-[var(--text-main)]/20 shadow-sm focus:ring-2 focus:ring-brand-2/30 focus:border-brand-2 outline-none sm:text-sm bg-[var(--bg-main)] transition-all"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-brand-2 uppercase tracking-widest ml-1">Data de Nascimento</label>
                    <div className="mt-1.5">
                      <input
                        type="date"
                        required
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="block w-full appearance-none rounded-xl border border-[var(--border)] px-4 py-3 text-[var(--text-main)] placeholder-[var(--text-main)]/20 shadow-sm focus:ring-2 focus:ring-brand-2/30 focus:border-brand-2 outline-none sm:text-sm bg-[var(--bg-main)] transition-all"
                      />
                    </div>
                  </div>
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-brand-2 uppercase tracking-widest ml-1">Gênero</label>
                    <div className="mt-1.5">
                      <select
                        required
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="block w-full appearance-none rounded-xl border border-[var(--border)] px-4 py-3 text-[var(--text-main)] shadow-sm focus:ring-2 focus:ring-brand-2/30 focus:border-brand-2 outline-none sm:text-sm bg-[var(--bg-main)] transition-all"
                      >
                        <option value="" disabled>Selecione...</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-brand-2 uppercase tracking-widest ml-1">E-mail</label>
              <div className="mt-1.5">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full appearance-none rounded-xl border border-[var(--border)] px-4 py-3 text-[var(--text-main)] placeholder-[var(--text-main)]/20 shadow-sm focus:ring-2 focus:ring-brand-2/30 focus:border-brand-2 outline-none sm:text-sm bg-[var(--bg-main)] transition-all"
                />
              </div>
            </div>

            {!isForgotPassword && (
              <div>
                <div className="flex items-center justify-between ml-1">
                  <label className="block text-xs font-bold text-brand-2 uppercase tracking-widest">Senha</label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={toggleForgotPassword}
                      className="text-[10px] font-bold text-brand-2/60 hover:text-brand-2 uppercase tracking-tighter transition-all"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="mt-1.5">
                  <input
                    type="password"
                    required
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full appearance-none rounded-xl border border-[var(--border)] px-4 py-3 text-[var(--text-main)] placeholder-[var(--text-main)]/20 shadow-sm focus:ring-2 focus:ring-brand-2/30 focus:border-brand-2 outline-none sm:text-sm bg-[var(--bg-main)] transition-all"
                  />
                </div>
              </div>
            )}

            {!isLogin && !isForgotPassword && (
              <ConsentCheckboxes value={consents} onChange={setConsents} />
            )}

            {error && (
              <div className="text-red-500 text-xs bg-red-500/10 p-4 rounded-xl border border-red-500/20 font-medium">
                {error}
              </div>
            )}

            {message && (
              <div className="text-emerald-500 text-xs bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 font-medium">
                {message}
              </div>
            )}

            <div className="space-y-3">
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="flex w-full justify-center items-center gap-2 rounded-xl bg-brand-2 px-4 py-4 text-sm font-black text-white shadow-lg shadow-brand-2/20 hover:opacity-90 focus:outline-none transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <span>
                    {isForgotPassword 
                      ? 'Enviar link de recuperação' 
                      : isLogin ? 'Entrar na plataforma' : 'Criar minha conta'}
                  </span>
                )}
              </button>

              {isForgotPassword && (
                <button
                  type="button"
                  onClick={toggleForgotPassword}
                  className="flex w-full justify-center items-center gap-2 text-xs font-bold text-[var(--text-main)]/40 hover:text-[var(--text-main)]/60 transition-all py-2"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Voltar para o login
                </button>
              )}

              {/* Separador + OAuth Google */}
              {!isForgotPassword && (
                <>
                  <div className="relative flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-[var(--border)]" />
                    <span className="text-[10px] font-bold text-[var(--text-main)]/30 uppercase tracking-widest shrink-0">ou continue com</span>
                    <div className="flex-1 h-px bg-[var(--border)]" />
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="flex w-full justify-center items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-main)] px-4 py-3.5 text-sm font-bold text-[var(--text-main)] hover:bg-[var(--border)]/30 transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm"
                  >
                    <GoogleIcon />
                    Continuar com Google
                  </button>
                </>
              )}
            </div>
          </form>
          )}
        </div>
        
        <p className="mt-8 text-center text-[10px] text-[var(--text-main)]/30 uppercase tracking-widest font-bold">
          LiteraConnect &copy; 2026 • Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
