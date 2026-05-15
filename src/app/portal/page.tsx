'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'

type User = { email: string; nombre?: string; rol: string; roles_extra?: string[]; puesto?: string; departamento?: string; telefono?: string; foto_url?: string }
type AccesoFlags = { puede_helpdesk_admin: boolean; puede_compras_admin: boolean; es_admin: boolean }

type Branding = {
  name: string; logoUrl: string;
  saludo: string; mensajeBienvenida: string;
  tituloHelpdesk: string; subtituloHelpdesk: string; iconoHelpdesk: string;
  tituloCompras: string; subtituloCompras: string; iconoCompras: string;
  tituloSimulador: string; subtituloSimulador: string; iconoSimulador: string;
}
type HeroSlide = { key: string; badge: string; title: string; subtitle: string; href: string; accent: string; icon: string; enabled: boolean }
type Anuncio = { id: string; categoria: string; titulo: string; mensaje?: string; icono?: string; color?: string; prioridad: number; publicado_at: string; expira_at?: string; imagen_url?: string; autor_nombre?: string; link?: string }
type Cumple = { id: string; nombre: string; tipo: string; mes: number; dia: number; anio?: number; departamento?: string; foto_url?: string; fecha_proxima: string; dias_faltantes: number }
type Evento = { id: string; titulo: string; descripcion?: string; tipo: string; fecha: string; hora_inicio?: string; lugar?: string; icono?: string; color?: string }
type Tarea = { id: string; titulo: string; fecha: string; status: string; prioridad: string; modulo?: string }
type Frase = { id: string; texto: string; autor?: string }

const DEFAULT_BRAND: Branding = {
  name: 'Portal Ultralam', logoUrl: '',
  saludo: 'equipo Ultralam', mensajeBienvenida: '',
  tituloHelpdesk: 'Helpdesk', subtituloHelpdesk: 'Soporte técnico, incidencias y base de conocimiento', iconoHelpdesk: '🎫',
  tituloCompras: 'Sistema de Compras', subtituloCompras: 'Órdenes, aprobaciones por nivel, proveedores y PDFs', iconoCompras: '🛒',
  tituloSimulador: 'Simulador de Carga 3D', subtituloSimulador: 'Cálculo y visualización 3D de cargas', iconoSimulador: '📐',
}

