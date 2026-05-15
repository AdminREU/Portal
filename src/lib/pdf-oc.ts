/**
 * ============================================================
 * pdf-oc.ts — Generador PDF de Orden de Compra (pdf-lib)
 * ============================================================
 * Genera un PDF tipo "Orden de Compra OC-UPU" con la estructura
 * definida en el documento de la organización.
 */
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib'
import { supabase } from './supabase'
import { getComprasSetting } from './compras'

export type OCData = {
  id: string
  folio_seq: number
  solicitante_email: string
  solicitante_nombre?: string
  solicitante_puesto?: string
  solicitante_depto?: string
  solicitante_tel?: string
  empresa: string
  tipo_compra: string
  categoria?: string
  justificacion?: string
  observaciones?: string
  proveedor_rfc?: string
  proveedor_razon?: string
  subtotal: number
  iva: number
  total: number
  moneda?: string
  estatus: string
  aprobador_email?: string
  aprobador_nombre?: string
  fecha_aprobacion?: string
  created_at: string
  items: Array<{
    posicion: number
    cantidad: number
    unidad: string
    nombre: string
    descripcion?: string
    marca_modelo?: string
    observaciones?: string
    precio_unitario?: number
    importe?: number
  }>
  niveles?: Array<{
    nivel: number
    nombre: string
    email?: string
    decision?: string
    comentario?: string
    fecha?: string
  }>
}

const COLOR_PRIMARY = rgb(0.96, 0.77, 0.0)   // #F5C400
const COLOR_DARK    = rgb(0.1, 0.1, 0.1)
const COLOR_GRAY    = rgb(0.45, 0.45, 0.45)
const COLOR_LIGHT   = rgb(0.93, 0.93, 0.93)
const COLOR_BG_HEAD = rgb(0.98, 0.92, 0.6)

const fmtMoney = (n: number, mon: string = 'MXN') =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: mon }).format(n || 0)

const fmtDate = (s?: string) => {
  if (!s) return '—'
  try { return new Date(s).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return s }
}

const labelEmpresa = (e: string) => {
  const m: Record<string, string> = { ultralam: 'Ultralam', productora: 'Productora', home: 'Home' }
  return m[e] || e
}

const labelTipo = (t: string) => {
  const m: Record<string, string> = { recurrente: 'Recurrente', no_recurrente: 'No recurrente', urgente: 'Urgente' }
  return m[t] || t
}

const labelEstatus = (e: string) => {
  const m: Record<string, string> = {
    borrador: 'Borrador', pendiente_aprob: 'Pendiente de aprobación', aprobada: 'Aprobada',
    rechazada: 'Rechazada', en_compra: 'En proceso de compra', en_transito: 'En tránsito',
    recibida_parcial: 'Recibida parcial', recibida_total: 'Recibida total',
    facturada: 'Facturada', pagada: 'Pagada', cerrada: 'Cerrada', cancelada: 'Cancelada',
  }
  return m[e] || e
}

function drawText(page: PDFPage, text: string, x: number, y: number, size: number, font: PDFFont, color = COLOR_DARK) {
  page.drawText(String(text || ''), { x, y, size, font, color })
}

function drawBox(page: PDFPage, x: number, y: number, w: number, h: number, color = COLOR_LIGHT) {
  page.drawRectangle({ x, y, width: w, height: h, color, borderColor: COLOR_GRAY, borderWidth: 0.5 })
}

function wrapText(text: string, maxChars: number): string[] {
  if (!text) return ['']
  const words = String(text).split(/\s+/)
  const out: string[] = []
  let line = ''
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars) {
      if (line) out.push(line)
      line = w
    } else {
      line = (line + ' ' + w).trim()
    }
  }
  if (line) out.push(line)
  return out
}

