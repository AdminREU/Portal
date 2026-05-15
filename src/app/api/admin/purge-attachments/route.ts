import { NextResponse } from 'next/server'
import { validateToken, requireRoles, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

interface Evidencia {
  name?: string
  path?: string
  url?: string
  uploadedBy?: string
  uploadedAt?: string
  purged?: boolean
  purgedAt?: string
}

async function isAuthorized(req: Request): Promise<boolean> {
  // Permite acceso por token de admin o por secreto de cron interno
  const cronSecret = req.headers.get('x-cron-secret')
  if (cronSecret && cronSecret === process.env.INTERNAL_CRON_SECRET) return true
  try {
    const { rol } = await validateToken(getToken(req))
    return rol === 'ADMIN'
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    // Leer config de retención
    const { data: settings } = await supabase
      .from('settings')
      .select('key,value')
      .in('key', ['ATTACHMENT_RETENTION_DAYS', 'PURGE_STATES'])
    const cfg = Object.fromEntries((settings ?? []).map((s: any) => [s.key, s.value]))
    const retentionDays = parseInt(cfg.ATTACHMENT_RETENTION_DAYS ?? '90')
    const purgeStates = (cfg.PURGE_STATES ?? 'cerrado').split(',').map((s: string) => s.trim())

    const cutoffIso = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()

    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('id, evidencias_json, fecha_actualizacion, estado')
      .in('estado', purgeStates)
      .lt('fecha_actualizacion', cutoffIso)
    if (error) throw new Error(error.message)

    let filesDeleted = 0
    let ticketsAffected = 0
    let storageBytesEstimate = 0
    const failedPaths: string[] = []
    const now = new Date().toISOString()

    for (const ticket of tickets ?? []) {
      const evs: Evidencia[] = Array.isArray(ticket.evidencias_json) ? ticket.evidencias_json : []
      const live = evs.filter(e => !e.purged && e.path)
      if (live.length === 0) continue

      const paths = live.map(e => e.path!) as string[]
      const { error: rmErr } = await supabase.storage.from('evidencias').remove(paths)
      if (rmErr) {
        failedPaths.push(...paths)
        continue
      }

      const updated = evs.map(e =>
        e.purged ? e : {
          name: e.name,
          uploadedAt: e.uploadedAt,
          uploadedBy: e.uploadedBy,
          purged: true,
          purgedAt: now,
        }
      )
      await supabase.from('tickets').update({ evidencias_json: updated }).eq('id', ticket.id)

      filesDeleted += live.length
      ticketsAffected += 1
      storageBytesEstimate += live.length * 500_000 // estimado 500KB/archivo
    }

    await supabase.from('settings').upsert(
      { key: 'LAST_PURGE_AT', value: now },
      { onConflict: 'key' }
    )
    await supabase.from('settings').upsert(
      { key: 'LAST_PURGE_STATS', value: JSON.stringify({ filesDeleted, ticketsAffected, retentionDays }) },
      { onConflict: 'key' }
    )

    return NextResponse.json({
      ok: true,
      retentionDays,
      ticketsAffected,
      filesDeleted,
      estimatedBytesFreed: storageBytesEstimate,
      failedPaths,
      runAt: now,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

// Vista previa — cuántos tickets/archivos se purgarían sin ejecutar
export async function GET(req: Request) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { data: settings } = await supabase
      .from('settings')
      .select('key,value')
      .in('key', ['ATTACHMENT_RETENTION_DAYS', 'PURGE_STATES', 'LAST_PURGE_AT', 'LAST_PURGE_STATS'])
    const cfg = Object.fromEntries((settings ?? []).map((s: any) => [s.key, s.value]))
    const retentionDays = parseInt(cfg.ATTACHMENT_RETENTION_DAYS ?? '90')
    const purgeStates = (cfg.PURGE_STATES ?? 'cerrado').split(',').map((s: string) => s.trim())
    const cutoffIso = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()

    const { data: tickets } = await supabase
      .from('tickets')
      .select('id, evidencias_json')
      .in('estado', purgeStates)
      .lt('fecha_actualizacion', cutoffIso)

    let pendingFiles = 0
    let pendingTickets = 0
    for (const t of tickets ?? []) {
      const evs: Evidencia[] = Array.isArray(t.evidencias_json) ? t.evidencias_json : []
      const live = evs.filter(e => !e.purged && e.path)
      if (live.length > 0) {
        pendingFiles += live.length
        pendingTickets += 1
      }
    }

    let lastStats: any = null
    try { lastStats = cfg.LAST_PURGE_STATS ? JSON.parse(cfg.LAST_PURGE_STATS) : null } catch { lastStats = null }

    return NextResponse.json({
      ok: true,
      retentionDays,
      purgeStates,
      pendingTickets,
      pendingFiles,
      lastPurgeAt: cfg.LAST_PURGE_AT ?? null,
      lastPurgeStats: lastStats,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
