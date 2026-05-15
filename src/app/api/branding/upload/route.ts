import { NextResponse } from 'next/server'
import { validateToken, requireRoles, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { rol } = await validateToken(getToken(req))
    requireRoles(rol, ['ADMIN'])

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ ok: false, error: 'Falta archivo' }, { status: 400 })
    if (file.size > 2 * 1024 * 1024) return NextResponse.json({ ok: false, error: 'Logo mayor a 2MB' }, { status: 400 })

    const ext = file.name.split('.').pop() ?? 'png'
    const path = `branding/logo-${Date.now()}.${ext}`
    const bytes = await file.arrayBuffer()
    const { error: upErr } = await supabase.storage.from('evidencias').upload(path, bytes, {
      contentType: file.type, upsert: true,
    })
    if (upErr) throw new Error(upErr.message)

    const { data: urlData } = supabase.storage.from('evidencias').getPublicUrl(path)
    await supabase.from('settings').upsert(
      { key: 'APP_LOGO_URL', value: urlData.publicUrl },
      { onConflict: 'key' }
    )

    return NextResponse.json({ ok: true, url: urlData.publicUrl })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { rol } = await validateToken(getToken(req))
    requireRoles(rol, ['ADMIN'])
    await supabase.from('settings').upsert(
      { key: 'APP_LOGO_URL', value: '' },
      { onConflict: 'key' }
    )
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
