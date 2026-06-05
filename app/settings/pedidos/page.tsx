'use client';

import { HeadphonesIcon, FileText, CheckCircle2, Clock, Plus, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

export default function PedidosSuportePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/settings/tickets');
      if (!res.ok) throw new Error('Falha ao carregar chamados');
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível carregar os pedidos de suporte.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) {
      toast.error('Preencha todos os campos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/settings/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, description: newDescription }),
      });
      if (!res.ok) throw new Error('Falha ao criar chamado');
      const data = await res.json();
      
      setTickets([data.ticket, ...tickets]);
      setIsModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      toast.success('Chamado aberto com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao abrir chamado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full max-w-2xl">
      <div className="p-6 border-b border-[var(--border-main)] flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-[var(--text-main)]">
            <HeadphonesIcon className="w-6 h-6 text-brand-1" />
            Pedidos de Suporte
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Acompanhe seus chamados e conversas com a nossa equipe.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-brand-1 text-white text-sm font-semibold rounded-xl hover:bg-brand-1/90 transition-colors flex items-center gap-1 active:scale-95"
        >
          <Plus className="w-4 h-4" /> Novo
        </button>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 text-brand-1 animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12 bg-black/5 dark:bg-white/5 rounded-2xl border border-[var(--border-main)]">
            <FileText className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-semibold text-[var(--text-main)]">Nenhum pedido</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Você ainda não abriu nenhum chamado de suporte.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-[var(--border-main)] rounded-xl bg-[var(--surface)] hover:border-brand-2 transition-colors cursor-pointer group">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-semibold text-[var(--text-secondary)] bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded">
                      #{ticket.id.split('-')[0]}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">{formatDate(ticket.created_at)}</span>
                  </div>
                  <h3 className="font-semibold text-[var(--text-main)] group-hover:text-brand-1 transition-colors">{ticket.title}</h3>
                </div>
                <div className="mt-3 sm:mt-0 flex items-center gap-2">
                  {ticket.status === 'Resolvido' ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full whitespace-nowrap">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {ticket.status}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full whitespace-nowrap">
                      <Clock className="w-3.5 h-3.5" />
                      {ticket.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/settings/central-ajuda" className="text-sm text-brand-2 hover:underline">
            Voltar para a Central de Ajuda
          </Link>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--surface)] rounded-2xl shadow-2xl border border-[var(--border-main)] overflow-hidden">
            <div className="p-4 border-b border-[var(--border-main)] flex items-center justify-between">
              <h3 className="font-bold text-[var(--text-main)] flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand-1" /> Abrir Chamado
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg hover:bg-[var(--border-main)] transition-colors">
                <X className="w-4 h-4 text-[var(--text-main)]" />
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-4 flex flex-col gap-4">
              <div>
                <label className="text-sm font-semibold text-[var(--text-main)]">Assunto</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Problema com minha conta"
                  className="w-full mt-1 px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] outline-none focus:border-brand-1"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-[var(--text-main)]">Descrição</label>
                <textarea
                  required
                  rows={4}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Detalhe o que está acontecendo..."
                  className="w-full mt-1 px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] outline-none focus:border-brand-1 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg font-medium text-[var(--text-secondary)] hover:bg-[var(--border-main)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-brand-1 text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar Chamado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
