import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import clientPromise from '@/lib/mongodb';

/**
 * POST /api/settings/notifications/subscribe
 * Registra a assinatura do Web Push no banco de dados para o usuário atual.
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { user } = auth;

  try {
    const subscription = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 400 });
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db('literaconnect');

    // Salva ou atualiza a assinatura usando o endpoint como chave única
    await db.collection('push_subscriptions').updateOne(
      { endpoint: subscription.endpoint },
      {
        $set: {
          user_id: user.id,
          subscription: subscription,
          updated_at: new Date(),
        },
        $setOnInsert: { created_at: new Date() },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[WebPush Subscribe] Erro:', err);
    return NextResponse.json({ error: 'Erro ao salvar assinatura.' }, { status: 500 });
  }
}

/**
 * DELETE /api/settings/notifications/subscribe
 * Remove a assinatura do Web Push do banco de dados.
 */
export async function DELETE(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint inválido.' }, { status: 400 });
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db('literaconnect');

    await db.collection('push_subscriptions').deleteOne({ endpoint });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[WebPush Unsubscribe] Erro:', err);
    return NextResponse.json({ error: 'Erro ao remover assinatura.' }, { status: 500 });
  }
}
