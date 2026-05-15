import { NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const { token } = await req.json()
    const session = await validateToken(token)
    return NextResponse.json({ ok: true, ...session })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}
