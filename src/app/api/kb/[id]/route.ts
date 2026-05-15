import { NextResponse } from 'next/server'
import { validateToken, requireRoles, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { rol } = await validateToken(getToken(req))
    requireRoles(rol, ['HELPDESK','ADMIN'])
    const body = await req.json()
    const { data } = await supabase.from('knowledge_base').update(body).eq('id', params.id).select().single()
    return NextResponse.json({ ok: true, item: data })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 400 }) }
}
