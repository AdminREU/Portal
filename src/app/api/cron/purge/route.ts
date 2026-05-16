import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * Endpoint para Vercel Cron Jobs.
 * Combina las dos tareas de mantenimiento en una sola ejecución diaria:
 * - Purga de evidencias de tickets antiguos (storage)
 * - Purga de PDFs de OC por retención (storage)
 *
 * Vercel Hobby permite 1 cron por día. Si necesitas separarlos por horario
 * más fino, puedes upgradear a Pro (cron por minuto).
 *
 * Seguridad: Vercel Cron envía un header 'Authorization: Bearer <CRON_SECRET>'
 * automático. También aceptamos INTERNAL_CRON_SECRET por compatibilidad.
 */
export async function GET(req: Request) {
  return run(req)
}
export async function POST(req: Request) {
  return run(req)
}

async function run(req: Request) {
  const authHeader = req.headers.get('authorization') || ''
  const cronSecret = process.env.CRON_SECRET || process.env.INTERNAL_CRON_SECRET || ''
  // Vercel Cron añade `Authorization: Bearer ${CRON_SECRET}` si está definido el env var
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET no configurado' }, { status: 500 })
  }
  if (authHeader !== `Bearer ${cronSecret}` && req.headers.get('x-cron-secret') !== cronSecret) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  const results: any = { started_at: new Date().toISOString() }

  try {
    // ── 1. PURGA EVIDENCIAS DE TICKETS ──────────────────────────────
    // Lee retentionDays de settings y borra evidencias de tickets antiguos.
    const { data: cfg } = await supabase.from('settings').select('key,value').in('key', ['ATTACHMENT_RETENTION_DAYS', 'TICKET_PURGE_AFTER_RESOLVED_DAYS'])
    const cfgMap = Object.fromEntries((cfg || []).map(r => [r.key, r.value]))
    const retentionDays = parseInt(cfgMap.ATTACHMENT_RETENTION_DAYS || '90')
    const cutoff = new Date(Date.now() - retentionDays * 86400000).toISOString()

    // Tickets cerrados/resueltos hace más de N días
    const { data: oldTickets } = await supabase
      .from('tickets')
      .select('id, evidencias_json')
      .in('estado', ['cerrado', 'resuelto'])
      .lt('fecha_actualizacion', cutoff)

    let removedFiles = 0
    let processedTickets = 0
    for (const t of (oldTickets || [])) {
      processedTickets++
      const evidencias = Array.isArray(t.evidencias_json) ? t.evidencias_json : []
      if (!evidencias.length) continue
      const paths: string[] = evidencias.map((e: any) => e.path).filter(Boolean)
      if (paths.length) {
        const { error } = await supabase.storage.from('evidencias').remove(paths)
        if (!error) removedFiles += paths.length
      }
      await supabase.from('tickets').update({ evidencias_json: [] }).eq('id', t.id)
    }
    results.tickets = { processedTickets, removedFiles, cutoff }
  } catch (e: any) {
    results.tickets = { error: e.message }
  }

  try {
    // ── 2. PURGA PDFs DE OC ─────────────────────────────────────────
    const { data: cfg } = await supabase.from('settings').select('value').eq('key', 'COMPRAS_PDF_RETENTION_DAYS').maybeSingle()
    const retentionDays = parseInt(cfg?.value || '365')
    const cutoff = new Date(Date.now() - retentionDays * 86400000).toISOString()

    const { data: oldOrders } = await supabase
      .from('ordenes')
      .select('id, pdf_filename, pdf_generated_at')
      .not('pdf_filename', 'is', null)
      .lt('pdf_generated_at', cutoff)

    let removedPDFs = 0
    for (const o of (oldOrders || [])) {
      if (!o.pdf_filename) continue
      const { error } = await supabase.storage.from('compras-docs').remove([`oc/${o.pdf_filename}`])
      if (!error) {
        removedPDFs++
        await supabase.from('ordenes').update({ pdf_url: null, pdf_filename: null, pdf_generated_at: null }).eq('id', o.id)
      }
    }
    results.pdfs = { removedPDFs, cutoff, retentionDays }
  } catch (e: any) {
    results.pdfs = { error: e.message }
  }

  results.finished_at = new Date().toISOString()
  return NextResponse.json({ ok: true, ...results })
}
