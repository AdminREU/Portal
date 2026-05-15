import { NextResponse } from 'next/server'
import { validateToken, requireRoles, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { rol } = await validateToken(getToken(req))
    requireRoles(rol, ['HELPDESK','ADMIN'])
    const { active } = await req.json()
    await supabase.from('knowledge_base').update({ activo: active }).eq('id', params.id)
    return NextResponse.json({ ok: true })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 400 }) }
}
