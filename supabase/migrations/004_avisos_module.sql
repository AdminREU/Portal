-- ──────────────────────────────────────────────────────────────
-- Migración 004 — Módulo Avisos (Portal Ultralam)
-- Tablero del portal: anuncios, cumpleaños, eventos, frases,
-- tareas y notificaciones por usuario.
-- ──────────────────────────────────────────────────────────────

-- ============================================================
-- 1) ANUNCIOS  (categoría, mensaje, vigencia, prioridad)
-- ============================================================
CREATE TABLE IF NOT EXISTS anuncios (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria     text NOT NULL DEFAULT 'ANUNCIO',   -- ANUNCIO, CAPACIT., SISTEMAS, RH, OPERACIONES...
  titulo        text NOT NULL,
  mensaje       text,
  color         text DEFAULT '#ffd400',
  icono         text DEFAULT '📢',
  prioridad     int  DEFAULT 0,                    -- 0=normal, 1=destacado, 2=urgente
  publicado_at  timestamptz NOT NULL DEFAULT now(),
  expira_at     timestamptz,
  activo        boolean NOT NULL DEFAULT true,
  autor_email   text,
  autor_nombre  text,
  link          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_anuncios_activo_publicado ON anuncios(activo, publicado_at DESC);
CREATE INDEX IF NOT EXISTS idx_anuncios_expira ON anuncios(expira_at);

-- ============================================================
-- 2) CUMPLEAÑOS / ANIVERSARIOS
--    Día + mes (sin año) + opcionalmente año para aniversarios
-- ============================================================
CREATE TABLE IF NOT EXISTS cumpleanos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text,
  nombre        text NOT NULL,
  departamento  text,
  tipo          text NOT NULL DEFAULT 'cumple',    -- cumple | aniversario | onomastico
  dia           int  NOT NULL CHECK (dia BETWEEN 1 AND 31),
  mes           int  NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio          int,                                -- año de ingreso (para aniversarios)
  foto_url      text,
  mostrar       boolean NOT NULL DEFAULT true,
  notas         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cumpleanos_fecha ON cumpleanos(mes, dia) WHERE mostrar = true;

-- ============================================================
-- 3) EVENTOS  (convivios, juntas, mantenimientos programados)
-- ============================================================
CREATE TABLE IF NOT EXISTS eventos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo        text NOT NULL,
  descripcion   text,
  tipo          text NOT NULL DEFAULT 'evento',    -- evento | convivio | mantenimiento | junta | capacitacion
  fecha         date NOT NULL,
  hora_inicio   time,
  hora_fin      time,
  lugar         text,
  icono         text DEFAULT '🎉',
  color         text DEFAULT '#a78bfa',
  link          text,
  activo        boolean NOT NULL DEFAULT true,
  autor_email   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON eventos(fecha) WHERE activo = true;

-- ============================================================
-- 4) FRASES  (frase del día rotativa)
-- ============================================================
CREATE TABLE IF NOT EXISTS frases (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texto         text NOT NULL,
  autor         text,
  categoria     text DEFAULT 'motivacion',
  activo        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_frases_activo ON frases(activo);

-- ============================================================
-- 5) TAREAS / CALENDARIO (personal y compartido)
-- ============================================================
CREATE TABLE IF NOT EXISTS tareas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo        text NOT NULL,
  descripcion   text,
  fecha         date NOT NULL,
  hora          time,
  asignado_email text,                              -- null = visible para todos
  creador_email text,
  prioridad     text DEFAULT 'media',               -- baja | media | alta
  status        text DEFAULT 'pendiente',           -- pendiente | en_curso | completada
  modulo        text,                               -- portal | helpdesk | compras
  link          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tareas_asignado_fecha ON tareas(asignado_email, fecha);
CREATE INDEX IF NOT EXISTS idx_tareas_fecha ON tareas(fecha);

-- ============================================================
-- 6) NOTIFICACIONES por usuario
--    Se generan por triggers / API cuando hay eventos
--    (ticket asignado, OC aprobada, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS notificaciones (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email    text NOT NULL,
  tipo          text NOT NULL,                     -- ticket | oc | sistema | aviso
  titulo        text,
  mensaje       text NOT NULL,
  link          text,
  icono         text,
  color         text,
  leida         boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notificaciones(user_email, leida, created_at DESC);

-- ============================================================
-- 7) FEATURE FLAGS GLOBALES
--    Para que ADMIN encienda/apague funciones desde UI
-- ============================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  clave         text PRIMARY KEY,
  valor         boolean NOT NULL DEFAULT true,
  descripcion   text,
  categoria     text,                              -- portal | helpdesk | compras | global
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    text
);

