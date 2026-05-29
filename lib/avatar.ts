const colorPalette = [
  '#0F766E',
  '#1D4ED8',
  '#9333EA',
  '#B45309',
  '#BE123C',
  '#0E7490',
  '#166534',
  '#7C2D12',
];

export const getLocalAvatar = (seed: string, size = 100) => {
  const safeSeed = encodeURIComponent(seed || 'user');
  return `/api/avatar?seed=${safeSeed}&size=${size}`;
};

export const resolveAvatarUrl = (avatarUrl: string | null | undefined, seed: string, size = 100) => {
  if (!avatarUrl || /picsum\.photos/i.test(avatarUrl)) {
    return getLocalAvatar(seed, size);
  }
  return avatarUrl;
};

export const pickAvatarColor = (seed: string) => {
  const normalized = seed || 'user';
  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash << 5) - hash + normalized.charCodeAt(index);
    hash |= 0;
  }
  const paletteIndex = Math.abs(hash) % colorPalette.length;
  return colorPalette[paletteIndex];
};
