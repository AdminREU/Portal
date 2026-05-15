import { supabase } from './supabase'
import { randomInt } from 'crypto'

const OTP_TTL_MIN = 30
const SESSION_TTL_MIN = 480
const OTP_RATE_LIMIT = 6

// ─── Roles ──────────────────────────────────────────────────
// Todos los usuarios tienen rol base USUARIO.
// roles_extra (jsonb array) puede contener: HELPDESK, COMPRAS, APROBADOR, ADMIN.
// La columna `rol` mantiene el rol principal por compatibilidad con tickets/sessions.
export type Rol = 'USUARIO' | 'HELPDESK' | 'COMPRAS' | 'APROBADOR' | 'ADMIN'
export const ROLES_VALIDOS: Rol[] = ['USUARIO','HELPDESK','COMPRAS','APROBADOR','ADMIN']

export async function createOtp(email: string): Promise<string> {
  const normalized = email.toLowerCase().trim()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { count } = await supabase
    .from('otp_codes')
    .select('*', { count: 'exact', head: true })
    .eq('email', normalized)
    .gte('created_at', oneHourAgo)

  if ((count ?? 0) >= OTP_RATE_LIMIT)
    throw new Error('Demasiados intentos. Espera 30 minutos.')

  await supabase.from('otp_codes').delete().eq('email', normalized)

  const code = String(randomInt(100000, 999999))
  const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000).toISOString()

  await supabase.from('otp_codes').insert({ email: normalized, code, expires_at: expiresAt, attempts: 0 })
  return code
}

export async function verifyOtp(email: string, code: string) {
  const normalized = email.toLowerCase().trim()

  const { data: otp } = await supabase
    .from('otp_codes').select('*').eq('email', normalized)
    .order('created_at', { ascending: false }).limit(1).single()

  if (!otp) throw new Error('Código no encontrado')
  if (new Date(otp.expires_at) < new Date()) throw new Error('Código expirado')
  if (String(otp.code).trim() !== String(code).trim()) {
    await supabase.from('otp_codes').update({ attempts: otp.attempts + 1 }).eq('id', otp.id)
    throw new Error('Código incorrecto')
  }

  await supabase.from('otp_codes').delete().eq('email', normalized)
  return createSession(normalized)
}

function getAdminEmails(): string[] {
  try {
    const raw = process.env.ADMIN_EMAILS ?? '[]'
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((e: string) => e.toLowerCase().trim()) : []
  } catch {
    return []
  }
}

export async function createSession(email: string) {
  const adminEmails = getAdminEmails()
  const shouldBeAdmin = adminEmails.includes(email.toLowerCase().trim())

  // maybeSingle no lanza error si no existe; permite distinguir "no encontrado" de error real
  const { data: existingUser, error: selErr } = await supabase
    .from('users').select('*').eq('email', email).maybeSingle()
  if (selErr) throw new Error(`Error al buscar usuario: ${selErr.message}`)

  let user: any = existingUser

  if (!user) {
    // Primer ingreso: rol base USUARIO. Admin asigna extras después.
    const initialRol = shouldBeAdmin ? 'ADMIN' : 'USUARIO'
    const initialExtra = shouldBeAdmin ? ['ADMIN'] : []
    const { data: newUser, error: insErr } = await supabase.from('users')
      .insert({
        email,
        rol: initialRol,
        roles_extra: initialExtra,
        estado: 'ACTIVO',
      }).select().single()
    if (insErr) throw new Error(`No se pudo crear el usuario: ${insErr.message}`)
    user = newUser
  } else if (shouldBeAdmin && user.rol !== 'ADMIN') {
    // Force-promote admins de env var
    const extras: string[] = Array.isArray(user.roles_extra) ? user.roles_extra : []
    if (!extras.includes('ADMIN')) extras.push('ADMIN')
    const { data: updated } = await supabase.from('users')
      .update({ rol: 'ADMIN', roles_extra: extras }).eq('email', email).select().single()
    user = updated ?? user
  }

  if (!user) throw new Error('Error al crear usuario (sin detalles)')
  if (user.estado === 'INACTIVO') throw new Error('Usuario inactivo. Contacta al administrador.')

  await supabase.from('users').update({
    ultimo_acceso: new Date().toISOString(),
    login_count: (user.login_count ?? 0) + 1
  }).eq('email', email)

  const token = `${crypto.randomUUID()}-${Date.now()}`
  const expiresAt = new Date(Date.now() + SESSION_TTL_MIN * 60 * 1000).toISOString()

  await supabase.from('sessions').insert({ token, email: user.email, rol: user.rol, expires_at: expiresAt })
  return { token, email: user.email, rol: user.rol }
}

export async function validateToken(token: string) {
  if (!token) throw new Error('Token requerido')

  const { data: session } = await supabase.from('sessions').select('*').eq('token', token).single()
  if (!session) throw new Error('Sesión inválida')
  if (new Date(session.expires_at) < new Date()) {
    await supabase.from('sessions').delete().eq('token', token)
    throw new Error('Sesión expirada')
  }

  const newExpiry = new Date(Date.now() + SESSION_TTL_MIN * 60 * 1000).toISOString()
  await supabase.from('sessions').update({
    last_active: new Date().toISOString(),
    expires_at: newExpiry
  }).eq('token', token)

  // Cargar roles_extra y perfil del usuario
  const { data: user } = await supabase.from('users')
    .select('roles_extra, nombre, puesto, departamento, telefono, nivel_aprobacion, foto_url')
    .eq('email', session.email).single()

  const rolesExtra: string[] = Array.isArray(user?.roles_extra) ? user!.roles_extra : []

  return {
    email: session.email,
    rol: session.rol as Rol,
    rolesExtra,
    nombre: user?.nombre ?? '',
    puesto: user?.puesto ?? '',
    departamento: user?.departamento ?? '',
    telefono: user?.telefono ?? '',
    fotoUrl: user?.foto_url ?? '',
    nivelAprobacion: user?.nivel_aprobacion ?? null,
    token,
  }
}

/**
 * Verifica que el usuario tenga AL MENOS UNO de los roles permitidos.
 * Considera tanto el rol principal como roles_extra.
 * ADMIN siempre pasa.
 */
export function requireRoles(rol: string, allowed: string[], rolesExtra: string[] = []) {
  if (rol === 'ADMIN') return
  const todos = new Set<string>([rol, ...rolesExtra])
  if (allowed.some(r => todos.has(r))) return
  throw new Error('No tienes permisos para esta acción')
}

export function getToken(req: Request): string {
  return req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
}

/** Helper: el usuario tiene un rol? (rol principal o extra) */
export function hasRol(rol: string, rolesExtra: string[], target: Rol): boolean {
  if (rol === target) return true
  if (rol === 'ADMIN') return true
  return rolesExtra.includes(target)
}
