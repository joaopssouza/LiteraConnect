import { supabase } from '@/lib/supabase';

/**
 * Tipos de bucket disponíveis no Supabase Storage self-hosted.
 * Criar esses buckets no painel do Supabase Studio antes do primeiro uso.
 */
export type StorageBucket = 'avatars' | 'post-images' | 'post-videos';

/**
 * Faz upload de um arquivo para o Supabase Storage.
 *
 * Substitui o `uploadToCloudinary` do módulo anterior.
 * Retorna a URL pública do arquivo, compatível com o campo `avatar_url`
 * e demais campos de imagem/vídeo do banco de dados.
 *
 * @param file   Arquivo a ser enviado (vindo de um <input type="file">)
 * @param bucket Nome do bucket de destino (avatars | post-images | post-videos)
 * @param path   Caminho opcional dentro do bucket. Se omitido, gera um UUID.
 */
export async function uploadToStorage(
  file: File,
  bucket: StorageBucket,
  path?: string,
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const filePath = path ?? `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
    cacheControl: '3600',
    upsert: true, // sobrescreve se o mesmo path for enviado novamente (útil para avatars)
    contentType: file.type,
  });

  if (error) {
    throw new Error(`[Storage] Falha no upload para "${bucket}/${filePath}": ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Remove um arquivo do Supabase Storage a partir de sua URL pública.
 * Útil para limpar avatars antigos antes de fazer upload de um novo.
 *
 * @param publicUrl URL pública retornada por `uploadToStorage`
 * @param bucket    Bucket onde o arquivo está armazenado
 */
export async function deleteFromStorage(
  publicUrl: string,
  bucket: StorageBucket,
): Promise<void> {
  try {
    // Extrai o path do arquivo a partir da URL pública
    const url = new URL(publicUrl);
    const pathSegments = url.pathname.split(`/object/public/${bucket}/`);
    if (pathSegments.length < 2) return;

    const filePath = decodeURIComponent(pathSegments[1]);
    const { error } = await supabase.storage.from(bucket).remove([filePath]);

    if (error) {
      console.warn(`[Storage] Falha ao remover "${bucket}/${filePath}":`, error.message);
    }
  } catch (err) {
    console.warn('[Storage] Erro ao processar URL para remoção:', err);
  }
}
