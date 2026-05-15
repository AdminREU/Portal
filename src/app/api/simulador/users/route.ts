import { NextResponse } from 'next/server'
import { validateToken, getToken, hasRol } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/simulador/users
 * Devuelve la lista de usuarios del Portal en un formato que entiende el
 * panel admin del Simulador 3D (id, email, nombre, role, created_at).
 *
 * Solo ADMIN.
 */
export async function GET(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    if (!hasRol(u.rol, u.rolesExtra, 'ADMIN')) {
      return NextResponse.json({ ok: false, error: 'Solo ADMIN' }, { status: 403 })
    }
    const { data, error } = await supabase
      .from('users')
      .select('id, email, nombre, rol, roles_extra, estado, created_at')
      .order('created_at', { ascending: false })
    if (error) throw error
    const profiles = (data || []).map(u => {
      const extras: string[] = Array.isArray(u.roles_extra) ? u.roles_extra : []
      const isAdmin = u.rol === 'ADMIN' || extras.includes('ADMIN')
      return {
        id: u.id,
        email: u.email,
        nombre: u.nombre || '',
        role: isAdmin ? 'admin' : 'user',
        estado: u.estado || 'ACTIVO',
        created_at: u.created_at,
      }
    })
    return NextResponse.json({ ok: true, profiles })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}

/**
 * PATCH /api/simulador/users  body: { id, role }
 * Cambia el rol del usuario en el Portal. role = 'admin' | 'user'
 * Solo ADMIN.
 */
export async function PATCH(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    if (!hasRol(u.rol, u.rolesExtra, 'ADMIN')) {
      return NextResponse.json({ ok: false, error: 'Solo ADMIN' }, { status: 403 })
    }
    const body = await req.json()
    if (!body.id) throw new Error('id requerido')

    // Cargar usuario actual
    const { data: target } = await supabase.from('users').select('*').eq('id', body.id).single()
    if (!target) throw new Error('Usuario no encontrado')

    const extras: string[] = Array.isArray(target.roles_extra) ? target.roles_extra : []
    let newExtras = extras.filter(r => r !== 'ADMIN')
    let newRol = target.rol

    if (body.role === 'admin') {
      // Promover: si rol base no es ADMIN, agregar ADMIN a roles_extra
      if (target.rol !== 'ADMIN') newExtras = Array.from(new Set([...newExtras, 'ADMIN']))
    } else {
      // Quitar admin: si rol base es ADMIN, downgrade a USUARIO
      if (target.rol === 'ADMIN') newRol = 'USUARIO'
    }

    const { error } = await supabase.from('users')
      .update({ rol: newRol, roles_extra: newExtras })
      .eq('id', body.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
