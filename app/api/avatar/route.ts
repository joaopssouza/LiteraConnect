import { NextResponse } from 'next/server';
import { pickAvatarColor } from '@/lib/avatar';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const seed = (url.searchParams.get('seed') || 'user').trim();
  const sizeParam = Number(url.searchParams.get('size') || 100);
  const size = Number.isFinite(sizeParam) ? Math.min(Math.max(sizeParam, 24), 512) : 100;
  const initials = seed.replace(/[^a-zA-Z0-9]/g, '').slice(0, 1).toUpperCase() || 'U';
  const bg = pickAvatarColor(seed);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="100%" height="100%" fill="${bg}"/>
  <text x="50%" y="53%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="${Math.floor(size * 0.46)}" font-weight="700">${initials}</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
