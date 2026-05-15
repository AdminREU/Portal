import { NextResponse } from 'next/server'
import { createOtp } from '@/lib/auth'
import { sendOtpEmail } from '@/lib/email'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email?.includes('@')) return NextResponse.json({ ok: false, error: 'Email inválido' }, { status: 400 })
    const normalized = email.toLowerCase().trim()
    const { data: user } = await supabase.from('users').select('estado').eq('email', normalized).single()
    if (user?.estado === 'INACTIVO') return NextResponse.json({ ok: false, error: 'Usuario inactivo' }, { status: 403 })
    const code = await createOtp(normalized)
    await sendOtpEmail(normalized, code)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 429 })
  }
}
