'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const SecurityClient = dynamic(() => import('./SecurityClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-12 text-[var(--text-main)]/50">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  )
});

export default function SecurityPage() {
  return <SecurityClient />;
}
