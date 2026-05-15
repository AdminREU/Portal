import { NextResponse } from 'next/server'
import { validateToken, getToken, requireRoles, hasRol } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { nextFolio, calcularTotales, ventanaPermitida, ventanaConfigTipo, nivelRequerido, logOrdenHistory, getComprasSettingBool } from '@/lib/compras'

// GET /api/compras/ordenes — listar
// Query: ?estatus=&tipo=&q=&mine=1
export async function GET(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    const url = new URL(req.url)
    const estatus = url.searchParams.get('estatus') || ''
    const tipo    = url.searchParams.get('tipo')    || ''
    const q       = url.searchParams.get('q')       || ''
    const mine    = url.searchParams.get('mine')    === '1'

    let query = supabase.from('ordenes').select('*').order('created_at', { ascending: false }).limit(500)

    // Filtro por permisos: COMPRAS/ADMIN/APROBADOR ven todo, resto solo lo suyo
    const puedeVerTodo = hasRol(u.rol, u.rolesExtra, 'COMPRAS') ||
                          hasRol(u.rol, u.rolesExtra, 'APROBADOR') ||
                          hasRol(u.rol, u.rolesExtra, 'ADMIN')
    if (!puedeVerTodo || mine) {
      query = query.eq('solicitante_email', u.email)
    }
    if (estatus) query = query.eq('estatus', estatus)
    if (tipo)    query = query.eq('tipo_compra', tipo)
    if (q)       query = query.or(`id.ilike.%${q}%,solicitante_nombre.ilike.%${q}%,proveedor_razon.ilike.%${q}%`)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ ok: true, ordenes: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}

// POST /api/compras/ordenes — crear
export async function POST(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    const body = await req.json()

    // Validaciones básicas
    if (!body.empresa)         throw new Error('Empresa requerida')
    if (!body.tipo_compra)     throw new Error('Tipo de compra requerido')
    if (!body.items?.length)   throw new Error('Debes agregar al menos un item')

    // Justificación advisory para no_recurrente / urgente
    const reqJustifUrg = await getComprasSettingBool('COMPRAS_REQUIERE_JUSTIF_URGENTE', true)
    if (reqJustifUrg && (body.tipo_compra === 'no_recurrente' || body.tipo_compra === 'urgente')) {
      if (!String(body.justificacion || '').trim()) {
        throw new Error('La justificación es obligatoria para compras No recurrentes / Urgentes')
      }
    }

    // Ventana (advisory)
    const hoy = new Date()
    const cfgVentana = await ventanaConfigTipo(body.tipo_compra)
    const dentro = await ventanaPermitida(body.tipo_compra, hoy)
    const fueraVentana = !dentro
    if (fueraVentana && cfgVentana.validar) {
      throw new Error(`PT-COMP: Las OC de tipo "${body.tipo_compra}" solo se envían dentro de la ventana configurada (días ${cfgVentana.diasInicio}-${cfgVentana.diasFin}). Configura "validar=false" o ajusta la ventana en admin si necesitas enviar fuera de ella.`)
    }

    let observaciones = String(body.observaciones || '').trim()
    if (fueraVentana && body.tipo_compra === 'recurrente') {
      observaciones = `[FUERA DE VENTANA — REVISAR] ${observaciones}`
    }

    // Totales
    const aplicaIva = body.aplica_iva !== false
    const { subtotal, iva, total, items } = calcularTotales(body.items, aplicaIva)

    // Folio
    const { folio, seq } = await nextFolio()

    // Nivel inicial (cuál aprobador debe firmar primero)
    const nivel = await nivelRequerido(total)

    // Proveedor (si proveedor_id)
    let provRfc: string | null = null, provRazon: string | null = null
    if (body.proveedor_id) {
      const { data: prov } = await supabase.from('proveedores').select('rfc,razon_social').eq('id', body.proveedor_id).single()
      if (prov) { provRfc = prov.rfc; provRazon = prov.razon_social }
    } else {
      provRfc   = body.proveedor_rfc   || null
      provRazon = body.proveedor_razon || null
    }

    const estatusInicial = String(body.guardar_borrador) === '1' ? 'borrador' : 'pendiente_aprob'

    // Insertar orden
    const { error: errO } = await supabase.from('ordenes').insert({
      id: folio,
      folio_seq: seq,
      solicitante_email: u.email,
      solicitante_nombre: u.nombre || body.solicitante_nombre || u.email,
      solicitante_puesto: u.puesto || body.solicitante_puesto || '',
      solicitante_depto:  u.departamento || body.solicitante_depto || '',
      solicitante_tel:    u.telefono || body.solicitante_tel || '',
      empresa: body.empresa,
      tipo_compra: body.tipo_compra,
      categoria: body.categoria || '',
      justificacion: body.justificacion || '',
      observaciones,
      fuera_ventana: fueraVentana,
      proveedor_id: body.proveedor_id || null,
      proveedor_rfc: provRfc,
      proveedor_razon: provRazon,
      subtotal, iva, total,
      moneda: body.moneda || 'MXN',
      estatus: estatusInicial,
      nivel_aprobacion_actual: nivel?.nivel ?? 0,
      ticket_id_origen: body.ticket_id_origen || null,
    })
    if (errO) throw errO

    // Items
    const itemsInsert = items.map(it => ({ ...it, orden_id: folio }))
    const { error: errI } = await supabase.from('orden_items').insert(itemsInsert)
    if (errI) throw errI

    // Inicializar aprobaciones (todas pendientes hasta el nivel requerido)
    const { data: niveles } = await supabase.from('niveles_autorizacion')
      .select('*').eq('activo', true).order('nivel', { ascending: true })
    if (niveles && nivel) {
      for (const n of niveles) {
        if (n.nivel > nivel.nivel) break
        await supabase.from('orden_aprobaciones').insert({
          orden_id: folio,
          nivel: n.nivel,
          email: n.email,
          nombre: n.nombre,
          decision: 'pendiente',
        })
      }
    }

    // Linkear ticket si viene de helpdesk
    if (body.ticket_id_origen) {
      await supabase.from('tickets').update({
        orden_id_relacionada: folio,
        escala_a_compra: true,
      }).eq('id', body.ticket_id_origen)
    }

    await logOrdenHistory(folio, 'created', { email: u.email, rol: u.rol }, {
      estatus_new: estatusInicial,
      note: fueraVentana ? 'Creada fuera de ventana (advisory)' : undefined,
    })

    return NextResponse.json({ ok: true, id: folio, estatus: estatusInicial, fuera_ventana: fueraVentana })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
