-- ──────────────────────────────────────────────────────────────
-- Migración 006 — Espacio Ameno enriquecido
-- Permite que cumpleaños y eventos tengan banner clickeable
-- con imagen grande, mensaje extendido y link.
-- ──────────────────────────────────────────────────────────────

-- Cumpleaños: mensaje opcional (felicitación, dato curioso) e imagen banner
ALTER TABLE cumpleanos ADD COLUMN IF NOT EXISTS mensaje text;
ALTER TABLE cumpleanos ADD COLUMN IF NOT EXISTS imagen_url text;
ALTER TABLE cumpleanos ADD COLUMN IF NOT EXISTS link text;

-- Eventos: imagen banner (descripcion ya existe)
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS imagen_url text;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS link text;

-- Feature flag para deshabilitar/ocultar el módulo Helpdesk/Compras desde Branding también
-- (los flags ya existen, sólo agregamos uno nuevo de control general)
INSERT INTO feature_flags (clave, valor, descripcion, categoria) VALUES
  ('PORTAL_PERFIL_BTN_TOPBAR', true, 'Mostrar enlace a "Mi perfil" en el menú del usuario', 'portal')
ON CONFLICT (clave) DO NOTHING;
