# Portal Ultralam — Helpdesk + Compras

Portal corporativo unificado construido sobre la base del proyecto **Helpdesk Ultralam**. Mantiene todo el flujo de tickets existente y agrega un módulo completo de **Órdenes de Compra** apegado a la normativa **PT-COMP (Política de Compras Nacionales)**.

---

## 📁 Arquitectura

```
A:\Portal\
├── src/
│   ├── app/
│   │   ├── login/           OTP (compartido)
│   │   ├── portal/          Dashboard unificado post-login
│   │   ├── helpdesk/        Vista helpdesk (intacta)
│   │   ├── compras/         🆕 Módulo Compras (form + listado + admin)
│   │   └── api/
│   │       ├── auth/        OTP, sesiones (compartido)
│   │       ├── tickets/     Endpoints tickets (intactos)
│   │       ├── users/       Usuarios + roles_extra
│   │       └── compras/     🆕 ordenes, proveedores, niveles, settings, stats,
│   │                          catalogos, presupuestos, dias-festivos, admin
│   ├── lib/
│   │   ├── auth.ts          OTP + roles ampliados
│   │   ├── email.ts         Nodemailer (OTP, tickets, OC)
│   │   ├── supabase.ts      Cliente Supabase (service role)
│   │   ├── compras.ts       🆕 Helpers compras (folio, ventanas, niveles)
│   │   └── pdf-oc.ts        🆕 Generador PDF con pdf-lib
├── supabase/
│   ├── schema.sql           Schema original helpdesk
│   ├── migrations/
│   │   ├── 001_agent_status_detail.sql
│   │   ├── 002_attachment_retention.sql
│   │   └── 003_compras_module.sql  🆕 Tablas compras
└── netlify/functions/
    ├── purge-attachments-cron.mts   (existente)
    └── purge-pdfs-cron.mts          🆕 Purga PDFs por retención
```

---

## 🚀 Instalación

### 1. Variables de entorno (`.env.local`)
Reutiliza las credenciales del proyecto Helpdesk:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GMAIL_USER=...
GMAIL_APP_PASSWORD=...
EMAIL_FROM=...
NEXT_PUBLIC_APP_NAME=Portal Ultralam
NEXT_PUBLIC_APP_URL=http://localhost:3600
ADMIN_EMAILS=["ruben.ezequiel.estrada@gmail.com"]
INTERNAL_CRON_SECRET=<secreto-cron>
```

### 2. Aplicar migración SQL
En **Supabase Dashboard → SQL Editor**, ejecuta:
```sql
-- supabase/migrations/003_compras_module.sql
```
Esto crea: `proveedores`, `ordenes`, `orden_items`, `orden_history`, `orden_aprobaciones`,
`niveles_autorizacion`, `presupuestos`, `dias_festivos`, settings y catálogos del módulo Compras.
**No toca** las tablas de Helpdesk; sólo agrega columnas (`roles_extra`, `puesto`, etc.) a `users`.

### 3. Dependencias
```bash
npm install
```

### 4. Dev
```bash
npm run dev    # puerto 3600
```

### 5. Build
```bash
npm run build
npm start
```

---

## 👥 Roles del sistema

Todos los usuarios tienen el rol base **USUARIO** y pueden generar tickets y OC.
El admin asigna **roles_extra** (jsonb array) para conceder capacidades adicionales:

| Rol        | Capacidades                                                    |
|------------|---------------------------------------------------------------|
| USUARIO    | Crear/ver sus tickets y sus OC                                 |
| HELPDESK   | Atender tickets de terceros                                    |
| COMPRAS    | Gestionar OC, proveedores, cambiar estatus                     |
| APROBADOR  | Aprobar/rechazar OC en su nivel                                |
| ADMIN      | Todo + configuración global, usuarios, PDFs, presupuestos      |

Un usuario puede tener varios roles extra simultáneamente.
El primer login auto-registra al usuario como USUARIO; el admin asigna extras después.

---

## 🛒 Flujo del módulo Compras (PT-COMP)

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Solicitante crea OC                                        │
│    → /compras → "Nueva OC"                                    │
│    → Empresa, Tipo, Items, Justificación si aplica            │
│    → Estatus inicial: pendiente_aprob (o borrador)            │
│    → Folio: OC-UPU-YYYY-NNNN                                  │
├──────────────────────────────────────────────────────────────┤
│ 2. Sistema asigna nivel inicial por monto                     │
│    ≤ $10k  → Nivel 1 (Jefe Inmediato)                         │
│    ≤ $30k  → Nivel 2 (Jefe Compras Nacionales)                │
│    ≤ $100k → Nivel 3 (Gerencia Adm)                           │
│    > $100k → Nivel 4 (Dirección)                              │
├──────────────────────────────────────────────────────────────┤
│ 3. Aprobadores aprueban/rechazan                              │
│    → Si aprueba y hay nivel superior pendiente → sube         │
│    → Si aprueba y es el último → estatus: aprobada            │
│    → Si rechaza → estatus: rechazada + motivo                 │
├──────────────────────────────────────────────────────────────┤
│ 4. COMPRAS envía OC al proveedor                              │
│    → Genera PDF (pdf-lib) y lo sube a Supabase Storage        │
│    → Envía email con PDF adjunto (Nodemailer)                 │
│    → Estatus: en_compra                                       │
├──────────────────────────────────────────────────────────────┤
│ 5. Recepción / Facturación / Pago                             │
│    → COMPRAS marca recibida → estatus: recibida_total         │
│    → COMPRAS captura factura → estatus: facturada             │
│    → COMPRAS confirma pago → estatus: pagada                  │
├──────────────────────────────────────────────────────────────┤
│ 6. Cierre administrativo → estatus: cerrada                   │
└──────────────────────────────────────────────────────────────┘
```

