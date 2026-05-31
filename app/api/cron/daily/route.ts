import { NextResponse } from 'next/server';

/**
 * Rota unificada para o plano Hobby do Vercel.
 * Executa todas as tarefas diárias em uma única chamada.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: any = {
    timestamp: new Date().toISOString(),
    tasks: []
  };

  // 1. Executar Consolidação de Views
  try {
    const { POST: consolidateViews } = await import('../consolidate-views/route');
    // Criamos um clone do request para passar adiante
    const res = await consolidateViews(new Request(request.url, {
      method: 'POST',
      headers: request.headers
    }));
    results.tasks.push({ name: 'consolidate-views', status: res.status, data: await res.json() });
  } catch (err: any) {
    results.tasks.push({ name: 'consolidate-views', status: 500, error: err.message });
  }

  // 2. Executar Atribuição de Medalhas (Badges)
  try {
    const { GET: awardBadges } = await import('../award-badges/route');
    const res = await awardBadges(request);
    results.tasks.push({ name: 'award-badges', status: res.status, data: await res.json() });
  } catch (err: any) {
    results.tasks.push({ name: 'award-badges', status: 500, error: err.message });
  }

  return NextResponse.json(results);
}
