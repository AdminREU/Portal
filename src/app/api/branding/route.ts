import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Endpoint público — sin auth — para que /login también pueda leer el branding
export async function GET() {
  try {
    const { data } = await supabase
      .from('settings')
      .select('key,value')
      .in('key', ['APP_NAME', 'APP_LOGO_URL', 'APP_PRIMARY_COLOR'])
    const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]))
    return NextResponse.json({
      ok: true,
      name: map.APP_NAME || 'Helpdesk',
      logoUrl: map.APP_LOGO_URL || '',
      primaryColor: map.APP_PRIMARY_COLOR || '#3b82f6',
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
