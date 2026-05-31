'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Badge {
  badge_type: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  unlocked_at: string;
}

interface BadgeDisplayProps {
  userId: string;
  /** Se true, mostra apenas os 3 badges mais recentes */
  compact?: boolean;
  className?: string;
}

/**
 * BadgeDisplay — exibe as conquistas/badges desbloqueados de um usuário.
 * Busca via GET /api/badges/:userId com cache Redis no servidor.
 *
 * Modo compact: mostra até 3 badges com tooltip.
 * Modo completo: mostra todos em grid com detalhes.
 */
export default function BadgeDisplay({ userId, compact = false, className }: BadgeDisplayProps) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/badges/${userId}`)
      .then((r) => r.ok ? r.json() : { badges: [] })
      .then((data) => setBadges(data.badges || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading || badges.length === 0) return null;

  const displayBadges = compact ? badges.slice(0, 3) : badges;
  const remainingCount = compact ? Math.max(0, badges.length - 3) : 0;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        {displayBadges.map((badge) => (
          <div
            key={badge.badge_type}
            className="relative group"
            onMouseEnter={() => setHoveredBadge(badge.badge_type)}
            onMouseLeave={() => setHoveredBadge(null)}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm border-2 transition-transform group-hover:scale-110 cursor-default shadow-sm"
              style={{ borderColor: `${badge.color}40`, backgroundColor: `${badge.color}15` }}
              title={badge.name}
            >
              {badge.icon}
            </div>

            {/* Tooltip */}
            {hoveredBadge === badge.badge_type && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 shadow-xl w-max max-w-[180px] text-center">
                  <p className="text-xs font-bold text-[var(--text-main)]">{badge.name}</p>
                  <p className="text-[10px] text-[var(--text-main)]/60 mt-0.5">{badge.description}</p>
                  {/* Seta */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--border)]" />
                </div>
              </div>
            )}
          </div>
        ))}

        {remainingCount > 0 && (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black bg-[var(--surface)] border border-[var(--border)] text-[var(--text-main)]/50">
            +{remainingCount}
          </div>
        )}
      </div>
    );
  }

  // Modo completo — grid de cards
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 gap-3', className)}>
      {displayBadges.map((badge) => (
        <div
          key={badge.badge_type}
          className="flex flex-col items-center gap-2 p-4 rounded-2xl border text-center transition-all hover:shadow-md cursor-default"
          style={{
            borderColor: `${badge.color}30`,
            backgroundColor: `${badge.color}08`,
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border-2 shadow-sm"
            style={{ borderColor: `${badge.color}40`, backgroundColor: `${badge.color}15` }}
          >
            {badge.icon}
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text-main)]">{badge.name}</p>
            <p className="text-[10px] text-[var(--text-main)]/50 mt-0.5 leading-relaxed">
              {badge.description}
            </p>
            <p className="text-[9px] text-[var(--text-main)]/30 mt-1.5 font-medium">
              {new Date(badge.unlocked_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