-- ── Seeds: flags default ───────────────────────────────────
INSERT INTO feature_flags (clave, valor, descripcion, categoria) VALUES
  ('PORTAL_HERO_ROTATIVO', true,  'Rotación automática del hero del portal', 'portal'),
  ('PORTAL_FRASE_DIA',     true,  'Mostrar frase del día en el portal',      'portal'),
  ('PORTAL_ESPACIO_AMENO', true,  'Mostrar cumpleaños y eventos en portal',  'portal'),
  ('PORTAL_TABLERO',       true,  'Mostrar tablero de anuncios/notif/tareas','portal'),
  ('PORTAL_BUSQUEDA',      true,  'Habilitar búsqueda global en topbar',     'portal'),
  ('HELPDESK_HABILITADO',  true,  'Acceso al módulo Helpdesk',               'helpdesk'),
  ('COMPRAS_HABILITADO',   true,  'Acceso al módulo Compras',                'compras'),
  ('SIMULADOR_HABILITADO', false, 'Acceso al Simulador 3D (próximamente)',   'global'),
  ('NOTIFICACIONES_EMAIL', true,  'Enviar notificaciones por email',         'global'),
  ('TEMA_LIBRE',           true,  'Usuarios pueden cambiar tema',            'global')
ON CONFLICT (clave) DO NOTHING;

-- ── Seeds: frases iniciales ───────────────────────────────
INSERT INTO frases (texto, autor, categoria) VALUES
  ('La calidad nunca es un accidente; es siempre el resultado de un esfuerzo inteligente.', 'John Ruskin',         'calidad'),
  ('Lo que no se mide, no se mejora.',                                                       'Peter Drucker',       'gestion'),
  ('El secreto del éxito es la constancia en el propósito.',                                'Benjamin Disraeli',   'motivacion'),
  ('La excelencia no es un acto, sino un hábito.',                                          'Aristóteles',         'motivacion'),
  ('Innovar es ver lo que todos ven y pensar lo que nadie ha pensado.',                     'Albert Szent-Györgyi','innovacion'),
  ('No se trata de qué tan rápido vayas, sino de no detenerte.',                             'Confucio',            'perseverancia'),
  ('La mejor manera de predecir el futuro es crearlo.',                                     'Peter Drucker',       'innovacion'),
  ('Quien quiere hacer algo encuentra un medio, quien no, una excusa.',                     'Anónimo',             'motivacion')
ON CONFLICT DO NOTHING;

-- ── Seeds: anuncios demo (se pueden borrar) ───────────────
INSERT INTO anuncios (categoria, titulo, mensaje, icono, prioridad, autor_nombre) VALUES
  ('ANUNCIO', 'Bienvenida al nuevo Portal Ultralam', 'Estrenamos la plataforma unificada Helpdesk + Compras + Simulador.', '🎉', 1, 'Sistemas'),
  ('SISTEMAS','Mantenimiento programado', 'Mantenimiento de servidores el próximo lunes de 22:00 a 23:00.', '🛠️', 0, 'Sistemas')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 8) Funciones de utilidad
-- ============================================================

-- Próximos cumpleaños (ventana ±N días desde hoy)
CREATE OR REPLACE FUNCTION cumpleanos_proximos(ventana_dias int DEFAULT 30)
RETURNS TABLE (
  id uuid, nombre text, departamento text, tipo text,
  dia int, mes int, anio int, foto_url text,
  fecha_proxima date, dias_faltantes int
) AS $$
DECLARE
  hoy date := current_date;
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.nombre, c.departamento, c.tipo,
    c.dia, c.mes, c.anio, c.foto_url,
    CASE
      WHEN make_date(extract(year from hoy)::int, c.mes, LEAST(c.dia, extract(day from (date_trunc('month', make_date(extract(year from hoy)::int, c.mes, 1)) + interval '1 month' - interval '1 day'))::int)) >= hoy
        THEN make_date(extract(year from hoy)::int, c.mes, LEAST(c.dia, extract(day from (date_trunc('month', make_date(extract(year from hoy)::int, c.mes, 1)) + interval '1 month' - interval '1 day'))::int))
      ELSE make_date(extract(year from hoy)::int + 1, c.mes, LEAST(c.dia, extract(day from (date_trunc('month', make_date(extract(year from hoy)::int + 1, c.mes, 1)) + interval '1 month' - interval '1 day'))::int))
    END AS fecha_proxima,
    NULL::int AS dias_faltantes
  FROM cumpleanos c
  WHERE c.mostrar = true;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 9) Trigger updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_anuncios_updated_at') THEN
    CREATE TRIGGER trg_anuncios_updated_at BEFORE UPDATE ON anuncios FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cumpleanos_updated_at') THEN
    CREATE TRIGGER trg_cumpleanos_updated_at BEFORE UPDATE ON cumpleanos FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_eventos_updated_at') THEN
    CREATE TRIGGER trg_eventos_updated_at BEFORE UPDATE ON eventos FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tareas_updated_at') THEN
    CREATE TRIGGER trg_tareas_updated_at BEFORE UPDATE ON tareas FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_feature_flags_updated_at') THEN
    CREATE TRIGGER trg_feature_flags_updated_at BEFORE UPDATE ON feature_flags FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
  END IF;
END $$;
