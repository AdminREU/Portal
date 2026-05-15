-- ──────────────────────────────────────────────────────────────
-- Migración 007 — Habilitar Simulador 3D
-- El simulador ya está integrado al Portal en /simulador y se sirve
-- desde /sim/index.html. Cambia el flag a TRUE.
-- ──────────────────────────────────────────────────────────────

UPDATE feature_flags
SET valor = true, updated_at = now()
WHERE clave = 'SIMULADOR_HABILITADO';

-- Si por alguna razón no existe el flag (instalaciones nuevas), insertarlo
INSERT INTO feature_flags (clave, valor, descripcion, categoria)
VALUES ('SIMULADOR_HABILITADO', true, 'Acceso al Simulador 3D de Carga', 'global')
ON CONFLICT (clave) DO NOTHING;
