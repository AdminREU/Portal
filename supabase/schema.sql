-- ============================================================
-- Helpdesk Ultralam — Schema Supabase
-- Ejecutar completo en: Supabase Dashboard > SQL Editor
-- ============================================================

-- ── 1. USUARIOS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text        UNIQUE NOT NULL,
  nombre          text,
  rol             text        NOT NULL DEFAULT 'USUARIO', -- USUARIO | HELPDESK | ADMIN
  estado          text        NOT NULL DEFAULT 'ACTIVO',  -- ACTIVO | INACTIVO
  agent_status    text        DEFAULT 'disponible',       -- disponible | ocupado | ausente
  ultimo_acceso   timestamptz,
  login_count     integer     DEFAULT 0,
  otp_fail_count  integer     DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

-- ── 2. CÓDIGOS OTP ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_codes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        NOT NULL,
  code        text        NOT NULL,
  expires_at  timestamptz NOT NULL,
  attempts    integer     DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS otp_codes_email_idx ON otp_codes(email);

-- ── 3. SESIONES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token       text        UNIQUE NOT NULL,
  email       text        NOT NULL,
  rol         text        NOT NULL,
  last_active timestamptz DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_token_idx  ON sessions(token);
CREATE INDEX IF NOT EXISTS sessions_email_idx  ON sessions(email);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);

-- ── 4. TICKETS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id                  text        PRIMARY KEY,  -- "Ticket-0001"
  usuario_email       text        NOT NULL,
  area                text,
  ip                  text,
  almacen             text,
  equipo_num          text,
  categoria           text,
  subcategoria        text,
  servicio            text,
  prioridad           text        DEFAULT 'MEDIA',  -- CRITICA | ALTA | MEDIA | BAJA
  asunto              text        NOT NULL,
  descripcion         text,
  estado              text        DEFAULT 'abierto',
  -- abierto | asignado | en_espera_recurso | en_espera_confirmacion | resuelto | cerrado
  tecnico_asignado    text,
  respuesta_tecnico   text,
  motivo_cierre       text,
  rating              integer,
  rating_comment      text,
  updated_by_user     boolean     DEFAULT false,
  evidencias_json     jsonb       DEFAULT '[]'::jsonb,
  fecha_creacion      timestamptz DEFAULT now(),
  fecha_actualizacion timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tickets_estado_idx    ON tickets(estado);
CREATE INDEX IF NOT EXISTS tickets_usuario_idx   ON tickets(usuario_email);
CREATE INDEX IF NOT EXISTS tickets_tecnico_idx   ON tickets(tecnico_asignado);
CREATE INDEX IF NOT EXISTS tickets_creacion_idx  ON tickets(fecha_creacion DESC);

-- Trigger: actualizar fecha_actualizacion en cada UPDATE
CREATE OR REPLACE FUNCTION fn_update_fecha_actualizacion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.fecha_actualizacion = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tickets_updated ON tickets;
CREATE TRIGGER trg_tickets_updated
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION fn_update_fecha_actualizacion();

-- ── 5. HISTORIAL DE TICKETS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_history (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id text        REFERENCES tickets(id) ON DELETE CASCADE,
  action    text        NOT NULL,  -- created | updated | assigned | closed
  "from"    text,
  "to"      text,
  actor     text,
  note      text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS th_ticket_id_idx ON ticket_history(ticket_id);

-- ── 6. BASE DE CONOCIMIENTO ─────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_base (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo     text        NOT NULL,
  categoria  text,
  contenido  text,
  activo     boolean     DEFAULT true,
  autor      text,
  created_at timestamptz DEFAULT now()
);

-- ── 7. CONFIGURACIÓN (feature flags + contadores) ───────────
CREATE TABLE IF NOT EXISTS settings (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text        UNIQUE NOT NULL,
  value      text,
  created_at timestamptz DEFAULT now()
);

INSERT INTO settings (key, value) VALUES
  ('TICKET_SEQ',                           '0'),
  ('TICKET_PAD',                           '4'),
  ('FEATURE_EMAIL_NEW_TICKET_TO_HELPDESK', 'true'),
  ('FEATURE_EMAIL_CONFIRM_TICKET_TO_USER', 'true'),
  ('FEATURE_EMAIL_USER_ON_REPLY',          'true')
ON CONFLICT (key) DO NOTHING;

-- ── 8. CATÁLOGOS (categorías, motivos de cierre, etc.) ──────
CREATE TABLE IF NOT EXISTS catalogs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text        UNIQUE NOT NULL,
  value      jsonb,
  created_at timestamptz DEFAULT now()
);

INSERT INTO catalogs (key, value) VALUES
  ('categorias', '[]'::jsonb),
  ('motivos_cierre', '[
    {"key":"resuelto",         "label":"Problema resuelto",           "color":"#10b981"},
    {"key":"duplicado",        "label":"Ticket duplicado",            "color":"#6b7280"},
    {"key":"sin_respuesta",    "label":"Sin respuesta del usuario",   "color":"#f97316"},
    {"key":"no_aplica",        "label":"No aplica / Error de usuario","color":"#ef4444"},
    {"key":"fuera_de_alcance", "label":"Fuera de alcance",            "color":"#8b5cf6"}
  ]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ── 9. RLS — deshabilitar para el service role ───────────────
-- El app usa SUPABASE_SERVICE_ROLE_KEY (bypass RLS automático).
-- Habilitamos RLS en todas las tablas pero NO creamos políticas
-- de acceso público — todo el acceso va por server-side API routes.
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogs       ENABLE ROW LEVEL SECURITY;

-- ── 10. STORAGE — bucket evidencias ─────────────────────────
-- Ejecutar esto en Supabase Dashboard > Storage > New bucket
-- Nombre: evidencias | Public: true
-- O ejecutar directamente:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidencias',
  'evidencias',
  true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf',
        'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'video/mp4','video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Política pública de lectura para el bucket
DROP POLICY IF EXISTS "evidencias_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "evidencias_auth_insert"  ON storage.objects;
DROP POLICY IF EXISTS "evidencias_auth_delete"  ON storage.objects;

CREATE POLICY "evidencias_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'evidencias');

CREATE POLICY "evidencias_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'evidencias');

CREATE POLICY "evidencias_auth_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'evidencias');
