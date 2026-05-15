import { NextResponse } from 'next/server'
import { validateToken, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getComprasSettingNum } from '@/lib/compras'

async function isAuthorized(req: Request): Promise<boolean> {
  const cronSecret = req.headers.get('x-cron-secret')
  if (cronSecret && cronSecret === process.env.INTERNAL_CRON_SECRET) return true
  try {
    const u = await validateToken(getToken(req))
    return u.rol === 'ADMIN' || (Array.isArray(u.rolesExtra) && u.rolesExtra.includes('ADMIN'))
  } catch {
    return false
  }
}

// POST — eliminar PDFs antiguos según retención configurada
export async function POST(req: Request) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }
  try {
    const days = await getComprasSettingNum('COMPRAS_PDF_RETENTION_DAYS', 365)
    const cutoffISO = new Date(Date.now() - days * 86400000).toISOString()

    const { data: viejas } = await supabase.from('ordenes')
      .select('id,pdf_filename,pdf_generated_at')
      .lt('pdf_generated_at', cutoffISO)
      .not('pdf_filename', 'is', null)

    let deleted = 0
    for (const o of viejas || []) {
      if (!o.pdf_filename) continue
      await supabase.storage.from('compras-docs').remove([`oc/${o.pdf_filename}`])
      await supabase.from('ordenes').update({ pdf_url: null, pdf_filename: null, pdf_generated_at: null }).eq('id', o.id)
      deleted++
    }

    await supabase.from('settings').upsert({ key: 'COMPRAS_LAST_PURGE_AT', value: new Date().toISOString() }, { onConflict: 'key' })
    await supabase.from('settings').upsert({ key: 'COMPRAS_LAST_PURGE_STATS', value: JSON.stringify({ deleted, days }) }, { onConflict: 'key' })

    return NextResponse.json({ ok: true, deleted, days, cutoff: cutoffISO })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

// GET — vista previa: cuántos PDFs se purgarían sin ejecutar
export async function GET(req: Request) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }
  try {
    const days = await getComprasSettingNum('COMPRAS_PDF_RETENTION_DAYS', 365)
    const cutoffISO = new Date(Date.now() - days * 86400000).toISOString()
    const { count } = await supabase.from('ordenes')
      .select('id', { count: 'exact', head: true })
      .lt('pdf_generated_at', cutoffISO)
      .not('pdf_filename', 'is', null)
    return NextResponse.json({ ok: true, retentionDays: days, pendingPdfs: count || 0, cutoff: cutoffISO })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