### Ventanas por tipo de compra (configurables, NO bloqueantes por default)
Admin puede configurar para cada tipo (Recurrente / No recurrente / Urgente):
- Día de inicio / fin del mes
- Permite finde sí/no
- **Validar (bloqueante)**: si `false` (default) sólo es **advisory**, marca la OC como
  `fuera_ventana = true` pero permite crear. Si `true`, bloquea la creación.

### Justificación
- Obligatoria para `No recurrente` y `Urgente` (si flag `REQUIERE_JUSTIF_URGENTE = true`).
- Solicitante captura en formulario; aparece dinámicamente al elegir el tipo.

---

## 🎫 Helpdesk → Compras

Cuando un ticket de soporte requiere generar una OC (insumos, mantenimiento), el
agente HELPDESK puede crear una OC referenciando el ticket vía `ticket_id_origen`.
La OC se enlaza automáticamente al ticket (`tickets.orden_id_relacionada`).
COMPRAS sólo ve OC que provienen de Helpdesk (PT-COMP punto 5.1/5.2), no los tickets directos.

---

## 📄 Generación de PDF

- Librería: **`pdf-lib`** (genera PDF real, no HTML), serverless-friendly.
- Plantilla replica el documento de la organización: header amarillo, datos solicitante,
  empresa (Ultralam/Productora/Home), clasificación, items en tabla, totales, autorizaciones
  por nivel, footer.
- Almacenamiento: bucket público `compras-docs` en Supabase Storage, path `oc/<folio>.pdf`.
- Acciones:
  - **Generar/descargar:** `GET /api/compras/ordenes/<id>/pdf?download=1`
  - **Regenerar:** `?regenerar=1`
  - **Enviar por email con PDF adjunto:** `POST /api/compras/ordenes/<id>/enviar`
- **Retención configurable** (`COMPRAS_PDF_RETENTION_DAYS`, default 365 días).
- Admin puede listar/descargar/eliminar PDFs desde `/compras` → tab Administración → "Gestión PDFs".
- Purga automática diaria vía Netlify scheduled function (`purge-pdfs-cron.mts` a las 04:00 CDMX).

---

## ⚙️ Endpoints principales (API)

### Compras
```
GET    /api/compras/ordenes                  Listar (filtrado por permisos)
POST   /api/compras/ordenes                  Crear OC
GET    /api/compras/ordenes/{id}             Detalle + items + history + aprobaciones
PATCH  /api/compras/ordenes/{id}             Update (estatus, factura, pago)
DELETE /api/compras/ordenes/{id}             Eliminar (admin o solicitante en borrador)
POST   /api/compras/ordenes/{id}/aprobar     Aprobar nivel actual
POST   /api/compras/ordenes/{id}/rechazar    Rechazar con motivo
GET    /api/compras/ordenes/{id}/pdf         Generar/descargar PDF
DELETE /api/compras/ordenes/{id}/pdf         Eliminar PDF
POST   /api/compras/ordenes/{id}/enviar      Email a proveedor con PDF

GET    /api/compras/proveedores              Listar
POST   /api/compras/proveedores              Crear/actualizar
DELETE /api/compras/proveedores?id=          Soft delete (hard=1 admin)

GET    /api/compras/niveles                  Listar
POST   /api/compras/niveles                  Crear/actualizar
DELETE /api/compras/niveles?nivel=           Eliminar

GET    /api/compras/settings                 Leer todos los settings
POST   /api/compras/settings                 Actualizar settings

GET    /api/compras/catalogos                empresas, deptos, unidades, etc.
POST   /api/compras/catalogos                Actualizar un catálogo

GET    /api/compras/stats                    Métricas
GET    /api/compras/dashboard                Datos consolidados (portal)
GET    /api/compras/presupuestos             Presupuestos depto/mes
POST   /api/compras/presupuestos             Crear/actualizar
GET    /api/compras/dias-festivos            Listar
POST/DELETE /api/compras/dias-festivos       CRUD

GET    /api/compras/admin/pdfs               Listar PDFs del storage
DELETE /api/compras/admin/pdfs?filename=     Eliminar PDF
POST   /api/compras/admin/purge-pdfs         Purga por retención
GET    /api/compras/admin/purge-pdfs         Vista previa de purga
```

