import { NextResponse } from 'next/server'
import { validateToken, requireRoles, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { rol, rolesExtra } = await validateToken(getToken(req))
    requireRoles(rol, ['HELPDESK','ADMIN'], rolesExtra)
    const body = await req.json()
    const { data } = await supabase.from('knowledge_base').update(body).eq('id', id).select().single()
    return NextResponse.json({ ok: true, item: data })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 400 }) }
}
