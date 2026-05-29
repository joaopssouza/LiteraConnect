'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { BookOpen, Loader2 } from 'lucide-react';

export default function LoginClient() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              handle: handle.toLowerCase().replace(/[^a-z0-9_]/g, ''),
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
      setLoading(false);
    }
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
          {isLogin ? 'Bem-vindo de volta' : 'Comece sua jornada'}
        </h2>
        <p className="mt-3 text-center text-sm text-[var(--text-main)]/50">
          {isLogin ? 'Não tem uma conta? ' : 'Já faz parte da rede? '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="font-bold text-brand-2 hover:underline transition-all"
          >
            {isLogin ? 'Crie uma agora' : 'Faça login'}
          </button>
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[var(--surface)] py-10 px-6 shadow-2xl sm:rounded-3xl sm:px-12 border border-[var(--border)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-brand-2 opacity-50" />
          
          <form className="space-y-6" onSubmit={handleAuth}>
            {!isLogin && (
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

            <div>
              <label className="block text-xs font-bold text-brand-2 uppercase tracking-widest ml-1">Senha</label>
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

            {error && (
              <div className="text-red-500 text-xs bg-red-500/10 p-4 rounded-xl border border-red-500/20 font-medium">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center items-center gap-2 rounded-xl bg-brand-2 px-4 py-4 text-sm font-black text-white shadow-lg shadow-brand-2/20 hover:opacity-90 focus:outline-none transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <span>{isLogin ? 'Entrar na plataforma' : 'Criar minha conta'}</span>
                )}
              </button>
            </div>
          </form>
        </div>
        
        <p className="mt-8 text-center text-[10px] text-[var(--text-main)]/30 uppercase tracking-widest font-bold">
          LiteraConnect &copy; 2026 • Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