### Helpdesk (intacto)
Todos los endpoints originales de tickets, kb, branding, etc.

### Auth + Users
```
POST /api/auth/send-otp
POST /api/auth/verify-otp
POST /api/auth/resume
GET  /api/users/me              Mi perfil + roles_extra
PATCH /api/users/me             Editar mi perfil (nombre, puesto, depto, tel)
GET  /api/users                 Listar usuarios (admin)
PATCH /api/users/{id}           Editar usuario + asignar roles_extra (admin)
```

---

## 🔐 Permisos resumidos

| Acción                        | USUARIO | HELPDESK | COMPRAS | APROBADOR | ADMIN |
|-------------------------------|:-------:|:--------:|:-------:|:---------:|:-----:|
| Crear OC                      | ✅      | ✅       | ✅      | ✅        | ✅    |
| Ver sólo MIS OC               | ✅      | ✅       |         |           |       |
| Ver TODAS las OC              |         |          | ✅      | ✅        | ✅    |
| Aprobar/rechazar OC           |         |          | ✅      | ✅        | ✅    |
| Cambiar estatus/marcar pagada |         |          | ✅      |           | ✅    |
| Gestión proveedores           |         |          | ✅      |           | ✅    |
| Gestión niveles aprobación    |         |          |         |           | ✅    |
| Settings, usuarios, PDFs      |         |          |         |           | ✅    |
| Crear ticket                  | ✅      | ✅       | ✅      | ✅        | ✅    |
| Atender tickets               |         | ✅       |         |           | ✅    |

---

## 🧪 Validaciones advisory vs bloqueantes

Por filosofía PT-COMP el sistema **NO bloquea** validaciones — sólo advierte y deja
a COMPRAS decidir. Excepciones:
- Justificación obligatoria para no_recurrente / urgente (configurable, flag).
- Ventana de envío (configurable, flag `VALIDAR` por tipo, default `false`).

OC fuera de ventana se marca `fuera_ventana = true` y prefija observaciones con
`[FUERA DE VENTANA — REVISAR]` para visibilidad de COMPRAS, pero se crea normalmente.

---

## 📦 Deploy (Netlify)

1. Conecta repo Git al sitio Netlify.
2. Build command: `npm run build`
3. Publish directory: `.next`
4. Environment variables: copia las del `.env.local`.
5. Scheduled functions activas:
   - `purge-attachments-cron` (08:00 UTC) — limpia evidencias tickets
   - `purge-pdfs-cron` (09:00 UTC) — limpia PDFs OC antiguos

---

## 🔄 Migración de datos legacy

El sistema inicia **limpio**:
- Los usuarios se auto-registran al primer login (rol USUARIO).
- Admin asigna roles_extra después del primer ingreso.
- Los catálogos (empresas, departamentos, unidades, categorías, tipos, estatus)
  se siembran automáticamente con la migración 003.
- Niveles de autorización default según PT-COMP se cargan también.
- Sin migración de OC históricas del sistema Apps Script previo.

---

## 📊 Tabla resumen — Apps Script vs Portal Web

| Apps Script (anterior)         | Portal Web (nuevo)                                |
|--------------------------------|--------------------------------------------------|
| Google Sheets (datos)          | Supabase PostgreSQL                              |
| Google Drive (PDFs)            | Supabase Storage (bucket compras-docs)           |
| MailApp                        | Nodemailer (Gmail SMTP)                          |
| Triggers (recordatorios)       | Netlify scheduled functions + pg_cron opcional   |
| Form.html (single page)        | /portal, /compras, /helpdesk (Next.js)           |
| onEdit + onChange triggers     | Endpoints REST + Supabase realtime opcional      |
| Apps Script CONFIG global      | settings table + .env.local                      |

Todo el flujo PT-COMP (secciones 5-14) se preserva con los mismos checks,
solo movido a un stack web profesional con UI moderna.
