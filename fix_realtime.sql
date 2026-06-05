INSERT INTO _realtime.extensions (id, type, settings, tenant_external_id, inserted_at, updated_at)
VALUES (
  gen_random_uuid(),
  'postgres_cdc_rls',
  '{"db_host":"supabase_db","db_name":"postgres","db_port":"5432","db_user":"supabase_admin","db_password":"Chaotic3","region":"us-east-1","poll_interval_ms":100,"poll_max_record_bytes":1048576,"ip_version":4,"slot_name":"supabase_realtime_replication_slot"}'::jsonb,
  'supabase_realtime',
  now(),
  now()
);
