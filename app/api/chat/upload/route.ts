import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

/**
 * POST /api/chat/upload
 * Recebe um arquivo multipart e faz upload para o Supabase Storage.
 * Retorna a URL segura do arquivo.
 *
 * Tipos suportados:
 *  - Imagens: image/* (máx. 10MB)
 *  - Áudio:   audio/* (máx. 5MB) — para mensagens de voz
 *  - Vídeo:   video/* (máx. 30MB)
 *
 * Rate limit: 20 uploads por minuto por usuário.
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { user } = auth;

  // Rate limit: 20 uploads por minuto
  const rl = await checkRateLimit(`chat:upload:${user.id}`, 20, 60);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 });
    }

    // ── Validação de tipo e tamanho ────────────────────────────────────────
    const isImage = file.type.startsWith('image/');
    const isAudio = file.type.startsWith('audio/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isAudio && !isVideo) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não suportado. Use imagem, áudio ou vídeo.' },
        { status: 415 }
      );
    }

    const maxSize = isImage ? 10 : isAudio ? 5 : 30; // MB
    if (file.size > maxSize * 1024 * 1024) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Limite: ${maxSize}MB.` },
        { status: 413 }
      );
    }

    // ── Upload para Supabase Storage ─────────────────────────────────────────────
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `chat_attachments/${fileName}`;

    const { data: uploadData, error: uploadError } = await auth.supabase.storage
      .from('media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message || 'Falha no upload para o Supabase Storage.');
    }

    const { data: { publicUrl } } = auth.supabase.storage.from('media').getPublicUrl(filePath);

    return NextResponse.json({
      url: publicUrl,
      type: isImage ? 'image' : isAudio ? 'audio' : 'video',
      bytes: file.size,
    });
  } catch (err: any) {
    console.error('[Chat Upload] Erro:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao fazer upload.' },
      { status: 500 }
    );
  }
}
