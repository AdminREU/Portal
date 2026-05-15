-- ──────────────────────────────────────────────────────────────
-- Migración 005 — Personalización del Portal
-- Imágenes en anuncios, foto de perfil de usuario, settings
-- editables para títulos/saludo/subtítulos.
-- ──────────────────────────────────────────────────────────────

-- 1) Imágenes en anuncios
ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS imagen_url text;

-- 2) Foto de perfil en usuarios
ALTER TABLE users ADD COLUMN IF NOT EXISTS foto_url text;

-- 3) Settings editables (default — solo si no existen)
INSERT INTO settings (key, value) VALUES
  ('APP_NAME',                    'Portal Ultralam'),
  ('PORTAL_SALUDO',               'equipo Ultralam'),
  ('PORTAL_MENSAJE_BIENVENIDA',   ''),
  ('PORTAL_TITULO_HELPDESK',      'Helpdesk'),
  ('PORTAL_SUBTITULO_HELPDESK',   'Soporte técnico, incidencias y base de conocimiento'),
  ('PORTAL_ICONO_HELPDESK',       '🎫'),
  ('PORTAL_TITULO_COMPRAS',       'Sistema de Compras'),
  ('PORTAL_SUBTITULO_COMPRAS',    'Órdenes, aprobaciones por nivel, proveedores y PDFs'),
  ('PORTAL_ICONO_COMPRAS',        '🛒'),
  ('PORTAL_TITULO_SIMULADOR',     'Simulador de Carga 3D'),
  ('PORTAL_SUBTITULO_SIMULADOR',  'Cálculo y visualización 3D de cargas de transporte'),
  ('PORTAL_ICONO_SIMULADOR',      '📐')
ON CONFLICT (key) DO NOTHING;

-- 4) Feature flags adicionales
INSERT INTO feature_flags (clave, valor, descripcion, categoria) VALUES
  ('USUARIO_PERFIL_AVANZADO', false, 'Permite a usuarios editar nombre, puesto, teléfono, departamento', 'global'),
  ('USUARIO_FOTO_PERFIL',     false, 'Permite subir foto de perfil de usuario',                          'global'),
  ('PORTAL_NOTIFICACIONES',   true,  'Mostrar campana de notificaciones en topbar',                     'portal')
ON CONFLICT (clave) DO NOTHING;

-- 5) Crear bucket público para imágenes del portal si no existe
-- (Esto solo se puede hacer desde Supabase Dashboard normalmente)
-- En su lugar reutilizamos el bucket 'evidencias' que ya existe.
