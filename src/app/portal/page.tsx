'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'

type User = { email: string; nombre?: string; rol: string; roles_extra?: string[]; puesto?: string; departamento?: string; telefono?: string }
type AccesoFlags = { puede_helpdesk_admin: boolean; puede_compras_admin: boolean; es_admin: boolean }

type HeroSlide = {
  key: string
  badge: string
  title: string
  subtitle: string
  href: string
  accent: string
  icon: string
  enabled: boolean
}

type Anuncio = { id: string; categoria: string; titulo: string; mensaje?: string; icono?: string; color?: string; prioridad: number; publicado_at: string; expira_at?: string }
type Cumple = { id: string; nombre: string; tipo: string; mes: number; dia: number; anio?: number; departamento?: string; foto_url?: string; fecha_proxima: string; dias_faltantes: number }
type Evento = { id: string; titulo: string; descripcion?: string; tipo: string; fecha: string; hora_inicio?: string; lugar?: string; icono?: string; color?: string }
type Tarea = { id: string; titulo: string; fecha: string; status: string; prioridad: string; modulo?: string }
type Notif = { id: string; tipo: string; titulo?: string; mensaje: string; link?: string; leida: boolean; created_at: string }
type Frase = { id: string; texto: string; autor?: string }

export default function PortalPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [accesos, setAccesos] = useState<AccesoFlags>({ puede_helpdesk_admin: false, puede_compras_admin: false, es_admin: false })
  const [ordenes, setOrdenes] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Avisos
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [cumples, setCumples] = useState<Cumple[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [frase, setFrase] = useState<Frase | null>(null)
  const [flags, setFlags] = useState<Record<string, boolean>>({})

  // Hero rotativo
  const [heroIdx, setHeroIdx] = useState(0)
  const [autoRotate, setAutoRotate] = useState(true)

  useEffect(() => {
    const t = localStorage.getItem('auth_token') ?? ''
    if (!t) { router.replace('/login'); return }
    setToken(t)

    Promise.all([
      fetch('/api/auth/resume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: t }) }).then(r => r.json()),
      fetch('/api/users/me', { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
      fetch('/api/compras/dashboard', { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()).catch(() => ({ ok: false })),
      fetch('/api/avisos/dashboard', { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()).catch(() => ({ ok: false })),
    ]).then(([resume, me, dash, av]) => {
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
        setNotifs(av.notificaciones || [])
        setFrase(av.frase_dia || null)
        setFlags(av.flags || {})
      }
    }).catch(() => router.replace('/login'))
      .finally(() => setLoading(false))
  }, [router])

  // Definir hero según flags
  const heroSlides: HeroSlide[] = useMemo(() => {
    const slides: HeroSlide[] = []
    if (flags.HELPDESK_HABILITADO !== false) slides.push({
      key: 'helpdesk', badge: 'DESTACADO', title: 'Helpdesk',
      subtitle: 'Soporte técnico, incidencias y base de conocimiento',
      href: '/helpdesk', accent: '#3b82f6', icon: '🎫', enabled: true,
    })
    if (flags.COMPRAS_HABILITADO !== false) slides.push({
      key: 'compras', badge: 'DESTACADO', title: 'Sistema de Compras',
      subtitle: 'Órdenes, aprobaciones por nivel, proveedores y PDFs',
      href: '/compras', accent: '#ffd400', icon: '🛒', enabled: true,
    })
    slides.push({
      key: 'simulador',
      badge: flags.SIMULADOR_HABILITADO ? 'NUEVO' : 'PRÓXIMAMENTE',
      title: 'Simulador de Carga 3D',
      subtitle: 'Cálculo y visualización 3D de cargas de transporte',
      href: '#', accent: '#a78bfa', icon: '📐',
      enabled: !!flags.SIMULADOR_HABILITADO,
    })
    return slides
  }, [flags])

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

  // Combinar notificaciones del sistema con métricas
  const notifsExtra: { text: string; when: string; tag?: string }[] = []
  if (ordenesPendientes > 0) notifsExtra.push({ tag: 'COMPRAS', text: `Tienes ${ordenesPendientes} OC pendientes de aprobación`, when: 'hoy' })
  const ticketsAbiertos = tickets.filter(t => !['resuelto', 'cerrado'].includes(t.estado)).length
  if (ticketsAbiertos > 0) notifsExtra.push({ tag: 'HELPDESK', text: `Tienes ${ticketsAbiertos} tickets abiertos`, when: 'hoy' })

  const nav = [
    {
      title: 'PRINCIPAL',
      items: [
        { key: 'inicio', label: 'Inicio', icon: '◆' },
        ...(flags.HELPDESK_HABILITADO !== false ? [{ key: 'helpdesk', label: 'Helpdesk', icon: '🎫', href: '/helpdesk', badge: ticketsAbiertos || undefined }] : []),
        ...(flags.COMPRAS_HABILITADO !== false ? [{ key: 'compras', label: 'Compras', icon: '🛒', href: '/compras', badge: ordenesPendientes || undefined }] : []),
        { key: 'simulador', label: 'Simulador 3D', icon: '📐', onClick: () => alert(flags.SIMULADOR_HABILITADO ? 'Cargando simulador...' : 'Próximamente') },
      ],
    },
  ]
  if (accesos.es_admin) {
    nav.push({
      title: 'ADMINISTRACIÓN',
      items: [
        { key: 'admin', label: 'Panel general', icon: '⚙', onClick: () => alert('Panel admin — disponible en Fase 3') },
      ],
    })
  }

  return (
    <AppShell app="portal" appLabel="ULTRA PORTAL" appVersion="v3.0.0" nav={nav} activeKey="inicio" user={user}>
      {/* Saludo */}
      <div style={{ marginBottom: 22 }}>
        <h1 className="ul-display" style={{ fontSize: 32, color: 'var(--ul-text)', letterSpacing: '-0.5px' }}>
          {saludo}, equipo Ultralam
        </h1>
        <div style={{ fontSize: 13, color: 'var(--ul-text-subtle)', marginTop: 6 }}>
          {heroSlides.filter(s => s.enabled).length} herramientas activas · {eventos.length} eventos próximos · {notifs.length} notificaciones
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

          {flags.PORTAL_ESPACIO_AMENO !== false && (
            <Panel title="ESPACIO AMENO" icon="🎈">
              {cumples.length === 0 && eventos.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--ul-text-subtle)', padding: '8px 0', textAlign: 'center' }}>
                  Sin cumpleaños ni eventos próximos
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {cumples.slice(0, 4).map((c, i) => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < Math.min(cumples.length, 4) - 1 || eventos.length > 0 ? '1px solid var(--ul-border)' : 'none' }}>
                      {c.foto_url ? (
                        <img src={c.foto_url} alt={c.nombre} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--ul-accent)', color: 'var(--ul-accent-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                          {c.nombre.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: 'var(--ul-text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre}</div>
                        <div style={{ fontSize: 10, color: 'var(--ul-text-subtle)' }}>{c.departamento || c.tipo} · {c.tipo === 'aniversario' && c.anio ? `${new Date().getFullYear() - c.anio} años` : 'cumpleaños'}</div>
                      </div>
                      <div style={{ fontSize: 9, color: c.dias_faltantes === 0 ? 'var(--ul-accent)' : 'var(--ul-text-subtle)', fontWeight: 700, letterSpacing: '.5px', whiteSpace: 'nowrap' }}>
                        {c.dias_faltantes === 0 ? 'HOY' : c.dias_faltantes === 1 ? 'MAÑANA' : `${c.dias_faltantes} DÍAS`}
                      </div>
                    </div>
                  ))}
                  {eventos.slice(0, 3).map((e, i) => (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < Math.min(eventos.length, 3) - 1 ? '1px solid var(--ul-border)' : 'none' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--ul-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                        {e.icono || '🎉'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: 'var(--ul-text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.titulo}</div>
                        <div style={{ fontSize: 10, color: 'var(--ul-text-subtle)' }}>{e.lugar || e.tipo}</div>
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--ul-text-subtle)', fontWeight: 700, letterSpacing: '.5px', whiteSpace: 'nowrap' }}>
                        {formatFechaCorta(e.fecha)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}
        </div>
      </div>

      {/* Indicador de slide */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {heroSlides.map((s, i) => (
          <button
            key={s.key}
            onClick={() => { setHeroIdx(i); setAutoRotate(false) }}
            style={{
              padding: '6px 14px', borderRadius: 999, fontSize: 11, fontWeight: 700,
              border: '1px solid ' + (heroIdx === i ? 'var(--ul-text)' : 'var(--ul-border)'),
              background: heroIdx === i ? 'var(--ul-text)' : 'transparent',
              color: heroIdx === i ? 'var(--ul-bg)' : 'var(--ul-text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              opacity: s.enabled ? 1 : 0.55,
            }}
          >
            <span>{s.icon}</span>{s.title}
          </button>
        ))}
        <span style={{ fontSize: 11, color: 'var(--ul-text-subtle)', marginLeft: 8 }}>
          {heroIdx + 1} / {heroSlides.length}
        </span>
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
                <div style={{ fontSize: 12, color: 'var(--ul-text-subtle)', padding: '12px 0' }}>Sin anuncios</div>
              ) : (
                anuncios.slice(0, 6).map((a, i) => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < Math.min(anuncios.length, 6) - 1 ? '1px solid var(--ul-border)' : 'none' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 4, background: 'var(--ul-surface-2)', color: 'var(--ul-text-muted)', letterSpacing: '.5px', whiteSpace: 'nowrap' }}>{a.categoria}</span>
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--ul-text)' }}>{a.titulo}</span>
                    <span style={{ fontSize: 10, color: 'var(--ul-text-subtle)', whiteSpace: 'nowrap' }}>{formatFechaCorta(a.publicado_at)}</span>
                  </div>
                ))
              )}
            </Panel>

            <Panel title="NOTIFICACIONES" icon="🔔">
              {(notifs.length + notifsExtra.length) === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--ul-text-subtle)', padding: '12px 0' }}>Sin notificaciones</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {notifsExtra.map((n, i) => (
                    <div key={'extra-' + i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--ul-border)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ul-accent)', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, color: 'var(--ul-text)' }}>{n.text}</span>
                      <span style={{ fontSize: 10, color: 'var(--ul-text-subtle)' }}>{n.when}</span>
                    </div>
                  ))}
                  {notifs.slice(0, 6).map((n, i) => (
                    <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < Math.min(notifs.length, 6) - 1 ? '1px solid var(--ul-border)' : 'none', cursor: n.link ? 'pointer' : 'default' }}
                      onClick={() => n.link && (window.location.href = n.link)}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ul-accent)', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, color: 'var(--ul-text)' }}>{n.mensaje}</span>
                      <span style={{ fontSize: 10, color: 'var(--ul-text-subtle)' }}>{formatTimeAgo(n.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="TAREAS / CALENDARIO" icon="📅">
              {tareas.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--ul-text-subtle)', padding: '12px 0' }}>Sin tareas próximas</div>
              ) : (
                tareas.slice(0, 6).map((t, i) => {
                  const fecha = new Date(t.fecha)
                  const dia = fecha.getDate()
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < Math.min(tareas.length, 6) - 1 ? '1px solid var(--ul-border)' : 'none' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--ul-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--ul-text)' }}>{dia}</div>
                      <span style={{ flex: 1, fontSize: 12, color: 'var(--ul-text)', textDecoration: t.status === 'completada' ? 'line-through' : 'none', opacity: t.status === 'completada' ? .55 : 1 }}>{t.titulo}</span>
                      {t.prioridad === 'alta' && <span style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, background: 'var(--ul-danger)', color: '#fff', fontWeight: 700 }}>!</span>}
                    </div>
                  )
                })
              )}
            </Panel>
          </div>
        </>
      )}
    </AppShell>
  )
}

