/**
 * ============================================================
 * compras.ts — Helpers del módulo Compras
 * ============================================================
 */
import { supabase } from './supabase'

// ─── Settings ──────────────────────────────────────────────
export async function getComprasSetting(key: string, fallback: string = ''): Promise<string> {
  const { data } = await supabase.from('settings').select('value').eq('key', key).single()
  return data?.value ?? fallback
}

export async function getComprasSettingNum(key: string, fallback: number): Promise<number> {
  const v = await getComprasSetting(key, '')
  const n = parseFloat(v)
  return isNaN(n) ? fallback : n
}

export async function getComprasSettingBool(key: string, fallback: boolean): Promise<boolean> {
  const v = (await getComprasSetting(key, '')).toLowerCase()
  if (v === '') return fallback
  return v === 'true' || v === '1' || v === 'si' || v === 'yes'
}

export async function setComprasSetting(key: string, value: string): Promise<void> {
  const { data: existing } = await supabase.from('settings').select('id').eq('key', key).single()
  if (existing) {
    await supabase.from('settings').update({ value }).eq('key', key)
  } else {
    await supabase.from('settings').insert({ key, value })
  }
}

// ─── Folio ─────────────────────────────────────────────────
export async function nextFolio(): Promise<{ folio: string; seq: number }> {
  const prefix = await getComprasSetting('COMPRAS_FOLIO_PREFIX', 'OC-UPU-')
  const padStr = await getComprasSetting('COMPRAS_FOLIO_PAD', '4')
  const pad = parseInt(padStr, 10) || 4
  const year = new Date().getFullYear()
  const yearStr = year.toString()

  const savedYear = await getComprasSetting('COMPRAS_FOLIO_YEAR', yearStr)
  let seq = parseInt(await getComprasSetting('COMPRAS_FOLIO_SEQ', '0'), 10) || 0

  if (savedYear !== yearStr) {
    seq = 0
    await setComprasSetting('COMPRAS_FOLIO_YEAR', yearStr)
  }
  seq += 1
  await setComprasSetting('COMPRAS_FOLIO_SEQ', String(seq))

  const folio = `${prefix}${yearStr}-${String(seq).padStart(pad, '0')}`
  return { folio, seq }
}

// ─── Días hábiles ──────────────────────────────────────────
export async function esDiaHabil(fecha: Date): Promise<boolean> {
  const dow = fecha.getDay()
  if (dow === 0 || dow === 6) return false
  const ymd = fecha.toISOString().slice(0, 10)
  const { data } = await supabase.from('dias_festivos').select('fecha').eq('fecha', ymd).single()
  return !data
}

export async function sumarDiasHabiles(fecha: Date, dias: number): Promise<Date> {
  const d = new Date(fecha.getTime())
  let added = 0
  while (added < dias) {
    d.setDate(d.getDate() + 1)
    if (await esDiaHabil(d)) added++
  }
  return d
}

// ─── Ventanas por tipo ─────────────────────────────────────
export function tipoKey(tipo: string): string {
  return String(tipo || '').toUpperCase().trim().replace(/\s+/g, '_').replace(/[^A-Z_]/g, '')
}

export async function ventanaConfigTipo(tipo: string) {
  const k = tipoKey(tipo)
  return {
    diasInicio:    await getComprasSettingNum(`COMPRAS_VENTANA_${k}_DIAS_INICIO`, 1),
    diasFin:       await getComprasSettingNum(`COMPRAS_VENTANA_${k}_DIAS_FIN`,    31),
    permiteFinsem: await getComprasSettingBool(`COMPRAS_VENTANA_${k}_PERMITE_FINSEM`, true),
    validar:       await getComprasSettingBool(`COMPRAS_VENTANA_${k}_VALIDAR`,        false),
  }
}

export async function ventanaPermitida(tipo: string, fecha: Date): Promise<boolean> {
  const cfg = await ventanaConfigTipo(tipo)
  const dia = fecha.getDate()
  if (dia < cfg.diasInicio || dia > cfg.diasFin) return false
  if (!cfg.permiteFinsem) {
    const dow = fecha.getDay()
    if (dow === 0 || dow === 6) return false
  }
  return true
}

// ─── Niveles de aprobación ─────────────────────────────────
export async function nivelRequerido(total: number) {
  const { data: niveles } = await supabase.from('niveles_autorizacion')
    .select('*').eq('activo', true).order('nivel', { ascending: true })
  if (!niveles?.length) return null
  for (const n of niveles) {
    const monto = Number(n.monto_hasta) || 0
    if (monto === 0 || total <= monto) return n
  }
  return niveles[niveles.length - 1]
}

// ─── Calcular totales de items ─────────────────────────────
export type ItemInput = {
  posicion?: number
  cantidad: number
  unidad?: string
  nombre: string
  descripcion?: string
  marca_modelo?: string
  observaciones?: string
  precio_unitario?: number
}

export function calcularTotales(items: ItemInput[], aplicaIva: boolean = true) {
  let subtotal = 0
  const itemsConImporte = items.map((it, i) => {
    const cant = Number(it.cantidad) || 0
    const pu = Number(it.precio_unitario) || 0
    const importe = cant * pu
    subtotal += importe
    return {
      posicion: it.posicion ?? (i + 1),
      cantidad: cant,
      unidad: it.unidad || 'pza',
      nombre: it.nombre,
      descripcion: it.descripcion || '',
      marca_modelo: it.marca_modelo || '',
      observaciones: it.observaciones || '',
      precio_unitario: pu,
      importe,
    }
  })
  const iva = aplicaIva ? +(subtotal * 0.16).toFixed(2) : 0
  const total = +(subtotal + iva).toFixed(2)
  return { subtotal: +subtotal.toFixed(2), iva, total, items: itemsConImporte }
}

// ─── Catálogos ──────────────────────────────────────────────
export async function getCatalogo(key: string): Promise<any[]> {
  const { data } = await supabase.from('catalogs').select('value').eq('key', key).single()
  return Array.isArray(data?.value) ? data!.value : []
}

// ─── Historial ─────────────────────────────────────────────
export async function logOrdenHistory(
  ordenId: string,
  action: string,
  actor: { email: string; rol: string },
  data: { estatus_prev?: string; estatus_new?: string; note?: string } = {}
) {
  await supabase.from('orden_history').insert({
    orden_id: ordenId,
    action,
    estatus_prev: data.estatus_prev ?? null,
    estatus_new:  data.estatus_new  ?? null,
    actor_email:  actor.email,
    actor_rol:    actor.rol,
    note:         data.note ?? null,
  })
}
