-- ============================================================
-- Portal Ultralam — Migración 003: Módulo Compras (PT-COMP)
-- Ejecutar después de schema.sql + 001 + 002
-- ============================================================
-- Conjuga con la tabla users existente. Roles ampliados:
--   USUARIO  (base — todos lo tienen)
--   HELPDESK (puede atender tickets)
--   COMPRAS  (puede gestionar OC)
--   APROBADOR (puede autorizar OC por nivel)
--   ADMIN    (puede todo + configurar)
-- Los roles extra se almacenan en users.roles_extra (jsonb array).
-- users.rol mantiene el rol principal por compatibilidad.

-- ── 1. EXTENDER USERS ───────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS roles_extra jsonb DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS puesto       text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS departamento text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS telefono     text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS nivel_aprobacion integer; -- nivel para APROBADOR

-- ── 2. PROVEEDORES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proveedores (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  rfc             text        UNIQUE NOT NULL,
  razon_social    text        NOT NULL,
  nombre_comercial text,
  contacto_nombre text,
  contacto_email  text,
  contacto_tel    text,
  direccion       text,
  banco           text,
  cuenta          text,
  clabe           text,
  csf_url         text,                       -- URL del PDF Constancia Situación Fiscal
  csf_filename    text,
  categoria       text,                       -- giro / categoría comercial
  notas           text,
  activo          boolean     DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS proveedores_rfc_idx     ON proveedores(rfc);
CREATE INDEX IF NOT EXISTS proveedores_activo_idx  ON proveedores(activo);

-- ── 3. CATÁLOGOS DE COMPRAS (departamentos, unidades, categorías, empresas) ─
-- Se almacenan en la tabla catalogs existente con keys específicos.
INSERT INTO catalogs (key, value) VALUES
  ('compras_empresas', '[
    {"key":"ultralam",   "label":"Ultralam",   "activo":true},
    {"key":"productora", "label":"Productora", "activo":true},
    {"key":"home",       "label":"Home",       "activo":true}
  ]'::jsonb),
  ('compras_departamentos', '[
    {"key":"administracion","label":"Administración"},
    {"key":"compras",       "label":"Compras"},
    {"key":"produccion",    "label":"Producción"},
    {"key":"almacen",       "label":"Almacén"},
    {"key":"ti",            "label":"TI"},
    {"key":"rh",            "label":"Recursos Humanos"},
    {"key":"ventas",        "label":"Ventas"},
    {"key":"contabilidad",  "label":"Contabilidad"}
  ]'::jsonb),
  ('compras_unidades', '[
    {"key":"pza", "label":"Pieza"},
    {"key":"kg",  "label":"Kilogramo"},
    {"key":"lt",  "label":"Litro"},
    {"key":"mt",  "label":"Metro"},
    {"key":"caja","label":"Caja"},
    {"key":"paq", "label":"Paquete"},
    {"key":"rollo","label":"Rollo"},
    {"key":"servicio","label":"Servicio"}
  ]'::jsonb),
  ('compras_categorias', '[
    {"key":"papeleria",    "label":"Papelería"},
    {"key":"limpieza",     "label":"Limpieza"},
    {"key":"refacciones",  "label":"Refacciones"},
    {"key":"materias_primas","label":"Materias primas"},
    {"key":"servicios",    "label":"Servicios"},
    {"key":"insumos_ti",   "label":"Insumos TI"},
    {"key":"mantenimiento","label":"Mantenimiento"},
    {"key":"otros",        "label":"Otros"}
  ]'::jsonb),
  ('compras_tipos', '[
    {"key":"recurrente",   "label":"Recurrente",   "color":"#10b981"},
    {"key":"no_recurrente","label":"No recurrente","color":"#3b82f6"},
    {"key":"urgente",      "label":"Urgente",      "color":"#ef4444"}
  ]'::jsonb),
  ('compras_estatus', '[
    {"key":"borrador",         "label":"Borrador",                "color":"#6b7280"},
    {"key":"pendiente_aprob",  "label":"Pendiente aprobación",    "color":"#f59e0b"},
    {"key":"aprobada",         "label":"Aprobada",                "color":"#10b981"},
    {"key":"rechazada",        "label":"Rechazada",               "color":"#ef4444"},
    {"key":"en_compra",        "label":"En proceso de compra",    "color":"#3b82f6"},
    {"key":"en_transito",      "label":"En tránsito",             "color":"#8b5cf6"},
    {"key":"recibida_parcial", "label":"Recibida parcial",        "color":"#f97316"},
    {"key":"recibida_total",   "label":"Recibida total",          "color":"#059669"},
    {"key":"facturada",        "label":"Facturada",               "color":"#0891b2"},
    {"key":"pagada",           "label":"Pagada",                  "color":"#16a34a"},
    {"key":"cerrada",          "label":"Cerrada",                 "color":"#374151"},
    {"key":"cancelada",        "label":"Cancelada",               "color":"#dc2626"}
  ]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ── 4. ÓRDENES DE COMPRA ────────────────────────────────────
CREATE TABLE IF NOT EXISTS ordenes (
  id                  text        PRIMARY KEY,    -- OC-UPU-2026-0001
  folio_seq           integer     NOT NULL,
  -- Solicitante
  solicitante_email   text        NOT NULL,
  solicitante_nombre  text,
  solicitante_puesto  text,
  solicitante_depto   text,
  solicitante_tel     text,
  empresa             text        NOT NULL,        -- ultralam | productora | home
  -- Clasificación
  tipo_compra         text        NOT NULL,        -- recurrente | no_recurrente | urgente
  categoria           text,
  justificacion       text,                        -- obligatoria para no_recurrente y urgente (advisory)
  observaciones       text,
  fuera_ventana       boolean     DEFAULT false,   -- bandera advisory
  -- Proveedor sugerido
  proveedor_id        uuid        REFERENCES proveedores(id) ON DELETE SET NULL,
  proveedor_rfc       text,
  proveedor_razon     text,
  -- Montos
  subtotal            numeric(14,2) DEFAULT 0,
  iva                 numeric(14,2) DEFAULT 0,
  total               numeric(14,2) DEFAULT 0,
  moneda              text          DEFAULT 'MXN',
  -- Aprobación
  estatus             text          NOT NULL DEFAULT 'borrador',
  nivel_aprobacion_actual integer   DEFAULT 0,
  aprobador_email     text,
  aprobador_nombre    text,
  fecha_aprobacion    timestamptz,
  motivo_rechazo      text,
  -- Compras (proceso)
  oc_proveedor_url    text,                        -- PDF firmado al proveedor
  fecha_envio_prov    timestamptz,
  fecha_estimada_entrega date,
  -- Recepción
  fecha_recepcion     timestamptz,
  recibido_por        text,
  observaciones_recep text,
  -- Facturación
  factura_folio       text,
  factura_uuid        text,                        -- UUID SAT (CFDI)
  factura_url         text,
  fecha_factura       timestamptz,
  fecha_limite_factura timestamptz,                 -- +48h de pagada
  factura_tardia      boolean     DEFAULT false,
  -- Pago
  fecha_pago          timestamptz,
  forma_pago          text,
  referencia_pago     text,
  -- Origen
  ticket_id_origen    text        REFERENCES tickets(id) ON DELETE SET NULL,
  -- Documentos
  pdf_url             text,
  pdf_filename        text,
  pdf_generated_at    timestamptz,
  -- Metadata
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ordenes_solicitante_idx ON ordenes(solicitante_email);
CREATE INDEX IF NOT EXISTS ordenes_estatus_idx     ON ordenes(estatus);
CREATE INDEX IF NOT EXISTS ordenes_tipo_idx        ON ordenes(tipo_compra);
CREATE INDEX IF NOT EXISTS ordenes_proveedor_idx   ON ordenes(proveedor_id);
CREATE INDEX IF NOT EXISTS ordenes_creacion_idx    ON ordenes(created_at DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION fn_update_ordenes_updated()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_ordenes_updated ON ordenes;
CREATE TRIGGER trg_ordenes_updated
  BEFORE UPDATE ON ordenes
  FOR EACH ROW EXECUTE FUNCTION fn_update_ordenes_updated();

-- ── 5. ITEMS DE ÓRDENES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS orden_items (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id        text        NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  posicion        integer     NOT NULL DEFAULT 1,
  cantidad        numeric(12,3) NOT NULL DEFAULT 1,
  unidad          text        DEFAULT 'pza',
  nombre          text        NOT NULL,
  descripcion     text,
  marca_modelo    text,
  observaciones   text,
  precio_unitario numeric(14,2) DEFAULT 0,
  importe         numeric(14,2) DEFAULT 0,
  cantidad_recibida numeric(12,3) DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orden_items_orden_idx ON orden_items(orden_id);

-- ── 6. HISTORIAL DE ÓRDENES ─────────────────────────────────
CREATE TABLE IF NOT EXISTS orden_history (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id    text        NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  action      text        NOT NULL,      -- created | submitted | approved | rejected | sent_supplier | received | invoiced | paid | cancelled | commented
  estatus_prev text,
  estatus_new text,
  actor_email text,
  actor_rol   text,
  note        text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orden_history_orden_idx ON orden_history(orden_id);

-- ── 7. NIVELES DE AUTORIZACIÓN ──────────────────────────────
CREATE TABLE IF NOT EXISTS niveles_autorizacion (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nivel           integer     NOT NULL UNIQUE,
  nombre          text        NOT NULL,             -- "Jefe Inmediato", "Compras", "Gerencia", "Dirección"
  monto_hasta     numeric(14,2) NOT NULL DEFAULT 0, -- 0 = sin límite superior
  email           text,
  puesto          text,
  obligatorio     boolean     DEFAULT true,
  activo          boolean     DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

-- Niveles default PT-COMP
INSERT INTO niveles_autorizacion (nivel, nombre, monto_hasta, puesto, obligatorio) VALUES
  (1, 'Jefe Inmediato',          10000.00,  'Jefe de área',              true),
  (2, 'Jefe Compras Nacionales', 30000.00,  'Jefe Compras Nacionales',   true),
  (3, 'Gerencia Administrativa', 100000.00, 'Gerente Administrativo',    true),
  (4, 'Dirección',               0.00,      'Dirección General',         true)
ON CONFLICT (nivel) DO NOTHING;

-- ── 8. APROBACIONES (registro por nivel) ────────────────────
CREATE TABLE IF NOT EXISTS orden_aprobaciones (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id    text        NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  nivel       integer     NOT NULL,
  email       text,
  nombre      text,
  decision    text,                     -- pendiente | aprobada | rechazada
  comentario  text,
  fecha       timestamptz,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (orden_id, nivel)
);

-- ── 9. PRESUPUESTOS DEPARTAMENTALES ─────────────────────────
CREATE TABLE IF NOT EXISTS presupuestos (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  departamento  text        NOT NULL,
  anio          integer     NOT NULL,
  mes           integer     NOT NULL CHECK (mes BETWEEN 1 AND 12),
  monto         numeric(14,2) NOT NULL DEFAULT 0,
  gastado       numeric(14,2) NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (departamento, anio, mes)
);
CREATE INDEX IF NOT EXISTS presupuestos_depto_idx ON presupuestos(departamento, anio, mes);

-- ── 10. DÍAS FESTIVOS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS dias_festivos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha       date        NOT NULL UNIQUE,
  descripcion text        NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- ── 11. SETTINGS COMPRAS (insertar defaults) ────────────────
INSERT INTO settings (key, value) VALUES
  ('COMPRAS_FOLIO_PREFIX',         'OC-UPU-'),
  ('COMPRAS_FOLIO_YEAR',           EXTRACT(YEAR FROM now())::text),
  ('COMPRAS_FOLIO_SEQ',            '0'),
  ('COMPRAS_FOLIO_PAD',            '4'),

  -- Emails de roles institucionales (opcionales)
  ('COMPRAS_EMAIL_COMPRAS',                ''),
  ('COMPRAS_EMAIL_JEFE_COMPRAS_NACIONALES',''),
  ('COMPRAS_EMAIL_GERENTE_ADM',            ''),
  ('COMPRAS_EMAIL_CONTRALORIA',            ''),
  ('COMPRAS_EMAIL_DIRECCION',              ''),
  ('COMPRAS_EMAIL_CONTABILIDAD',           ''),
  ('COMPRAS_EMAIL_ALMACEN',                ''),

  -- Plazos
  ('COMPRAS_PLAZO_RECURRENTE_HABILES',     '5'),
  ('COMPRAS_PLAZO_NORECURRENTE_HABILES',   '10'),
  ('COMPRAS_FACTURA_PLAZO_HRS',            '48'),
  ('COMPRAS_APPROVAL_EXPIRY_HRS',          '72'),

  -- Ventanas por tipo de compra (configurables, no bloqueantes por default)
  ('COMPRAS_VENTANA_RECURRENTE_DIAS_INICIO',     '1'),
  ('COMPRAS_VENTANA_RECURRENTE_DIAS_FIN',        '7'),
  ('COMPRAS_VENTANA_RECURRENTE_PERMITE_FINSEM',  'false'),
  ('COMPRAS_VENTANA_RECURRENTE_VALIDAR',         'false'),
  ('COMPRAS_VENTANA_NO_RECURRENTE_DIAS_INICIO',  '1'),
  ('COMPRAS_VENTANA_NO_RECURRENTE_DIAS_FIN',     '31'),
  ('COMPRAS_VENTANA_NO_RECURRENTE_PERMITE_FINSEM','true'),
  ('COMPRAS_VENTANA_NO_RECURRENTE_VALIDAR',      'false'),
  ('COMPRAS_VENTANA_URGENTE_DIAS_INICIO',        '1'),
  ('COMPRAS_VENTANA_URGENTE_DIAS_FIN',           '31'),
  ('COMPRAS_VENTANA_URGENTE_PERMITE_FINSEM',     'true'),
  ('COMPRAS_VENTANA_URGENTE_VALIDAR',            'false'),

  -- Cotizaciones
  ('COMPRAS_MIN_COTIZACIONES_NORECURRENTE','2'),

  -- Flags
  ('COMPRAS_REGISTRAR_OMITIDAS',           'false'),
  ('COMPRAS_REQUIERE_JUSTIF_URGENTE',      'true'),
  ('COMPRAS_REQUIERE_OBS_REC_FUERA_VENT',  'true'),
  ('COMPRAS_RECURRENTE_AUTOAPROBA',        'false'),
  ('COMPRAS_AUTO_LINK_TICKET',             'true'),

  -- Sanciones
  ('COMPRAS_SANCION_FACTURA_TARDIA',       'La factura excede el plazo de 48 horas posteriores al pago. Se aplicará revisión administrativa.'),

  -- Recordatorios
  ('COMPRAS_REMINDER_DAYS',                '3'),

  -- Branding compras
  ('COMPRAS_BRAND_NOMBRE',                 'Grupo Ultralam'),
  ('COMPRAS_BRAND_COLOR',                  '#F5C400'),
  ('COMPRAS_BRAND_LOGO_URL',               ''),

  -- Retención PDF
  ('COMPRAS_PDF_RETENTION_DAYS',           '365'),

  -- Feature flags emails compras
  ('COMPRAS_FEATURE_EMAIL_OC_TO_PROV',     'true'),
  ('COMPRAS_FEATURE_EMAIL_OC_TO_SOLIC',    'true'),
  ('COMPRAS_FEATURE_EMAIL_OC_TO_APROBADOR','true')
ON CONFLICT (key) DO NOTHING;

-- ── 12. HABILITAR RLS ───────────────────────────────────────
ALTER TABLE proveedores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE orden_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE orden_history        ENABLE ROW LEVEL SECURITY;
ALTER TABLE niveles_autorizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE orden_aprobaciones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE dias_festivos        ENABLE ROW LEVEL SECURITY;

-- ── 13. STORAGE BUCKET PARA OC ──────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'compras-docs',
  'compras-docs',
  true,
  20971520,  -- 20 MB
  ARRAY['application/pdf','image/jpeg','image/png','image/webp',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "compras_docs_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "compras_docs_auth_insert"  ON storage.objects;
DROP POLICY IF EXISTS "compras_docs_auth_delete"  ON storage.objects;

CREATE POLICY "compras_docs_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'compras-docs');

CREATE POLICY "compras_docs_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'compras-docs');

CREATE POLICY "compras_docs_auth_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'compras-docs');

-- ── 14. EXTENSIÓN TICKETS: link a OC ────────────────────────
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS orden_id_relacionada text REFERENCES ordenes(id) ON DELETE SET NULL;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS escala_a_compra boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS tickets_orden_idx ON tickets(orden_id_relacionada);

-- ── 15. FIN ─────────────────────────────────────────────────
