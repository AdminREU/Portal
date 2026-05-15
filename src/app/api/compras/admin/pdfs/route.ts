import { NextResponse } from 'next/server'
import { validateToken, getToken, requireRoles } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// GET — listar PDFs almacenados con metadata
export async function GET(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN','COMPRAS'], u.rolesExtra)

    const { data: files, error } = await supabase.storage.from('compras-docs').list('oc', {
      limit: 1000, sortBy: { column: 'created_at', order: 'desc' }
    })
    if (error) throw error

    const out = (files || []).filter(f => f.name.endsWith('.pdf')).map(f => ({
      filename: f.name,
      folio: f.name.replace(/\.pdf$/i, ''),
      created_at: f.created_at,
      size: f.metadata?.size || 0,
      url: supabase.storage.from('compras-docs').getPublicUrl(`oc/${f.name}`).data.publicUrl,
    }))
    return NextResponse.json({ ok: true, pdfs: out })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}

// DELETE — eliminar un PDF por filename
export async function DELETE(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN'], u.rolesExtra)
    const url = new URL(req.url)
    const filename = url.searchParams.get('filename')
    if (!filename) throw new Error('filename requerido')
    const { error } = await supabase.storage.from('compras-docs').remove([`oc/${filename}`])
    if (error) throw error

    // Limpiar referencia en orden
    const folio = filename.replace(/\.pdf$/i, '')
    await supabase.from('ordenes').update({ pdf_url: null, pdf_filename: null, pdf_generated_at: null }).eq('id', folio)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
