import { NextResponse } from 'next/server'
import { validateToken, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    await validateToken(getToken(req))
    const { data } = await supabase.from('catalogs').select('key,value')
    const catalogs = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]))
    return NextResponse.json({ ok: true, catalogs })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 401 }) }
}
