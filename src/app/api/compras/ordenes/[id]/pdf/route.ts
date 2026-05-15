import { NextResponse } from 'next/server'
import { validateToken, getToken, hasRol } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { generarPdfOC, subirPdfOC } from '@/lib/pdf-oc'
import { logOrdenHistory } from '@/lib/compras'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const u = await validateToken(getToken(req))
    const url = new URL(req.url)
    const regenerar = url.searchParams.get('regenerar') === '1'
    const download  = url.searchParams.get('download')  === '1'

    const { data: orden } = await supabase.from('ordenes').select('*').eq('id', id).single()
    if (!orden) return NextResponse.json({ ok: false, error: 'OC no encontrada' }, { status: 404 })

    const puedeVer = orden.solicitante_email === u.email ||
                     hasRol(u.rol, u.rolesExtra, 'COMPRAS') ||
                     hasRol(u.rol, u.rolesExtra, 'APROBADOR') ||
                     hasRol(u.rol, u.rolesExtra, 'ADMIN')
    if (!puedeVer) return NextResponse.json({ ok: false, error: 'Sin permiso' }, { status: 403 })

    if (!regenerar && orden.pdf_url && !download) {
      return NextResponse.json({ ok: true, url: orden.pdf_url, regenerated: false })
    }

    const [{ data: items }, { data: aprobs }] = await Promise.all([
      supabase.from('orden_items').select('*').eq('orden_id', id).order('posicion'),
      supabase.from('orden_aprobaciones').select('*').eq('orden_id', id).order('nivel'),
    ])

    const pdfBytes = await generarPdfOC({
      ...orden,
      items: items || [],
      niveles: aprobs || [],
    } as any)

    const { url: publicUrl } = await subirPdfOC(id, pdfBytes)

    await supabase.from('ordenes').update({
      pdf_url: publicUrl,
      pdf_filename: `${id}.pdf`,
      pdf_generated_at: new Date().toISOString(),
    }).eq('id', id)

    await logOrdenHistory(id, 'pdf_generated', { email: u.email, rol: u.rol }, {
      note: regenerar ? 'PDF regenerado' : 'PDF generado'
    })

    if (download) {
      return new Response(new Uint8Array(pdfBytes), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${id}.pdf"`,
        },
      })
    }
    return NextResponse.json({ ok: true, url: publicUrl, regenerated: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const u = await validateToken(getToken(req))
    if (!hasRol(u.rol, u.rolesExtra, 'ADMIN') && !hasRol(u.rol, u.rolesExtra, 'COMPRAS')) {
      throw new Error('No autorizado')
    }
    const { data: orden } = await supabase.from('ordenes').select('pdf_filename').eq('id', id).single()
    if (orden?.pdf_filename) {
      await supabase.storage.from('compras-docs').remove([`oc/${orden.pdf_filename}`])
    }
    await supabase.from('ordenes').update({ pdf_url: null, pdf_filename: null, pdf_generated_at: null }).eq('id', id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
