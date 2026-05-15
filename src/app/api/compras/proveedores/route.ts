import { NextResponse } from 'next/server'
import { validateToken, getToken, requireRoles, hasRol } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// GET — listar proveedores
export async function GET(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    // Cualquier usuario autenticado puede consultar (para autocompletar)
    const url = new URL(req.url)
    const q = url.searchParams.get('q') || ''
    const soloActivos = url.searchParams.get('activos') !== '0'

    let query = supabase.from('proveedores').select('*').order('razon_social', { ascending: true }).limit(500)
    if (soloActivos) query = query.eq('activo', true)
    if (q) query = query.or(`razon_social.ilike.%${q}%,rfc.ilike.%${q}%,nombre_comercial.ilike.%${q}%`)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ ok: true, proveedores: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}

// POST — crear / actualizar
export async function POST(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['COMPRAS','ADMIN'], u.rolesExtra)
    const body = await req.json()

    if (!body.rfc)          throw new Error('RFC requerido')
    if (!body.razon_social) throw new Error('Razón social requerida')

    const payload = {
      rfc:              String(body.rfc).toUpperCase().trim(),
      razon_social:     body.razon_social,
      nombre_comercial: body.nombre_comercial || '',
      contacto_nombre:  body.contacto_nombre  || '',
      contacto_email:   body.contacto_email   || '',
      contacto_tel:     body.contacto_tel     || '',
      direccion:        body.direccion        || '',
      banco:            body.banco            || '',
      cuenta:           body.cuenta           || '',
      clabe:            body.clabe            || '',
      csf_url:          body.csf_url          || null,
      csf_filename:     body.csf_filename     || null,
      categoria:        body.categoria        || '',
      notas:            body.notas            || '',
      activo:           body.activo !== false,
      updated_at:       new Date().toISOString(),
    }

    if (body.id) {
      const { error } = await supabase.from('proveedores').update(payload).eq('id', body.id)
      if (error) throw error
      return NextResponse.json({ ok: true, modo: 'update' })
    } else {
      // verificar duplicado
      const { data: existing } = await supabase.from('proveedores').select('id').eq('rfc', payload.rfc).single()
      if (existing) {
        const { error } = await supabase.from('proveedores').update(payload).eq('id', existing.id)
        if (error) throw error
        return NextResponse.json({ ok: true, modo: 'update', id: existing.id })
      }
      const { data, error } = await supabase.from('proveedores').insert(payload).select().single()
      if (error) throw error
      return NextResponse.json({ ok: true, modo: 'create', id: data?.id })
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}

// DELETE — eliminar (soft delete: marca inactivo)
export async function DELETE(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    requireRoles(u.rol, ['COMPRAS','ADMIN'], u.rolesExtra)
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    const hard = url.searchParams.get('hard') === '1'
    if (!id) throw new Error('ID requerido')

    if (hard && hasRol(u.rol, u.rolesExtra, 'ADMIN')) {
      const { error } = await supabase.from('proveedores').delete().eq('id', id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('proveedores').update({ activo: false }).eq('id', id)
      if (error) throw error
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
