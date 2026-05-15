import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Endpoint público — sin auth — para que /login y todas las páginas
// puedan leer la configuración de marca + textos del portal.
export async function GET() {
  try {
    const { data } = await supabase.from('settings').select('key,value')
    const m = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]))

    return NextResponse.json({
      ok: true,
      // Marca
      name:         m.APP_NAME || 'Portal Ultralam',
      logoUrl:      m.APP_LOGO_URL || '',
      primaryColor: m.APP_PRIMARY_COLOR || '#ffd400',

      // Textos del Portal (editables desde /admin → UI)
      saludo:                 m.PORTAL_SALUDO || 'equipo Ultralam',
      mensajeBienvenida:      m.PORTAL_MENSAJE_BIENVENIDA || '',

      tituloHelpdesk:         m.PORTAL_TITULO_HELPDESK || 'Helpdesk',
      subtituloHelpdesk:      m.PORTAL_SUBTITULO_HELPDESK || 'Soporte técnico, incidencias y base de conocimiento',
      iconoHelpdesk:          m.PORTAL_ICONO_HELPDESK || '🎫',

      tituloCompras:          m.PORTAL_TITULO_COMPRAS || 'Sistema de Compras',
      subtituloCompras:       m.PORTAL_SUBTITULO_COMPRAS || 'Órdenes, aprobaciones por nivel, proveedores y PDFs',
      iconoCompras:           m.PORTAL_ICONO_COMPRAS || '🛒',

      tituloSimulador:        m.PORTAL_TITULO_SIMULADOR || 'Simulador de Carga 3D',
      subtituloSimulador:     m.PORTAL_SUBTITULO_SIMULADOR || 'Cálculo y visualización 3D de cargas',
      iconoSimulador:         m.PORTAL_ICONO_SIMULADOR || '📐',
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
