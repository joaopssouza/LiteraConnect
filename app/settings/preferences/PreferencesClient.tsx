'use client';

import { ThemeToggle } from '@/components/ThemeToggle';
import { usePreferences } from '@/hooks/usePreferences';
import { PushNotificationToggle } from '@/components/PushNotificationToggle';

export default function PreferencesClient() {
  const { preferences, updatePreferences, mounted } = usePreferences();

  if (!mounted) {
    return (
      <div className="space-y-8 max-w-xl animate-pulse">
        <div className="h-8 bg-[var(--border)] rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-[var(--border)] rounded w-2/3"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">Preferências</h2>
        <p className="text-[var(--text-main)]/60">Customize a sua experiência no LiteraConnect.</p>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-main)]">Tema do Aplicativo</h3>
            <p className="text-sm text-[var(--text-main)]/60">Alterne entre o modo claro, escuro ou siga o sistema.</p>
          </div>
          <ThemeToggle />
        </div>

        <hr className="border-[var(--border)]" />

        <PushNotificationToggle />

        <hr className="border-[var(--border)]" />

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-[var(--text-main)]">Sons do Aplicativo</h3>
            </div>
            <p className="text-sm text-[var(--text-main)]/60">Tocar um som leve quando receber novas mensagens ou interações.</p>
          </div>
          <button
            onClick={() => updatePreferences({ soundsEnabled: !preferences.soundsEnabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              preferences.soundsEnabled ? 'bg-brand-1' : 'bg-[var(--border)]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences.soundsEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <hr className="border-[var(--border)]" />

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-main)]">Tamanho da Fonte (Leitor)</h3>
              <p className="text-sm text-[var(--text-main)]/60">Ajuste o tamanho da fonte padrão nas resenhas.</p>
            </div>
            <span className="font-bold text-[var(--brand-1)]">{preferences.fontSize}px</span>
          </div>
          <input 
            type="range" 
            className="w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-brand-1" 
            min="12" 
            max="24" 
            step="2" 
            value={preferences.fontSize}
            onChange={(e) => updatePreferences({ fontSize: Number(e.target.value) })}
          />
          <div className="flex justify-between text-xs font-medium text-[var(--text-main)]/50">
            <span>A (12px)</span>
            <span>A (24px)</span>
          </div>
          
          <div className="mt-6 p-4 bg-[var(--bg-main)] rounded-xl border border-[var(--border)]">
            <p className="text-[var(--text-main)]/50 text-xs mb-3 uppercase tracking-wider font-bold">Pré-visualização do Leitor</p>
            <p 
              className="text-[var(--text-main)] transition-all duration-200"
              style={{ fontSize: `${preferences.fontSize}px`, lineHeight: 1.6 }}
            >
              &quot;A leitura de um bom livro é um diálogo incessante: o livro fala e a alma responde.&quot; 
              <br/><br/>
              Este é um exemplo de como o conteúdo das resenhas será exibido para você com o tamanho de fonte selecionado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
