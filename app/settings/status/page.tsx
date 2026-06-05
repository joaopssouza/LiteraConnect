'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, CheckCircle2, UserX, UserCheck, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface AccountStatus {
  isGoodStanding: boolean;
  featuresActive: string;
  removedContents: number;
  activeReports: number;
}

export default function StatusContaPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/settings/status');
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch (error) {
        console.error('Erro ao carregar status:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-[var(--border-main)] flex flex-col items-center justify-center py-10 bg-[var(--surface)] relative overflow-hidden">
        {user?.user_metadata?.avatar_url ? (
            <Image
              src={user.user_metadata.avatar_url}
              alt="Avatar"
              width={80}
              height={80}
              className="rounded-full object-cover border-4 border-black/5 dark:border-white/5 relative z-10"
            />
        ) : (
          <div className="w-20 h-20 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center relative z-10">
            <span className="text-2xl font-bold text-[var(--text-secondary)]">
              {user?.user_metadata?.full_name?.charAt(0) || user?.user_metadata?.handle?.charAt(0) || '?'}
            </span>
          </div>
        )}
        <h1 className="text-xl font-bold mt-4 relative z-10 text-[var(--text-main)]">{user?.user_metadata?.handle || 'Seu Perfil'}</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1 relative z-10">Status da conta</p>
      </div>
      
      <div className="p-6 flex-1 flex flex-col gap-6">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-[var(--text-secondary)]">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : !status ? (
          <div className="text-center py-12 text-[var(--text-secondary)]">
            Não foi possível carregar o status no momento.
          </div>
        ) : (
          <>
            {status.isGoodStanding ? (
              <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900 rounded-xl p-5 flex gap-4 items-start">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-green-900 dark:text-green-400">Sua conta está em boa situação</h3>
                  <p className="text-sm text-green-700 dark:text-green-600 mt-1">
                    Obrigado por seguir nossas Diretrizes da Comunidade. Você não tem nenhuma restrição no momento.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 rounded-xl p-5 flex gap-4 items-start">
                <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-900 dark:text-red-400">Sua conta possui restrições</h3>
                  <p className="text-sm text-red-700 dark:text-red-600 mt-1">
                    Detectamos violações das Diretrizes da Comunidade em sua conta. Alguns recursos podem estar limitados.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <h2 className="font-bold text-[var(--text-main)] mb-2 mt-2">O que isso significa</h2>
              
              <div className="flex items-center justify-between p-4 border border-[var(--border-main)] rounded-xl bg-[var(--surface)]">
                <div className="flex items-center gap-3">
                  <UserCheck className="w-5 h-5 text-[var(--text-secondary)]" />
                  <span className="text-sm font-medium text-[var(--text-main)]">Recursos que você pode usar</span>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${status.featuresActive === 'Todos ativos' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {status.featuresActive}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 border border-[var(--border-main)] rounded-xl bg-[var(--surface)]">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-[var(--text-secondary)]" />
                  <span className="text-sm font-medium text-[var(--text-main)]">Conteúdos removidos</span>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${status.removedContents === 0 ? 'bg-black/5 dark:bg-white/5 text-[var(--text-secondary)]' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {status.removedContents} itens
                </span>
              </div>

              <div className="flex items-center justify-between p-4 border border-[var(--border-main)] rounded-xl bg-[var(--surface)]">
                <div className="flex items-center gap-3">
                  <UserX className="w-5 h-5 text-[var(--text-secondary)]" />
                  <span className="text-sm font-medium text-[var(--text-main)]">Denúncias ativas</span>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${status.activeReports === 0 ? 'bg-black/5 dark:bg-white/5 text-[var(--text-secondary)]' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {status.activeReports === 0 ? 'Nenhuma' : `${status.activeReports} abertas`}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
