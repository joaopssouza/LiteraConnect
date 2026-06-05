ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.messages ALTER COLUMN content DROP NOT NULL;
