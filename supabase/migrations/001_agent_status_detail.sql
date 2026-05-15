-- ============================================================
-- Migración 001 — Estado de agente con detalle y color
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Detalle del estado del agente
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS agent_status_detail TEXT,
  ADD COLUMN IF NOT EXISTS agent_status_updated_at TIMESTAMPTZ;

-- 2. Reemplazar agent_statuses con la nueva estructura (key, label, color, level)
UPDATE catalogs SET value = '[
  {"key":"disponible","label":"Disponible","color":"#10b981","level":"INFO"},
  {"key":"ocupado","label":"Ocupado","color":"#f59e0b","level":"MEDIA"},
  {"key":"ausente","label":"Ausente","color":"#6b7280","level":"BAJA"}
]'::jsonb
WHERE key = 'agent_statuses';

-- Insertar si aún no existe
INSERT INTO catalogs (key, value) VALUES (
  'agent_statuses',
  '[
    {"key":"disponible","label":"Disponible","color":"#10b981","level":"INFO"},
    {"key":"ocupado","label":"Ocupado","color":"#f59e0b","level":"MEDIA"},
    {"key":"ausente","label":"Ausente","color":"#6b7280","level":"BAJA"}
  ]'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- 3. Branding de la app (logo + nombre editables)
INSERT INTO settings (key, value) VALUES
  ('APP_NAME', 'Helpdesk Ultralam'),
  ('APP_LOGO_URL', ''),
  ('APP_PRIMARY_COLOR', '#3b82f6')
ON CONFLICT (key) DO NOTHING;
