-- ==============================================================================
-- Script para criar a função get_user_sessions
-- Isso resolve o Erro 500 na rota /api/settings/security/sessions
-- ==============================================================================

-- A função precisa ser SECURITY DEFINER para acessar a tabela auth.sessions,
-- que normalmente não é acessível ao usuário padrão. O `set search_path = ''` 
-- é uma medida de segurança recomendada pelo Supabase.

DROP FUNCTION IF EXISTS public.get_user_sessions();

CREATE OR REPLACE FUNCTION public.get_user_sessions()
RETURNS TABLE (
  id uuid,
  user_agent text,
  ip inet,
  created_at timestamptz,
  updated_at timestamptz
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = '' 
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.user_agent,
    s.ip,
    s.created_at,
    s.updated_at
  FROM auth.sessions s
  WHERE s.user_id = auth.uid()
  ORDER BY s.updated_at DESC;
END;
$$;

-- Garantir que a função possa ser chamada por usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_user_sessions() TO authenticated;
