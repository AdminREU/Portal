import { NextResponse } from 'next/server'
import { validateToken, getToken, requireRoles } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { generarPdfOC, subirPdfOC } from '@/lib/pdf-oc'
import { sendOCEmail } from '@/lib/email'
import { getComprasSetting, getComprasSettingBool, logOrdenHistory } from '@/lib/compras'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['COMPRAS','ADMIN'], u.rolesExtra)
    const body = await req.json().catch(() => ({}))

    const { data: orden } = await supabase.from('ordenes').select('*').eq('id', id).single()
    if (!orden) throw new Error('OC no encontrada')

    const [{ data: items }, { data: aprobs }] = await Promise.all([
      supabase.from('orden_items').select('*').eq('orden_id', id).order('posicion'),
      supabase.from('orden_aprobaciones').select('*').eq('orden_id', id).order('nivel'),
    ])
    const pdfBytes = await generarPdfOC({ ...orden, items: items || [], niveles: aprobs || [] } as any)
    const { url } = await subirPdfOC(id, pdfBytes)
    await supabase.from('ordenes').update({
      pdf_url: url, pdf_filename: `${id}.pdf`, pdf_generated_at: new Date().toISOString()
    }).eq('id', id)

    const destinatarios: string[] = Array.isArray(body.destinatarios) && body.destinatarios.length
      ? body.destinatarios : []

    const cc: string[] = Array.isArray(body.cc) ? [...body.cc] : []
    const emailSolic = await getComprasSettingBool('COMPRAS_FEATURE_EMAIL_OC_TO_SOLIC', true)
    if (emailSolic && orden.solicitante_email && !destinatarios.includes(orden.solicitante_email)) {
      cc.push(orden.solicitante_email)
    }
    const emailJefe = await getComprasSetting('COMPRAS_EMAIL_JEFE_COMPRAS_NACIONALES', '')
    const emailGer  = await getComprasSetting('COMPRAS_EMAIL_GERENTE_ADM', '')
    if (emailJefe) cc.push(emailJefe)
    if (emailGer)  cc.push(emailGer)

    if (!destinatarios.length && !cc.length) throw new Error('Sin destinatarios')

    await sendOCEmail({
      to: destinatarios.length ? destinatarios : cc.shift()!,
      cc: cc.length ? Array.from(new Set(cc)) : undefined,
      subject: `Orden de Compra ${orden.id} — ${orden.empresa}`,
      body: body.mensaje || `Adjuntamos la Orden de Compra <strong>${orden.id}</strong> para su atención.`,
      oc: {
        id: orden.id,
        total: Number(orden.total),
        moneda: orden.moneda || 'MXN',
        solicitante: orden.solicitante_nombre || orden.solicitante_email,
        tipo: orden.tipo_compra,
        empresa: orden.empresa,
        estatus: orden.estatus,
      },
      pdfBytes,
      pdfFilename: `${orden.id}.pdf`,
    })

    await supabase.from('ordenes').update({
      fecha_envio_prov: new Date().toISOString(),
      estatus: orden.estatus === 'aprobada' ? 'en_compra' : orden.estatus,
    }).eq('id', id)

    await logOrdenHistory(id, 'sent_supplier', { email: u.email, rol: u.rol }, {
      estatus_prev: orden.estatus,
      estatus_new: orden.estatus === 'aprobada' ? 'en_compra' : orden.estatus,
      note: `Enviada a: ${destinatarios.join(', ')}`,
    })

    return NextResponse.json({ ok: true, pdf_url: url })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
