import { redirect } from 'next/navigation';

export default function SettingsRedirect() {
  // O layout por si só já lida com a exibição master/detail dependendo da view.
  // Em telas desktop, ao entrar em /settings, o texto placeholder ou redirect é ideal.
  // Como temos `isRootSettings` mostrando em mobile o menu completo, aqui nós 
  // só colocamos um placeholder para desktop indicando "Selecione uma opção".
  return (
    <div className="hidden md:flex flex-col items-center justify-center h-full min-h-[300px] text-[var(--text-main)]/50">
      <p>Selecione uma opção no menu ao lado.</p>
    </div>
  );
}
