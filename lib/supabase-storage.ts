import { supabase } from './supabase';

export async function uploadMedia(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  const { data, error } = await supabase.storage
    .from('media')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(error.message || 'Falha ao fazer upload da mídia.');
  }

  const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);

  return publicUrl;
}
