import { NextResponse } from 'next/server'
import { validateToken, requireRoles, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    await validateToken(getToken(req))
    const { data } = await supabase.from('knowledge_base').select('*').order('created_at', { ascending: false })
    return NextResponse.json({ ok: true, items: data ?? [] })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 401 }) }
}

export async function POST(req: Request) {
  try {
    const { email, rol } = await validateToken(getToken(req))
    requireRoles(rol, ['HELPDESK','ADMIN'])
    const body = await req.json()
    const { data } = await supabase.from('knowledge_base').insert({ ...body, autor: email }).select().single()
    return NextResponse.json({ ok: true, item: data })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 400 }) }
}
