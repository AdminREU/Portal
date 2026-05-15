import { NextResponse } from 'next/server'
import { validateToken, requireRoles, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function PATCH(req: Request) {
  try {
    const { rol } = await validateToken(getToken(req))
    requireRoles(rol, ['ADMIN'])
    const { key, value } = await req.json()
    const { error } = await supabase.from('catalogs').upsert({ key, value }, { onConflict: 'key' })
    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 400 }) }
}
