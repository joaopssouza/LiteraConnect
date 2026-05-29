/**
 * @deprecated Este módulo foi substituído por `lib/storage.ts`.
 *
 * O Cloudinary foi removido da infraestrutura do projeto em favor
 * do Supabase Storage Self-Hosted. Este arquivo é mantido apenas
 * para referência histórica e não deve ser importado.
 *
 * @see lib/storage.ts
 */

export async function uploadToCloudinary(_file: File): Promise<string> {
  throw new Error(
    '[cloudinary.ts] Módulo depreciado. Use `uploadToStorage` de `@/lib/storage` em seu lugar.'
  );
}