export default function PortalPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [accesos, setAccesos] = useState<AccesoFlags>({ puede_helpdesk_admin: false, puede_compras_admin: false, es_admin: false })
  const [ordenes, setOrdenes] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [brand, setBrand] = useState<Branding>(DEFAULT_BRAND)
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [cumples, setCumples] = useState<Cumple[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [frase, setFrase] = useState<Frase | null>(null)
  const [flags, setFlags] = useState<Record<string, boolean>>({})

  const [heroIdx, setHeroIdx] = useState(0)
  const [autoRotate, setAutoRotate] = useState(true)
  const [anuncioOpen, setAnuncioOpen] = useState<Anuncio | null>(null)

  useEffect(() => {
    const t = localStorage.getItem('auth_token') ?? ''
    if (!t) { router.replace('/login'); return }
    setToken(t)

    Promise.all([
      fetch('/api/auth/resume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: t }) }).then(r => r.json()),
      fetch('/api/users/me', { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
      fetch('/api/compras/dashboard', { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()).catch(() => ({ ok: false })),
      fetch('/api/avisos/dashboard', { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()).catch(() => ({ ok: false })),
      fetch('/api/branding').then(r => r.json()).catch(() => ({ ok: false })),
    ]).then(([resume, me, dash, av, br]) => {
      if (!resume.ok) { router.replace('/login'); return }
      if (me.ok && me.user) setUser({ ...me.user, roles_extra: me.roles_extra || [] })
      if (dash.ok && dash.dashboard) {
        setOrdenes(dash.dashboard.ordenes || [])
        setTickets(dash.dashboard.tickets || [])
        setAccesos(dash.dashboard.accesos)
      }
      if (av.ok) {
        setAnuncios(av.anuncios || [])
        setCumples(av.cumpleanos || [])
        setEventos(av.eventos || [])
        setTareas(av.tareas || [])
        setFrase(av.frase_dia || null)
        setFlags(av.flags || {})
      }
      if (br.ok) setBrand({ ...DEFAULT_BRAND, ...br })
    }).catch(() => router.replace('/login'))
      .finally(() => setLoading(false))
  }, [router])

  const heroSlides: HeroSlide[] = useMemo(() => {
    const slides: HeroSlide[] = []
    if (flags.HELPDESK_HABILITADO !== false) slides.push({
      key: 'helpdesk', badge: 'DESTACADO', title: brand.tituloHelpdesk, subtitle: brand.subtituloHelpdesk,
      href: '/helpdesk', accent: '#3b82f6', icon: brand.iconoHelpdesk, enabled: true,
    })
    if (flags.COMPRAS_HABILITADO !== false) slides.push({
      key: 'compras', badge: 'DESTACADO', title: brand.tituloCompras, subtitle: brand.subtituloCompras,
      href: '/compras', accent: '#ffd400', icon: brand.iconoCompras, enabled: true,
    })
    slides.push({
      key: 'simulador',
      badge: flags.SIMULADOR_HABILITADO ? 'NUEVO' : 'PRÓXIMAMENTE',
      title: brand.tituloSimulador, subtitle: brand.subtituloSimulador,
      href: '#', accent: '#a78bfa', icon: brand.iconoSimulador,
      enabled: !!flags.SIMULADOR_HABILITADO,
    })
    return slides
  }, [flags, brand])

  useEffect(() => {
    if (!autoRotate || heroSlides.length === 0) return
    if (flags.PORTAL_HERO_ROTATIVO === false) return
    const id = setInterval(() => setHeroIdx(i => (i + 1) % heroSlides.length), 6000)
    return () => clearInterval(id)
  }, [autoRotate, heroSlides.length, flags.PORTAL_HERO_ROTATIVO])

  const saludo = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ul-bg)' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--ul-border)', borderTopColor: 'var(--ul-accent)', borderRadius: '50%', animation: 'ul-spin .8s linear infinite' }} />
      </div>
    )
  }
  if (!user) return null

  const slide = heroSlides[heroIdx] || heroSlides[0]
  const ordenesPendientes = ordenes.filter(o => o.estatus === 'pendiente_aprob').length
  const ticketsAbiertos = tickets.filter(t => !['resuelto', 'cerrado'].includes(t.estado)).length

  const nav = [
    {
      title: 'PRINCIPAL',
      items: [
        { key: 'inicio', label: 'Inicio', icon: '◆' },
        ...(flags.HELPDESK_HABILITADO !== false ? [{ key: 'helpdesk', label: brand.tituloHelpdesk, icon: brand.iconoHelpdesk, href: '/helpdesk', badge: ticketsAbiertos || undefined }] : []),
        ...(flags.COMPRAS_HABILITADO !== false ? [{ key: 'compras', label: brand.tituloCompras, icon: brand.iconoCompras, href: '/compras', badge: ordenesPendientes || undefined }] : []),
        { key: 'simulador', label: brand.tituloSimulador, icon: brand.iconoSimulador, onClick: () => alert(flags.SIMULADOR_HABILITADO ? 'Cargando simulador...' : 'Próximamente') },
      ],
    },
  ]
  if (accesos.es_admin) {
    nav.push({
      title: 'ADMINISTRACIÓN',
      items: [{ key: 'admin', label: 'Panel general', icon: '⚙', href: '/admin' }],
    })
  }

  return (
    <AppShell
      app="portal"
      appLabel={(brand.name || 'PORTAL').toUpperCase().slice(0, 14)}
      appVersion="v3.0.0"
      appLogoUrl={brand.logoUrl}
      nav={nav}
      activeKey="inicio"
      user={user}
      token={token}
      showSearch={flags.PORTAL_BUSQUEDA !== false}
      showNotifications={flags.PORTAL_NOTIFICACIONES !== false}
    >
      {/* Saludo */}
      <div style={{ marginBottom: 22 }}>
        <h1 className="ul-display" style={{ fontSize: 32, color: 'var(--ul-text)', letterSpacing: '-0.5px' }}>
          {saludo}, {brand.saludo}
        </h1>
        <div style={{ fontSize: 13, color: 'var(--ul-text-subtle)', marginTop: 6 }}>
          {brand.mensajeBienvenida || `${heroSlides.filter(s => s.enabled).length} herramientas activas · ${eventos.length} eventos próximos`}
        </div>
      </div>

      {/* Hero + columna derecha */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, 1fr)', gap: 18, marginBottom: 22 }}>
        <Hero slide={slide} idx={heroIdx} total={heroSlides.length} onGo={() => slide.enabled && slide.href !== '#' && router.push(slide.href)} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {flags.PORTAL_FRASE_DIA !== false && frase && (
            <Panel title="FRASE DEL DÍA" icon="✦">
              <p style={{ fontSize: 13, color: 'var(--ul-text)', lineHeight: 1.55, margin: 0, fontStyle: 'italic' }}>
                "{frase.texto}"
              </p>
              {frase.autor && <div style={{ fontSize: 11, color: 'var(--ul-text-subtle)', marginTop: 8, textAlign: 'right' }}>— {frase.autor}</div>}
            </Panel>
          )}

          {flags.PORTAL_ESPACIO_AMENO !== false && <EspacioAmeno cumples={cumples} eventos={eventos} />}
        </div>
      </div>

      {/* Indicador slide */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {heroSlides.map((s, i) => (
          <button key={s.key} onClick={() => { setHeroIdx(i); setAutoRotate(false) }}
            style={{
              padding: '6px 14px', borderRadius: 999, fontSize: 11, fontWeight: 700,
              border: '1px solid ' + (heroIdx === i ? 'var(--ul-text)' : 'var(--ul-border)'),
              background: heroIdx === i ? 'var(--ul-text)' : 'transparent',
              color: heroIdx === i ? 'var(--ul-bg)' : 'var(--ul-text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: s.enabled ? 1 : .55,
            }}>
            <span>{s.icon}</span>{s.title}
          </button>
        ))}
        <span style={{ fontSize: 11, color: 'var(--ul-text-subtle)', marginLeft: 8 }}>{heroIdx + 1} / {heroSlides.length}</span>
      </div>

      {/* TABLERO */}
      {flags.PORTAL_TABLERO !== false && (
        <>
          <div style={{ marginBottom: 10 }}>
            <h2 className="ul-display" style={{ fontSize: 14, color: 'var(--ul-text)', letterSpacing: '1px' }}>TABLERO</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            <Panel title="ANUNCIOS" icon="📢">
              {anuncios.length === 0 ? (
                <Empty>Sin anuncios</Empty>
              ) : anuncios.slice(0, 6).map((a, i, arr) => (
                <button key={a.id} onClick={() => setAnuncioOpen(a)} style={anuncioBtn(i < arr.length - 1)}>
                  <span style={categoriaBadge}>{a.categoria}</span>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <div style={{ fontSize: 12, color: 'var(--ul-text)', fontWeight: 600 }}>{a.icono} {a.titulo}</div>
                    {a.mensaje && <div style={{ fontSize: 11, color: 'var(--ul-text-muted)', marginTop: 3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{a.mensaje}</div>}
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--ul-text-subtle)', whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>{formatFechaCorta(a.publicado_at)}</span>
                </button>
              ))}
            </Panel>

            <Panel title="NOTIFICACIONES" icon="🔔">
              <NotifsResumen ordenesPendientes={ordenesPendientes} ticketsAbiertos={ticketsAbiertos} />
            </Panel>

            <Panel title="TAREAS / CALENDARIO" icon="📅">
              {tareas.length === 0 ? <Empty>Sin tareas próximas</Empty> : tareas.slice(0, 6).map((t, i, arr) => {
                const fecha = new Date(t.fecha)
                const dia = fecha.getDate()
                const mes = fecha.toLocaleDateString('es-MX', { month: 'short' })
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--ul-border)' : 'none' }}>
                    <div style={{ width: 36, minWidth: 36, height: 40, borderRadius: 8, background: 'var(--ul-surface-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      <div style={{ fontSize: 9, color: 'var(--ul-accent)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{mes}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ul-text)', lineHeight: 1 }}>{dia}</div>
                    </div>
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--ul-text)', textDecoration: t.status === 'completada' ? 'line-through' : 'none', opacity: t.status === 'completada' ? .55 : 1 }}>{t.titulo}</span>
                    {t.prioridad === 'alta' && <span style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, background: 'var(--ul-danger)', color: '#fff', fontWeight: 700 }}>!</span>}
                  </div>
                )
              })}
            </Panel>
          </div>
        </>
      )}

      {/* Modal de anuncio */}
      {anuncioOpen && <AnuncioModal a={anuncioOpen} onClose={() => setAnuncioOpen(null)} />}
    </AppShell>
  )
}

