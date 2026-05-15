import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// La validación de auth se hace 100% en cada page.tsx contra /api/auth/resume.
// El middleware solo redirige raíz / al login.
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
