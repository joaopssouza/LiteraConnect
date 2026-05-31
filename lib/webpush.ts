import webpush from 'web-push';
import clientPromise from '@/lib/mongodb';

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(
    'mailto:contato@literaconnect.com', // E-mail obrigatório
    publicVapidKey,
    privateVapidKey
  );
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

/**
 * Envia uma notificação push para todos os dispositivos registrados de um usuário.
 */
export async function sendPushNotification(userId: string, payload: PushNotificationPayload) {
  if (!publicVapidKey || !privateVapidKey) {
    console.warn('[WebPush] Chaves VAPID não configuradas. Notificação cancelada.');
    return;
  }

  try {
    const mongoClient = await clientPromise;
    const db = mongoClient.db('literaconnect');

    const subscriptions = await db
      .collection('push_subscriptions')
      .find({ user_id: userId })
      .toArray();

    if (subscriptions.length === 0) return;

    const payloadString = JSON.stringify(payload);

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, payloadString);
      } catch (err: any) {
        // Se a assinatura expirou ou for inválida (410, 404), remova do banco
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log(`[WebPush] Assinatura inválida (status ${err.statusCode}). Removendo...`);
          await db.collection('push_subscriptions').deleteOne({ _id: sub._id });
        } else {
          console.error('[WebPush] Erro ao enviar para inscrição:', err);
        }
      }
    });

    await Promise.all(sendPromises);
  } catch (err) {
    console.error('[WebPush] Erro crítico ao enviar push:', err);
  }
}
