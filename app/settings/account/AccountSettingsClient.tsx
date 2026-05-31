'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AccountSettingsClient() {
  const { user } = useAuth();
  
  const [email, setEmail] = useState(user?.email || '');
  
  const [profileName, setProfileName] = useState('');
  const [profileHandle, setProfileHandle] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileBirthDate, setProfileBirthDate] = useState('');
  const [profileGender, setProfileGender] = useState('');
  
  const [profileLoading, setProfileLoading] = useState(false);
  
  const [emailLoading, setEmailLoading] = useState(false);
  
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (user) {
      supabase.from('users').select('name, handle, bio, birth_date, gender').eq('id', user.id).single().then(({ data }) => {
        if (data) {
          setProfileName(data.name || '');
          setProfileHandle(data.handle || '');
          setProfileBio(data.bio || '');
          setProfileBirthDate(data.birth_date || '');
          setProfileGender(data.gender || '');
        }
      });
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileLoading(true);
    setMessage(null);

    const { error } = await supabase.from('users').update({
      name: profileName,
      handle: profileHandle,
      bio: profileBio,
      birth_date: profileBirthDate || null,
      gender: profileGender || null
    }).eq('id', user.id);

    setProfileLoading(false);
    if (error) {
      setMessage({ type: 'error', text: 'Erro ao atualizar perfil: ' + error.message });
    } else {
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso.' });
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || email === user?.email) return;

    setEmailLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: `${window.location.origin}/settings/account` }
    );

    setEmailLoading(false);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Um email de confirmação foi enviado para ambos os endereços.' });
    }
  };


  const handleExportData = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/settings/account/export');
      if (!res.ok) throw new Error('Não foi possível exportar os dados');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `literaconnect-export-${user.id}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Houve um erro no download. Tente novamente.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('ATENÇÃO: Essa ação é irreversível. Todas as suas informações, publicações e dados salvos serão removidos permanentemente. Tem certeza absoluta que quer excluir a sua conta?')) {
      return;
    }

    try {
      const res = await fetch('/api/settings/account/delete', { method: 'DELETE' });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir a conta');

      alert(data.message);
      // Fazer sign-out forçado e limpeza do store
      await supabase.auth.signOut();
      window.location.href = '/';
      
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    }
  };

  return (
    <div className="space-y-8 max-w-xl pb-24 md:pb-8">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">Conta</h2>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <p className="text-[var(--text-main)]/60">Atualize seus dados pessoais e credenciais.</p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
            className="px-6 py-2 border border-[var(--border)] text-[var(--text-main)] rounded-full font-bold hover:bg-[var(--border)]/50 transition-all text-sm"
          >
            Sair da Conta
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
          {message.text}
        </div>
      )}

      {/* Dados do Perfil */}
      <form onSubmit={handleUpdateProfile} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-main)]">Dados do Perfil</h3>
          <p className="text-sm text-[var(--text-main)]/60 mb-4">Essas informações são públicas na sua página de perfil.</p>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[var(--text-main)]/80 mb-1 block">Nome de Exibição</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-main)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-2 transition-all"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-main)]/80 mb-1 block">Nome de Usuário (@handle)</label>
              <input
                type="text"
                value={profileHandle}
                onChange={(e) => setProfileHandle(e.target.value)}
                className="w-full bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-main)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-2 transition-all"
                required
              />
            </div>
            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="text-sm font-medium text-[var(--text-main)]/80 mb-1 block">Data de Nascimento</label>
                <input
                  type="date"
                  value={profileBirthDate}
                  onChange={(e) => setProfileBirthDate(e.target.value)}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-main)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-2 transition-all"
                />
              </div>
              <div className="w-1/2">
                <label className="text-sm font-medium text-[var(--text-main)]/80 mb-1 block">Gênero</label>
                <select
                  value={profileGender}
                  onChange={(e) => setProfileGender(e.target.value)}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-main)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-2 transition-all"
                >
                  <option value="" disabled>Selecione...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-main)]/80 mb-1 block">Bio</label>
              <textarea
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
                className="w-full bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-main)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-2 transition-all min-h-[100px] resize-y"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={profileLoading}
            className="px-6 py-2 bg-brand-2 text-white rounded-full font-bold hover:bg-brand-2/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {profileLoading && <Loader2 className="w-5 h-5 animate-spin" />}
            Salvar Perfil
          </button>
        </div>
      </form>

      {/* Trocar E-mail */}
      <form onSubmit={handleUpdateEmail} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-main)]">Endereço de E-mail</h3>
          <p className="text-sm text-[var(--text-main)]/60 mb-4">Você precisará confirmar o novo e-mail.</p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-main)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-2 transition-all"
            required
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={emailLoading || email === user?.email}
            className="px-6 py-2 bg-brand-2 text-white rounded-full font-bold hover:bg-brand-2/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {emailLoading && <Loader2 className="w-5 h-5 animate-spin" />}
            Atualizar E-mail
          </button>
        </div>
      </form>


      {/* Danger Zone */}
      <div className="border border-red-500/20 rounded-2xl p-6 bg-red-500/5">
        <h3 className="text-lg font-semibold text-red-500 mb-2">Zona de Perigo</h3>
        <p className="text-sm text-[var(--text-main)]/60 mb-6">
          Ações permanentes na sua conta. Proceda com cautela.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={handleExportData}
            className="px-6 py-2 border border-[var(--border)] text-[var(--text-main)] rounded-full font-bold hover:bg-[var(--border)]/50 transition-all text-sm"
          >
            Exportar Dados (JSON)
          </button>
          <button 
            onClick={handleDeleteAccount}
            className="px-6 py-2 bg-red-500 text-white rounded-full font-bold hover:bg-red-600 transition-all text-sm"
          >
            Excluir Conta
          </button>
        </div>
      </div>
    </div>
  );
}
