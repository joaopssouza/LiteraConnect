import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import OnboardingClient from './OnboardingClient';

export const metadata = {
  title: 'Bem-vindo | LiteraConnect',
  description: 'Defina suas preferências literárias.',
};

export default async function OnboardingPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  let requireConsent = false;
  if (user) {
    const { data } = await supabase.from('users').select('consent_terms_accepted_at').eq('id', user.id).single();
    if (data && !data.consent_terms_accepted_at) {
      requireConsent = true;
    }
  }

  return <OnboardingClient requireConsent={requireConsent} />;
}
