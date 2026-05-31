'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationToggle() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
    } else {
      setIsLoading(false);
    }
  }, []);

  async function checkSubscription() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error('Erro ao verificar inscrição de push:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function subscribeButtonOnClick() {
    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Permissão para notificações negada.');
        setIsLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) {
        throw new Error('Chave VAPID pública não encontrada no ambiente.');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });

      // Salva no backend
      const res = await fetch('/api/settings/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      if (res.ok) {
        setIsSubscribed(true);
      } else {
        throw new Error('Falha ao salvar inscrição no servidor.');
      }
    } catch (err) {
      console.error('Erro ao inscrever para push:', err);
      alert('Ocorreu um erro ao tentar habilitar as notificações.');
    } finally {
      setIsLoading(false);
    }
  }

  async function unsubscribeButtonOnClick() {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Remove do backend
        await fetch('/api/settings/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        // Remove do navegador
        await subscription.unsubscribe();
        setIsSubscribed(false);
      }
    } catch (err) {
      console.error('Erro ao cancelar inscrição:', err);
    } finally {
      setIsLoading(false);
    }
  }

  if (!isSupported) {
    return (
      <div className="text-sm text-[var(--text-main)]/50">
        Seu navegador não suporta notificações Push.
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col">
        <h3 className="text-lg font-semibold text-[var(--text-main)]">Notificações Push (Nativas)</h3>
        <p className="text-sm text-[var(--text-main)]/60">
          Receba avisos no seu dispositivo quando estiver fora do app.
        </p>
      </div>

      <button
        onClick={isSubscribed ? unsubscribeButtonOnClick : subscribeButtonOnClick}
        disabled={isLoading}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
          isSubscribed ? 'bg-brand-1' : 'bg-[var(--border)]'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform flex items-center justify-center ${
            isSubscribed ? 'translate-x-6' : 'translate-x-1'
          }`}
        >
          {isLoading && <Loader2 className="w-3 h-3 text-black animate-spin" />}
        </span>
      </button>
    </div>
  );
}