/* ────────── Hero ────────── */
function Hero({ slide, idx, total, onGo }: { slide: HeroSlide; idx: number; total: number; onGo: () => void }) {
  return (
    <div
      onClick={onGo}
      style={{
        position: 'relative', cursor: slide.enabled && slide.href !== '#' ? 'pointer' : 'default',
        background: 'linear-gradient(135deg, var(--ul-surface) 0%, var(--ul-bg-elev) 100%)',
        border: '1px solid var(--ul-border)', borderRadius: 18, overflow: 'hidden',
        minHeight: 280, display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--ul-shadow-md)',
      }}
    >
      <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(circle at 80% 20%, ${slide.accent}1F, transparent 50%)`, pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 24px, rgba(255,255,255,.015) 24px 25px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', padding: 28, display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1px', padding: '4px 10px', borderRadius: 4, background: 'var(--ul-accent)', color: 'var(--ul-accent-fg)' }}>{slide.badge}</span>
          {slide.enabled && (
            <span style={{ fontSize: 10, color: 'var(--ul-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ul-success)' }} />
              online
            </span>
          )}
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div style={{ fontSize: 60, lineHeight: 1, marginBottom: 12 }}>{slide.icon}</div>
          <h2 className="ul-display" style={{ fontSize: 36, color: 'var(--ul-text)', letterSpacing: '-0.5px', lineHeight: 1.05, marginBottom: 8 }}>{slide.title}</h2>
          <p style={{ fontSize: 14, color: 'var(--ul-text-muted)', lineHeight: 1.5, maxWidth: 480 }}>{slide.subtitle}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--ul-border)' }}>
          <span style={{ fontSize: 11, color: 'var(--ul-text-subtle)' }}>
            {slide.enabled && slide.href !== '#' ? 'Click ↗ para abrir' : 'No disponible aún'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--ul-text-subtle)' }}>{idx + 1}/{total} · auto-rotate</span>
        </div>
      </div>
    </div>
  )
}

/* ────────── Panel reutilizable ────────── */
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

/* ────────── Utils ────────── */
function formatFechaCorta(iso: string): string {
  try {
    const d = new Date(iso)
    const hoy = new Date()
    const diff = Math.round((d.getTime() - new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime()) / 86400000)
    if (diff === 0) return 'Hoy'
    if (diff === 1) return 'Mañana'
    if (diff === -1) return 'Ayer'
    if (diff > 0 && diff < 7) return `En ${diff} días`
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    return `${d.getDate()} ${meses[d.getMonth()]}`
  } catch { return iso }
}

function formatTimeAgo(iso: string): string {
  try {
    const d = new Date(iso)
    const diff = Date.now() - d.getTime()
    const min = Math.floor(diff / 60000)
    if (min < 1) return 'ahora'
    if (min < 60) return `${min}m`
    const h = Math.floor(min / 60)
    if (h < 24) return `${h}h`
    const days = Math.floor(h / 24)
    if (days < 7) return `${days}d`
    return formatFechaCorta(iso)
  } catch { return '' }
}