export async function generarPdfOC(oc: OCData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const helv = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helvB = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const brandNombre = await getComprasSetting('COMPRAS_BRAND_NOMBRE', 'Grupo Ultralam')

  let page = pdfDoc.addPage([595, 842]) // A4
  const W = 595, H = 842
  const M = 40 // margin

  // ─── Header ──────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: H - 80, width: W, height: 80, color: COLOR_PRIMARY })
  drawText(page, 'ORDEN DE COMPRA', M, H - 35, 18, helvB)
  drawText(page, brandNombre, M, H - 55, 11, helv, COLOR_DARK)
  drawText(page, `Folio: ${oc.id}`, W - M - 180, H - 35, 12, helvB)
  drawText(page, `Fecha: ${fmtDate(oc.created_at)}`, W - M - 180, H - 52, 10, helv)
  drawText(page, `Estatus: ${labelEstatus(oc.estatus)}`, W - M - 180, H - 67, 10, helv)

  let y = H - 110

  // ─── Datos del solicitante ───────────────────────────────
  drawText(page, 'DATOS DEL SOLICITANTE', M, y, 11, helvB, COLOR_PRIMARY)
  y -= 4
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: COLOR_GRAY })
  y -= 18

  drawText(page, 'Nombre:', M, y, 9, helvB, COLOR_GRAY)
  drawText(page, oc.solicitante_nombre || oc.solicitante_email, M + 60, y, 10, helv)
  drawText(page, 'Puesto:', M + 280, y, 9, helvB, COLOR_GRAY)
  drawText(page, oc.solicitante_puesto || '—', M + 320, y, 10, helv)
  y -= 14

  drawText(page, 'Depto:', M, y, 9, helvB, COLOR_GRAY)
  drawText(page, oc.solicitante_depto || '—', M + 60, y, 10, helv)
  drawText(page, 'Email:', M + 280, y, 9, helvB, COLOR_GRAY)
  drawText(page, oc.solicitante_email, M + 320, y, 10, helv)
  y -= 14

  drawText(page, 'Tel:', M, y, 9, helvB, COLOR_GRAY)
  drawText(page, oc.solicitante_tel || '—', M + 60, y, 10, helv)
  drawText(page, 'Empresa:', M + 280, y, 9, helvB, COLOR_GRAY)
  drawText(page, labelEmpresa(oc.empresa), M + 320, y, 10, helvB, COLOR_PRIMARY)
  y -= 20

  // ─── Clasificación ──────────────────────────────────────
  drawText(page, 'CLASIFICACIÓN', M, y, 11, helvB, COLOR_PRIMARY)
  y -= 4
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: COLOR_GRAY })
  y -= 18

  drawText(page, 'Tipo:', M, y, 9, helvB, COLOR_GRAY)
  drawText(page, labelTipo(oc.tipo_compra), M + 60, y, 10, helv)
  drawText(page, 'Categoría:', M + 280, y, 9, helvB, COLOR_GRAY)
  drawText(page, oc.categoria || '—', M + 330, y, 10, helv)
  y -= 16

  if (oc.justificacion) {
    drawText(page, 'Justificación:', M, y, 9, helvB, COLOR_GRAY)
    y -= 12
    const lines = wrapText(oc.justificacion, 95)
    for (const ln of lines.slice(0, 4)) {
      drawText(page, ln, M, y, 9, helv)
      y -= 11
    }
    y -= 6
  }

  // ─── Proveedor ───────────────────────────────────────────
  if (oc.proveedor_razon || oc.proveedor_rfc) {
    drawText(page, 'PROVEEDOR SUGERIDO', M, y, 11, helvB, COLOR_PRIMARY)
    y -= 4
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: COLOR_GRAY })
    y -= 18
    drawText(page, 'Razón social:', M, y, 9, helvB, COLOR_GRAY)
    drawText(page, oc.proveedor_razon || '—', M + 80, y, 10, helv)
    drawText(page, 'RFC:', M + 350, y, 9, helvB, COLOR_GRAY)
    drawText(page, oc.proveedor_rfc || '—', M + 380, y, 10, helv)
    y -= 20
  }

  // ─── Items ───────────────────────────────────────────────
  drawText(page, 'DETALLE DE LA SOLICITUD', M, y, 11, helvB, COLOR_PRIMARY)
  y -= 4
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: COLOR_GRAY })
  y -= 16

  // Tabla header
  const colX  = [M, M + 35, M + 75, M + 200, M + 330, M + 410, M + 480]
  const colW  = [35, 40, 125, 130, 80, 70, 35]
  const colHd = ['#', 'Cant', 'Nombre', 'Descripción/Especif.', 'Marca/Modelo', 'P. Unit.', 'Imp.']
  page.drawRectangle({ x: M, y: y - 4, width: W - 2 * M, height: 16, color: COLOR_BG_HEAD })
  for (let i = 0; i < colHd.length; i++) {
    drawText(page, colHd[i], colX[i] + 2, y, 8, helvB)
  }
  y -= 18

  for (const it of (oc.items || [])) {
    if (y < 120) {
      // Salto de página si quedan menos de 120 pts
      page = pdfDoc.addPage([W, H])
      y = H - 50
      drawText(page, `Continuación — ${oc.id}`, M, y, 10, helvB, COLOR_GRAY)
      y -= 20
    }
    const desc = wrapText(it.descripcion || '', 32)
    const nom = wrapText(it.nombre || '', 28)
    const rows = Math.max(nom.length, desc.length, 1)
    const rowH = rows * 11 + 4
    page.drawRectangle({ x: M, y: y - rowH + 11, width: W - 2 * M, height: rowH, borderColor: COLOR_LIGHT, borderWidth: 0.5 })
    drawText(page, String(it.posicion ?? ''), colX[0] + 2, y, 8, helv)
    drawText(page, `${it.cantidad} ${it.unidad}`, colX[1] + 2, y, 8, helv)
    for (let i = 0; i < nom.length; i++) drawText(page, nom[i], colX[2] + 2, y - i * 11, 8, helv)
    for (let i = 0; i < desc.length; i++) drawText(page, desc[i], colX[3] + 2, y - i * 11, 8, helv)
    drawText(page, it.marca_modelo || '—', colX[4] + 2, y, 8, helv)
    drawText(page, fmtMoney(it.precio_unitario || 0, oc.moneda), colX[5] + 2, y, 8, helv)
    drawText(page, fmtMoney(it.importe || 0, oc.moneda), colX[6] + 2, y, 8, helv)
    y -= rowH + 2
  }

  y -= 6

  // ─── Totales ─────────────────────────────────────────────
  if (y < 130) { page = pdfDoc.addPage([W, H]); y = H - 50 }
  const totX = W - M - 180
  drawText(page, 'Subtotal:',  totX, y, 10, helv,  COLOR_GRAY); drawText(page, fmtMoney(oc.subtotal, oc.moneda), totX + 100, y, 10, helv); y -= 14
  drawText(page, 'IVA (16%):', totX, y, 10, helv,  COLOR_GRAY); drawText(page, fmtMoney(oc.iva, oc.moneda),       totX + 100, y, 10, helv); y -= 14
  drawText(page, 'TOTAL:',     totX, y, 11, helvB, COLOR_DARK); drawText(page, fmtMoney(oc.total, oc.moneda),     totX + 100, y, 11, helvB, COLOR_PRIMARY); y -= 22

  // ─── Observaciones ──────────────────────────────────────
  if (oc.observaciones) {
    if (y < 100) { page = pdfDoc.addPage([W, H]); y = H - 50 }
    drawText(page, 'OBSERVACIONES', M, y, 11, helvB, COLOR_PRIMARY); y -= 14
    const lines = wrapText(oc.observaciones, 100)
    for (const ln of lines.slice(0, 6)) { drawText(page, ln, M, y, 9, helv); y -= 11 }
    y -= 6
  }

  // ─── Autorizaciones ─────────────────────────────────────
  if (y < 130) { page = pdfDoc.addPage([W, H]); y = H - 50 }
  drawText(page, 'AUTORIZACIONES', M, y, 11, helvB, COLOR_PRIMARY)
  y -= 4
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: COLOR_GRAY })
  y -= 16

  const niveles = oc.niveles || []
  const boxW = (W - 2 * M - 20) / Math.max(niveles.length, 1)
  const niv = niveles.length ? niveles : [{ nivel: 1, nombre: 'Aprobación' }]
  for (let i = 0; i < niv.length; i++) {
    const n = niv[i]
    const x = M + i * (boxW + (20 / Math.max(niv.length - 1, 1)))
    drawBox(page, x, y - 60, boxW - 4, 60, rgb(0.98, 0.98, 0.98))
    drawText(page, `Nivel ${n.nivel}`, x + 4, y - 12, 8, helvB, COLOR_GRAY)
    drawText(page, n.nombre || '', x + 4, y - 24, 9, helvB)
    drawText(page, n.email || '—', x + 4, y - 36, 7, helv, COLOR_GRAY)
    const dec = (n as any).decision || 'pendiente'
    const color = dec === 'aprobada' ? rgb(0.06, 0.7, 0.4) : dec === 'rechazada' ? rgb(0.85, 0.2, 0.2) : COLOR_GRAY
    drawText(page, dec.toUpperCase(), x + 4, y - 50, 8, helvB, color)
  }
  y -= 80

  // ─── Footer ──────────────────────────────────────────────
  drawText(page, `${brandNombre} — Documento generado automáticamente · ${new Date().toLocaleString('es-MX')}`,
    M, 30, 7, helv, COLOR_GRAY)

  return await pdfDoc.save()
}

/**
 * Sube el PDF generado a Supabase Storage y devuelve URL pública.
 */
export async function subirPdfOC(folio: string, pdfBytes: Uint8Array): Promise<{ url: string; path: string }> {
  const path = `oc/${folio}.pdf`
  const { error } = await supabase.storage.from('compras-docs')
    .upload(path, pdfBytes as any, { contentType: 'application/pdf', upsert: true })
  if (error) throw new Error(`Error subiendo PDF: ${error.message}`)
  const { data: pub } = supabase.storage.from('compras-docs').getPublicUrl(path)
  return { url: pub.publicUrl, path }
}
