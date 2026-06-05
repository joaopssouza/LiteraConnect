-- Sprint 21: Preferências do Usuário (Identidade Literária)
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    favorite_categories TEXT[] DEFAULT '{}',
    favorite_books TEXT[] DEFAULT '{}', -- ISBNs ou IDs salvos no onboarding
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Sprint 22: Estante Virtual (Livros Lidos, Lendo, Quero Ler)
CREATE TABLE IF NOT EXISTS public.user_bookshelf (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    book_id TEXT NOT NULL, -- Corresponde ao _id no MongoDB (Google Books ID)
    status TEXT NOT NULL CHECK (status IN ('want_to_read', 'reading', 'read')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, book_id)
);

-- Sprint 24: Metas Anuais de Leitura
CREATE TABLE IF NOT EXISTS public.reading_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    goal_year INT NOT NULL,
    target_books INT NOT NULL DEFAULT 12,
    current_books INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, goal_year)
);

-- Segurança (Row Level Security) - Arquitetura Segura Self-Hosted
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bookshelf ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_goals ENABLE ROW LEVEL SECURITY;

-- Políticas (Policies)
CREATE POLICY "Usuário gerencia próprias preferências" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Leitura pública de preferências" ON public.user_preferences FOR SELECT USING (true);

CREATE POLICY "Usuário gerencia própria estante" ON public.user_bookshelf FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Leitura pública de estantes" ON public.user_bookshelf FOR SELECT USING (true);

CREATE POLICY "Usuário gerencia próprias metas" ON public.reading_goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Leitura pública de metas" ON public.reading_goals FOR SELECT USING (true);

-- Garantir privilégios para as roles do Supabase
GRANT ALL PRIVILEGES ON TABLE public.user_preferences TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.user_bookshelf TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.reading_goals TO anon, authenticated, service_role;
