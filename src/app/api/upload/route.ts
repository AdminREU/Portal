import { NextResponse } from 'next/server'
import { validateToken, getToken, requireRoles } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/upload?prefix=anuncios
 * Upload genérico de imágenes al bucket 'evidencias'.
 * Devuelve { url, path }.
 *
 * Solo ADMIN (por defecto). El prefix delimita la subcarpeta.
 */
export async function POST(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN'], u.rolesExtra)

    const url = new URL(req.url)
    const prefix = (url.searchParams.get('prefix') || 'portal').replace(/[^a-z0-9_-]/gi, '')

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ ok: false, error: 'Falta archivo' }, { status: 400 })
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ ok: false, error: 'Archivo mayor a 5MB' }, { status: 400 })
    if (!file.type.startsWith('image/')) return NextResponse.json({ ok: false, error: 'Solo se aceptan imágenes' }, { status: 400 })

    const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const bytes = await file.arrayBuffer()

    const { error: upErr } = await supabase.storage.from('evidencias').upload(path, bytes, {
      contentType: file.type, upsert: false,
    })
    if (upErr) throw new Error(upErr.message)

    const { data: urlData } = supabase.storage.from('evidencias').getPublicUrl(path)
    return NextResponse.json({ ok: true, url: urlData.publicUrl, path })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

/**
 * DELETE /api/upload?path=anuncios/123.png
 * Elimina una imagen del bucket.
 */
export async function DELETE(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['ADMIN'], u.rolesExtra)

    const url = new URL(req.url)
    const path = url.searchParams.get('path')
    if (!path) return NextResponse.json({ ok: false, error: 'path requerido' }, { status: 400 })

    const { error } = await supabase.storage.from('evidencias').remove([path])
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
