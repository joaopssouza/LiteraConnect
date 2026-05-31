CREATE OR REPLACE FUNCTION public.create_direct_conversation(p_creator_id uuid, p_target_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conv_id uuid;
BEGIN
  -- Verificar se já existe uma conversa 1:1 entre os dois
  SELECT c.id INTO v_conv_id
  FROM public.conversations c
  JOIN public.conversation_participants p1 ON c.id = p1.conversation_id
  JOIN public.conversation_participants p2 ON c.id = p2.conversation_id
  WHERE c.is_group = false
    AND p1.user_id = p_creator_id
    AND p2.user_id = p_target_id;

  IF v_conv_id IS NOT NULL THEN
    RETURN v_conv_id;
  END IF;

  -- Criar nova conversa
  INSERT INTO public.conversations (is_group) VALUES (false) RETURNING id INTO v_conv_id;

  -- Inserir participantes
  INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (v_conv_id, p_creator_id), (v_conv_id, p_target_id);

  RETURN v_conv_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_direct_conversation(uuid, uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_user_id uuid, p_conversation_id uuid)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now timestamp with time zone;
BEGIN
  v_now := now();
  UPDATE public.conversation_participants
  SET last_read_at = v_now
  WHERE conversation_id = p_conversation_id AND user_id = p_user_id;
  RETURN v_now;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid, uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_user_conversations(p_user_id uuid, p_limit int)
RETURNS TABLE (
  id uuid,
  is_group boolean,
  created_at timestamp with time zone,
  participants jsonb,
  other jsonb,
  my_last_read_at timestamp with time zone,
  other_last_read_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH user_convos AS (
    SELECT conversation_id, last_read_at
    FROM public.conversation_participants
    WHERE user_id = p_user_id
  )
  SELECT 
    c.id,
    c.is_group,
    c.created_at,
    (
      SELECT jsonb_agg(jsonb_build_object('user_id', cp.user_id))
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = c.id
    ) as participants,
    (
      SELECT jsonb_build_object('id', u.id, 'name', u.name, 'handle', u.handle, 'avatar_url', u.avatar_url, 'last_seen_at', null)
      FROM public.conversation_participants cp
      JOIN public.users u ON u.id = cp.user_id
      WHERE cp.conversation_id = c.id AND cp.user_id != p_user_id
      LIMIT 1
    ) as other,
    uc.last_read_at as my_last_read_at,
    (
      SELECT cp.last_read_at
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = c.id AND cp.user_id != p_user_id
      LIMIT 1
    ) as other_last_read_at
  FROM public.conversations c
  JOIN user_convos uc ON uc.conversation_id = c.id
  ORDER BY c.created_at DESC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_conversations(uuid, int) TO anon, authenticated, service_role;