/* ────────── Hero ────────── */
function Hero({ slide, idx, total, onGo }: { slide: HeroSlide; idx: number; total: number; onGo: () => void }) {
  return (
    <div onClick={onGo} style={{
      position: 'relative', cursor: slide.enabled && slide.href !== '#' ? 'pointer' : 'default',
      background: 'linear-gradient(135deg, var(--ul-surface) 0%, var(--ul-bg-elev) 100%)',
      border: '1px solid var(--ul-border)', borderRadius: 18, overflow: 'hidden',
      minHeight: 280, display: 'flex', flexDirection: 'column', boxShadow: 'var(--ul-shadow-md)',
    }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(circle at 80% 20%, ${slide.accent}1F, transparent 50%)`, pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 24px, rgba(255,255,255,.015) 24px 25px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', padding: 28, display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1px', padding: '4px 10px', borderRadius: 4, background: 'var(--ul-accent)', color: 'var(--ul-accent-fg)' }}>{slide.badge}</span>
          {slide.enabled && (
            <span style={{ fontSize: 10, color: 'var(--ul-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ul-success)' }} />online
            </span>
          )}
        </div>
        <div style={{ marginTop: 'auto' }}>
          <div style={{ fontSize: 60, lineHeight: 1, marginBottom: 12 }}>{slide.icon}</div>
          <h2 className="ul-display" style={{ fontSize: 36, color: 'var(--ul-text)', letterSpacing: '-0.5px', lineHeight: 1.05, marginBottom: 8 }}>{slide.title}</h2>
          <p style={{ fontSize: 14, color: 'var(--ul-text-muted)', lineHeight: 1.5, maxWidth: 480 }}>{slide.subtitle}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--ul-border)' }}>
          <span style={{ fontSize: 11, color: 'var(--ul-text-subtle)' }}>{slide.enabled && slide.href !== '#' ? 'Click ↗ para abrir' : 'No disponible aún'}</span>
          <span style={{ fontSize: 11, color: 'var(--ul-text-subtle)' }}>{idx + 1}/{total} · auto-rotate</span>
        </div>
      </div>
    </div>
  )
}

/* ────────── Espacio Ameno (mejorado visual) ────────── */
function EspacioAmeno({ cumples, eventos }: { cumples: Cumple[]; eventos: Evento[] }) {
  const items = useMemo(() => {
    const arr: any[] = []
    for (const c of cumples) {
      const fecha = new Date(c.fecha_proxima)
      arr.push({ kind: 'cumple', id: c.id, fecha, when: cumpleBadge(c.dias_faltantes), data: c })
    }
    for (const e of eventos) {
      const fecha = new Date(e.fecha)
      const dias = Math.ceil((fecha.getTime() - Date.now()) / 86400000)
      arr.push({ kind: 'evento', id: e.id, fecha, when: cumpleBadge(dias), data: e })
    }
    arr.sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
    return arr.slice(0, 5)
  }, [cumples, eventos])

  if (items.length === 0) {
    return (
      <Panel title="ESPACIO AMENO" icon="🎈">
        <Empty>Sin cumpleaños ni eventos próximos</Empty>
      </Panel>
    )
  }

  return (
    <Panel title="ESPACIO AMENO" icon="🎈">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it, i) => it.kind === 'cumple' ? (
          <CumpleCard key={it.id} c={it.data} when={it.when} />
        ) : (
          <EventoCard key={it.id} e={it.data} when={it.when} />
        ))}
      </div>
    </Panel>
  )
}

function CumpleCard({ c, when }: { c: Cumple; when: { txt: string; tone: string } }) {
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const esCumpleHoy = c.dias_faltantes === 0
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: 10,
      borderRadius: 10,
      background: esCumpleHoy ? 'linear-gradient(135deg, rgba(255,212,0,.18), rgba(255,212,0,.05))' : 'var(--ul-surface-2)',
      border: '1px solid ' + (esCumpleHoy ? 'var(--ul-accent)' : 'var(--ul-border)'),
      position: 'relative', overflow: 'hidden',
    }}>
      {esCumpleHoy && (
        <span aria-hidden style={{ position: 'absolute', top: -8, right: -8, fontSize: 36, opacity: .25, transform: 'rotate(20deg)' }}>🎉</span>
      )}
      <div style={{ width: 44, minWidth: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: 'var(--ul-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid var(--ul-bg-elev)', boxShadow: '0 2px 8px rgba(0,0,0,.15)' }}>
        {c.foto_url
          ? <img src={c.foto_url} alt={c.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--ul-accent-fg)' }}>{c.nombre.charAt(0).toUpperCase()}</span>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ul-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre}</span>
          {esCumpleHoy && <span style={{ fontSize: 13 }}>🎂</span>}
        </div>
        <div style={{ fontSize: 10, color: 'var(--ul-text-muted)', marginTop: 2 }}>
          {c.departamento ? <span>{c.departamento} · </span> : null}
          {c.tipo === 'aniversario' && c.anio
            ? `${new Date().getFullYear() - c.anio} años en Ultralam`
            : c.tipo === 'aniversario' ? 'Aniversario' : 'Cumpleaños'}
        </div>
        <div style={{ fontSize: 10, color: 'var(--ul-text-subtle)', marginTop: 2, fontWeight: 600 }}>
          {meses[c.mes - 1]} {c.dia}
        </div>
      </div>
      <div style={{
        fontSize: 10, fontWeight: 800, letterSpacing: '.5px', whiteSpace: 'nowrap',
        padding: '4px 9px', borderRadius: 999,
        background: when.tone === 'hot' ? 'var(--ul-accent)' : 'var(--ul-surface-hover)',
        color: when.tone === 'hot' ? 'var(--ul-accent-fg)' : 'var(--ul-text-muted)',
      }}>{when.txt}</div>
    </div>
  )
}

function EventoCard({ e, when }: { e: Evento; when: { txt: string; tone: string } }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10,
      background: 'var(--ul-surface-2)', border: '1px solid var(--ul-border)',
    }}>
      <div style={{ width: 44, minWidth: 44, height: 44, borderRadius: 10, background: (e.color || '#a78bfa') + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, border: '1px solid ' + (e.color || '#a78bfa') + '55' }}>
        {e.icono || '🎉'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ul-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.titulo}</div>
        <div style={{ fontSize: 10, color: 'var(--ul-text-muted)', marginTop: 2 }}>{e.lugar || e.tipo}{e.hora_inicio ? ` · ${e.hora_inicio.slice(0, 5)}` : ''}</div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.5px', whiteSpace: 'nowrap', padding: '4px 9px', borderRadius: 999, background: when.tone === 'hot' ? 'var(--ul-accent)' : 'var(--ul-surface-hover)', color: when.tone === 'hot' ? 'var(--ul-accent-fg)' : 'var(--ul-text-muted)' }}>{when.txt}</div>
    </div>
  )
}

/* ────────── Notificaciones resumen ────────── */
function NotifsResumen({ ordenesPendientes, ticketsAbiertos }: { ordenesPendientes: number; ticketsAbiertos: number }) {
  const items: { tag: string; text: string; href: string }[] = []
  if (ordenesPendientes > 0) items.push({ tag: 'COMPRAS', text: `${ordenesPendientes} OC pendientes de aprobación`, href: '/compras' })
  if (ticketsAbiertos > 0) items.push({ tag: 'HELPDESK', text: `${ticketsAbiertos} tickets abiertos`, href: '/helpdesk' })
  if (items.length === 0) return <Empty>Todo al día ✓</Empty>
  const router = useRouter()
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((n, i) => (
        <button key={i} onClick={() => router.push(n.href)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < items.length - 1 ? '1px solid var(--ul-border)' : 'none', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ul-accent)', flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ul-text-muted)', letterSpacing: '.5px', padding: '2px 6px', borderRadius: 4, background: 'var(--ul-surface-2)' }}>{n.tag}</span>
          <span style={{ flex: 1, fontSize: 12, color: 'var(--ul-text)' }}>{n.text}</span>
          <span style={{ fontSize: 11, color: 'var(--ul-text-subtle)' }}>→</span>
        </button>
      ))}
    </div>
  )
}

/* ────────── Modal de Anuncio ────────── */
function AnuncioModal({ a, onClose }: { a: Anuncio; onClose: () => void }) {
  const tonePri = a.prioridad === 2 ? 'danger' : a.prioridad === 1 ? 'accent' : 'normal'
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'var(--ul-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 100, animation: 'ul-fade-in .15s ease both' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, maxHeight: '92vh', overflow: 'auto', background: 'var(--ul-bg-elev)', border: '1px solid var(--ul-border)', borderRadius: 18, boxShadow: 'var(--ul-shadow-lg)' }}>
        {a.imagen_url && (
          <div style={{ width: '100%', height: 240, overflow: 'hidden', borderTopLeftRadius: 18, borderTopRightRadius: 18, background: 'var(--ul-surface-2)' }}>
            <img src={a.imagen_url} alt={a.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
        <div style={{ padding: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ ...categoriaBadge, fontSize: 10 }}>{a.categoria}</span>
            {tonePri !== 'normal' && (
              <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 9px', borderRadius: 4, background: tonePri === 'danger' ? 'var(--ul-danger)' : 'var(--ul-accent)', color: tonePri === 'danger' ? '#fff' : 'var(--ul-accent-fg)', letterSpacing: '.5px' }}>
                {a.prioridad === 2 ? 'URGENTE' : 'DESTACADO'}
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--ul-text-subtle)', marginLeft: 'auto' }}>
              {new Date(a.publicado_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <h2 className="ul-display" style={{ fontSize: 24, color: 'var(--ul-text)', letterSpacing: '-0.3px', marginBottom: 12 }}>
            <span style={{ marginRight: 8 }}>{a.icono}</span>{a.titulo}
          </h2>
          {a.mensaje && <p style={{ fontSize: 14, color: 'var(--ul-text-muted)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{a.mensaje}</p>}
          {a.autor_nombre && <div style={{ fontSize: 11, color: 'var(--ul-text-subtle)', marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--ul-border)' }}>Publicado por: {a.autor_nombre}</div>}
          {a.link && (
            <a href={a.link} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 16, padding: '8px 14px', background: 'var(--ul-accent)', color: 'var(--ul-accent-fg)', borderRadius: 8, fontWeight: 700, fontSize: 13 }}>
              Más información ↗
            </a>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
            <button onClick={onClose} style={{ padding: '9px 18px', background: 'var(--ul-surface-2)', border: '1px solid var(--ul-border)', borderRadius: 8, color: 'var(--ul-text)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ────────── Primitivas ────────── */
function Panel({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--ul-surface)', border: '1px solid var(--ul-border)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="ul-display" style={{ fontSize: 11, color: 'var(--ul-text)', letterSpacing: '1px' }}>{title}</div>
        {icon && <span style={{ fontSize: 13, opacity: .6 }}>{icon}</span>}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: 'var(--ul-text-subtle)', padding: '12px 0', textAlign: 'center' }}>{children}</div>
}

/* ────────── Estilos compartidos ────────── */
const categoriaBadge: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 4,
  background: 'var(--ul-surface-2)', color: 'var(--ul-text-muted)', letterSpacing: '.5px', whiteSpace: 'nowrap', alignSelf: 'flex-start',
}
const anuncioBtn = (withBorder: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', width: '100%', textAlign: 'left',
  background: 'transparent', border: 'none', cursor: 'pointer',
  borderBottom: withBorder ? '1px solid var(--ul-border)' : 'none',
})

/* ────────── Utils ────────── */
function formatFechaCorta(iso: string): string {
  try {
    const d = new Date(iso)
    const hoy = new Date()
    const diff = Math.round((d.getTime() - new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime()) / 86400000)
    if (diff === 0) return 'Hoy'
    if (diff === 1) return 'Mañana'
    if (diff === -1) return 'Ayer'
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    return `${d.getDate()} ${meses[d.getMonth()]}`
  } catch { return iso }
}
function cumpleBadge(dias: number): { txt: string; tone: string } {
  if (dias === 0) return { txt: 'HOY', tone: 'hot' }
  if (dias === 1) return { txt: 'MAÑANA', tone: 'hot' }
  if (dias <= 7) return { txt: 'ESTA SEMANA', tone: 'normal' }
  if (dias <= 14) return { txt: '2 SEMANAS', tone: 'normal' }
  if (dias <= 30) return { txt: `${dias} DÍAS`, tone: 'normal' }
  return { txt: `EN ${dias} D.`, tone: 'normal' }
}
