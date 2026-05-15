import { NextResponse } from 'next/server'
import { validateToken, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/avisos/dashboard
 * Devuelve todos los datos del tablero del Portal en una sola llamada:
 * - anuncios activos vigentes
 * - frase del día (rotativa por fecha)
 * - próximos cumpleaños / aniversarios (30 días)
 * - próximos eventos (30 días)
 * - tareas del usuario (próximos 14 días)
 * - notificaciones no leídas del usuario
 * - feature flags relevantes para el portal
 */
export async function GET(req: Request) {
  try {
    const u = await validateToken(getToken(req))
    const hoy = new Date()
    const hoyISO = hoy.toISOString()
    const en30 = new Date(hoy.getTime() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    const en14 = new Date(hoy.getTime() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    const hoyDate = hoy.toISOString().slice(0, 10)

    // Frase del día: misma frase todo el día para todos, rotativa por día del año
    const diaAnio = Math.floor((hoy.getTime() - new Date(hoy.getFullYear(), 0, 0).getTime()) / 86400000)

    const [anuncios, frases, cumples, eventos, tareas, notifs, flags] = await Promise.all([
      supabase.from('anuncios')
        .select('*')
        .eq('activo', true)
        .or(`expira_at.is.null,expira_at.gte.${hoyISO}`)
        .order('prioridad', { ascending: false })
        .order('publicado_at', { ascending: false })
        .limit(20),
      supabase.from('frases').select('*').eq('activo', true).limit(200),
      supabase.from('cumpleanos').select('*').eq('mostrar', true).limit(200),
      supabase.from('eventos')
        .select('*')
        .eq('activo', true)
        .gte('fecha', hoyDate)
        .lte('fecha', en30)
        .order('fecha', { ascending: true })
        .limit(20),
      supabase.from('tareas')
        .select('*')
        .or(`asignado_email.eq.${u.email},asignado_email.is.null`)
        .gte('fecha', hoyDate)
        .lte('fecha', en14)
        .neq('status', 'completada')
        .order('fecha', { ascending: true })
        .order('prioridad', { ascending: false })
        .limit(15),
      supabase.from('notificaciones')
        .select('*')
        .eq('user_email', u.email)
        .eq('leida', false)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('feature_flags').select('clave, valor').eq('categoria', 'portal'),
    ])

    // Calcular fecha próxima para cumpleaños
    const cumplesProcesados = (cumples.data || []).map((c: any) => {
      const fechaEsteAnio = new Date(hoy.getFullYear(), c.mes - 1, c.dia)
      const fechaProxima = fechaEsteAnio >= new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
        ? fechaEsteAnio
        : new Date(hoy.getFullYear() + 1, c.mes - 1, c.dia)
      const dias = Math.ceil((fechaProxima.getTime() - hoy.getTime()) / 86400000)
      return { ...c, fecha_proxima: fechaProxima.toISOString().slice(0, 10), dias_faltantes: dias }
    })
      .filter(c => c.dias_faltantes <= 60)
      .sort((a, b) => a.dias_faltantes - b.dias_faltantes)
      .slice(0, 10)

    // Frase del día
    const frasesArr = frases.data || []
    const frase = frasesArr.length ? frasesArr[diaAnio % frasesArr.length] : null

    // Flags como objeto
    const flagsObj: Record<string, boolean> = {}
    for (const f of (flags.data || [])) flagsObj[f.clave] = f.valor

    return NextResponse.json({
      ok: true,
      anuncios: anuncios.data || [],
      frase_dia: frase,
      cumpleanos: cumplesProcesados,
      eventos: eventos.data || [],
      tareas: tareas.data || [],
      notificaciones: notifs.data || [],
      flags: flagsObj,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}
