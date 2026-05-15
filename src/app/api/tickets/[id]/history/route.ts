import { NextResponse } from 'next/server'
import { validateToken, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await validateToken(getToken(req))
    const { data } = await supabase.from('ticket_history').select('*').eq('ticket_id', id).order('created_at', { ascending: false })
    return NextResponse.json({ ok: true, history: data ?? [] })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 401 }) }
}
