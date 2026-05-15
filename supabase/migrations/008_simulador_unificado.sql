-- ──────────────────────────────────────────────────────────────
-- Migración 008 — Unificar Simulador 3D al Supabase del Portal
-- Crea la tabla simulator_settings (key/value) para que el simulador
-- guarde su configuración, catálogos de productos y vehículos.
-- Los usuarios del simulador ahora se gestionan desde la tabla 'users'
-- del Portal (admin = users.rol='ADMIN' o 'ADMIN' en roles_extra).
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS simulator_settings (
  key         text PRIMARY KEY,
  value       jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text
);

CREATE INDEX IF NOT EXISTS idx_simulator_settings_updated ON simulator_settings(updated_at DESC);

-- Trigger updated_at
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_simulator_settings_updated_at') THEN
    CREATE TRIGGER trg_simulator_settings_updated_at
      BEFORE UPDATE ON simulator_settings
      FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
  END IF;
END $$;

-- Seeds: catálogo y vehículos por defecto se sembrarán al primer
-- acceso de un admin desde el simulador.

-- Activar el feature flag (por si la migración 007 no se ejecutó)
INSERT INTO feature_flags (clave, valor, descripcion, categoria)
VALUES ('SIMULADOR_HABILITADO', true, 'Acceso al Simulador 3D de Carga', 'global')
ON CONFLICT (clave) DO UPDATE SET valor = true, updated_at = now();
