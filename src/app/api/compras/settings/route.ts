import { NextResponse } from 'next/server'
import { validateToken, getToken, requireRoles } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

const KEYS = [
  'COMPRAS_FOLIO_PREFIX','COMPRAS_FOLIO_YEAR','COMPRAS_FOLIO_SEQ','COMPRAS_FOLIO_PAD',
  'COMPRAS_EMAIL_COMPRAS','COMPRAS_EMAIL_JEFE_COMPRAS_NACIONALES','COMPRAS_EMAIL_GERENTE_ADM',
  'COMPRAS_EMAIL_CONTRALORIA','COMPRAS_EMAIL_DIRECCION','COMPRAS_EMAIL_CONTABILIDAD','COMPRAS_EMAIL_ALMACEN',
  'COMPRAS_PLAZO_RECURRENTE_HABILES','COMPRAS_PLAZO_NORECURRENTE_HABILES','COMPRAS_FACTURA_PLAZO_HRS','COMPRAS_APPROVAL_EXPIRY_HRS',
  'COMPRAS_VENTANA_RECURRENTE_DIAS_INICIO','COMPRAS_VENTANA_RECURRENTE_DIAS_FIN','COMPRAS_VENTANA_RECURRENTE_PERMITE_FINSEM','COMPRAS_VENTANA_RECURRENTE_VALIDAR',
  'COMPRAS_VENTANA_NO_RECURRENTE_DIAS_INICIO','COMPRAS_VENTANA_NO_RECURRENTE_DIAS_FIN','COMPRAS_VENTANA_NO_RECURRENTE_PERMITE_FINSEM','COMPRAS_VENTANA_NO_RECURRENTE_VALIDAR',
  'COMPRAS_VENTANA_URGENTE_DIAS_INICIO','COMPRAS_VENTANA_URGENTE_DIAS_FIN','COMPRAS_VENTANA_URGENTE_PERMITE_FINSEM','COMPRAS_VENTANA_URGENTE_VALIDAR',
  'COMPRAS_MIN_COTIZACIONES_NORECURRENTE','COMPRAS_REGISTRAR_OMITIDAS','COMPRAS_REQUIERE_JUSTIF_URGENTE',
  'COMPRAS_REQUIERE_OBS_REC_FUERA_VENT','COMPRAS_RECURRENTE_AUTOAPROBA','COMPRAS_AUTO_LINK_TICKET',
  'COMPRAS_SANCION_FACTURA_TARDIA','COMPRAS_REMINDER_DAYS',
  'COMPRAS_BRAND_NOMBRE','COMPRAS_BRAND_COLOR','COMPRAS_BRAND_LOGO_URL',
  'COMPRAS_PDF_RETENTION_DAYS',
  'COMPRAS_FEATURE_EMAIL_OC_TO_PROV','COMPRAS_FEATURE_EMAIL_OC_TO_SOLIC','COMPRAS_FEATURE_EMAIL_OC_TO_APROBADOR',
]

export async function GET(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    const { data, error } = await supabase.from('settings').select('key,value').in('key', KEYS)
    if (error) throw error
    const out: Record<string, string> = {}
    for (const k of KEYS) out[k] = ''
    for (const row of data || []) out[row.key] = row.value || ''
    return NextResponse.json({ ok: true, settings: out })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN'], u.rolesExtra)
    const body = await req.json()

    const updates: { key: string; value: string }[] = []
    for (const k of KEYS) {
      if (body[k] !== undefined) updates.push({ key: k, value: String(body[k] ?? '') })
    }

    for (const { key, value } of updates) {
      const { data: ex } = await supabase.from('settings').select('id').eq('key', key).single()
      if (ex) {
        await supabase.from('settings').update({ value }).eq('id', ex.id)
      } else {
        await supabase.from('settings').insert({ key, value })
      }
    }
    return NextResponse.json({ ok: true, saved: updates.length })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
