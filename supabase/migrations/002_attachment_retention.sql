-- ============================================================
-- Migración 002 — Configuración de retención de adjuntos
-- ============================================================

INSERT INTO settings (key, value) VALUES
  ('ATTACHMENT_RETENTION_DAYS', '90'),         -- días antes de purgar
  ('PURGE_STATES',              'cerrado'),    -- estados que se purgan (csv)
  ('LAST_PURGE_AT',             ''),           -- fecha última ejecución
  ('LAST_PURGE_STATS',          '')            -- json con stats último run
ON CONFLICT (key) DO NOTHING;
