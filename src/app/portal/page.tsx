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
}

const HERO_SLIDES: HeroSlide[] = [
  {
    key: 'helpdesk',
    badge: 'DESTACADO',
    title: 'Helpdesk',
    subtitle: 'Soporte técnico y tickets de incidencias',
    href: '/helpdesk',
    accent: '#3b82f6',
    icon: '🎫',
  },
  {
    key: 'compras',
    badge: 'DESTACADO',
    title: 'Sistema de Compras',
    subtitle: 'Órdenes de compra, aprobaciones y proveedores',
    href: '/compras',
    accent: '#ffd400',
    icon: '🛒',
  },
  {
    key: 'simulador',
    badge: 'PRÓXIMAMENTE',
    title: 'Simulador de Carga 3D',
    subtitle: 'Cálculo y visualización 3D de cargas',
    href: '#',
    accent: '#a78bfa',
    icon: '📐',
  },
]

const FRASES = [
  '"La calidad nunca es un accidente; es siempre el resultado de un esfuerzo inteligente." — John Ruskin',
  '"Lo que no se mide, no se mejora." — Peter Drucker',
  '"El secreto del éxito es la constancia en el propósito." — Benjamin Disraeli',
  '"La excelencia no es un acto, sino un hábito." — Aristóteles',
]

export default function PortalPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [accesos, setAccesos] = useState<AccesoFlags>({ puede_helpdesk_admin: false, puede_compras_admin: false, es_admin: false })
  const [ordenes, setOrdenes] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Hero rotativo
  const [heroIdx, setHeroIdx] = useState(1) // Compras destacado por default
  const [autoRotate, setAutoRotate] = useState(true)

  useEffect(() => {
    const t = localStorage.getItem('auth_token') ?? ''
    if (!t) { router.replace('/login'); return }
    setToken(t)

    Promise.all([
      fetch('/api/auth/resume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: t }) }).then(r => r.json()),
      fetch('/api/users/me', { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
      fetch('/api/compras/dashboard', { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()).catch(() => ({ ok: false })),
    ]).then(([resume, me, dash]) => {
      if (!resume.ok) { router.replace('/login'); return }
      if (me.ok && me.user) {
        setUser({ ...me.user, roles_extra: me.roles_extra || [] })
      }
      if (dash.ok && dash.dashboard) {
        setOrdenes(dash.dashboard.ordenes || [])
        setTickets(dash.dashboard.tickets || [])
        setAccesos(dash.dashboard.accesos)
      }
    }).catch(() => router.replace('/login'))
      .finally(() => setLoading(false))
  }, [router])

  useEffect(() => {
    if (!autoRotate) return
    const id = setInterval(() => setHeroIdx(i => (i + 1) % HERO_SLIDES.length), 6000)
    return () => clearInterval(id)
  }, [autoRotate])

  const saludo = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }, [])

  const fraseHoy = useMemo(() => FRASES[new Date().getDate() % FRASES.length], [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ul-bg)' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--ul-border)', borderTopColor: 'var(--ul-accent)', borderRadius: '50%', animation: 'ul-spin .8s linear infinite' }} />
      </div>
    )
  }
  if (!user) return null

  const slide = HERO_SLIDES[heroIdx]
  const ordenesPendientes = ordenes.filter(o => o.estatus === 'pendiente_aprob').length
  const ticketsAbiertos = tickets.filter(t => !['resuelto', 'cerrado'].includes(t.estado)).length

  // Datos mock para tablero (Fase 2 conecta con BD real)
  const anuncios = [
    { tag: 'ANUNCIO', text: 'Inventario actualizado de PVC blanco 1.5mm', date: 'Hoy' },
    { tag: 'CAPACIT.', text: 'Taller de uso del simulador 3D', date: 'Mañana' },
    { tag: 'SISTEMAS', text: 'Mantenimiento del simulador', date: 'Lun 28' },
  ]
  const notificaciones = [
    { text: `Tickets abiertos: ${ticketsAbiertos}`, when: 'hoy' },
    { text: `Órdenes pendientes de aprobación: ${ordenesPendientes}`, when: 'hoy' },
  ]
  const tareas = [
    { d: '27', text: 'Revisar OC pendientes', done: false },
    { d: '28', text: 'Inventario lambril', done: false },
    { d: '29', text: 'Reporte mensual', done: true },
  ]
  const cumples = [
    { ini: 'M', name: 'María González', sub: 'Ventas · cumpleaños', when: 'HOY' },
    { ini: 'C', name: 'Carlos Ruiz', sub: 'Producción · cumpleaños', when: '29 ABR' },
    { ini: 'A', name: 'Ana Pérez', sub: '5 años en Ultralam', when: 'ESTA SEMANA' },
    { ini: '🎉', name: 'Convivio mensual viernes 3pm en cafetería', sub: '', when: '30 ABR' },
  ]

  const nav = [
    {
      title: 'PRINCIPAL',
      items: [
        { key: 'inicio', label: 'Inicio', icon: '◆' },
        { key: 'helpdesk', label: 'Helpdesk', icon: '🎫', href: '/helpdesk' },
        { key: 'compras', label: 'Compras', icon: '🛒', href: '/compras', badge: ordenesPendientes || undefined },
        { key: 'simulador', label: 'Simulador 3D', icon: '📐', onClick: () => alert('Próximamente') },
      ],
    },
  ]
  if (accesos.es_admin) {
    nav.push({
      title: 'ADMINISTRACIÓN',
      items: [
        { key: 'admin', label: 'Panel general', icon: '⚙', onClick: () => alert('Panel admin — Fase 3') },
      ],
    })
  }

  return (
    <AppShell
      app="portal"
      appLabel="ULTRA PORTAL"
      appVersion="v3.0.0"
      nav={nav}
      activeKey="inicio"
      user={user}
    >
      {/* Saludo */}
      <div style={{ marginBottom: 22 }}>
        <h1 className="ul-display" style={{ fontSize: 32, color: 'var(--ul-text)', letterSpacing: '-0.5px' }}>
          {saludo}, equipo Ultralam
        </h1>
        <div style={{ fontSize: 13, color: 'var(--ul-text-subtle)', marginTop: 6 }}>
          3 herramientas activas · {tickets.length + ordenes.length} eventos próximos
        </div>
      </div>

      {/* Hero rotativo + columna derecha (frase + espacio ameno) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, 1fr)', gap: 18, marginBottom: 22 }}>
        <Hero slide={slide} idx={heroIdx} total={HERO_SLIDES.length} onPick={(i) => { setHeroIdx(i); setAutoRotate(false) }} onGo={() => slide.href !== '#' && router.push(slide.href)} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Panel title="FRASE DEL DÍA" icon="✦">
            <p style={{ fontSize: 13, color: 'var(--ul-text)', lineHeight: 1.55, margin: 0 }}>{fraseHoy}</p>
          </Panel>

          <Panel title="ESPACIO AMENO" icon="🎈">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cumples.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < cumples.length - 1 ? '1px solid var(--ul-border)' : 'none' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--ul-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'var(--ul-text)', flexShrink: 0 }}>{c.ini}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--ul-text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    {c.sub && <div style={{ fontSize: 10, color: 'var(--ul-text-subtle)' }}>{c.sub}</div>}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--ul-text-subtle)', fontWeight: 700, letterSpacing: '.5px', whiteSpace: 'nowrap' }}>{c.when}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* Indicador de slide + pills de selección */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 28 }}>
        {HERO_SLIDES.map((s, i) => (
          <button
            key={s.key}
            onClick={() => { setHeroIdx(i); setAutoRotate(false) }}
            style={{
              padding: '6px 14px', borderRadius: 999, fontSize: 11, fontWeight: 700,
              border: '1px solid ' + (heroIdx === i ? 'var(--ul-text)' : 'var(--ul-border)'),
              background: heroIdx === i ? 'var(--ul-text)' : 'transparent',
              color: heroIdx === i ? 'var(--ul-bg)' : 'var(--ul-text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span>{s.icon}</span>{s.title}
          </button>
        ))}
        <span style={{ fontSize: 11, color: 'var(--ul-text-subtle)', marginLeft: 8 }}>{heroIdx + 1} / {HERO_SLIDES.length}</span>
      </div>

      {/* TABLERO */}
      <div style={{ marginBottom: 12 }}>
        <h2 className="ul-display" style={{ fontSize: 14, color: 'var(--ul-text)', letterSpacing: '1px', marginBottom: 10 }}>TABLERO</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        <Panel title="ANUNCIOS" icon="📢">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {anuncios.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < anuncios.length - 1 ? '1px solid var(--ul-border)' : 'none' }}>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 4, background: 'var(--ul-surface-2)', color: 'var(--ul-text-muted)', letterSpacing: '.5px', whiteSpace: 'nowrap' }}>{a.tag}</span>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--ul-text)' }}>{a.text}</span>
                <span style={{ fontSize: 10, color: 'var(--ul-text-subtle)', whiteSpace: 'nowrap' }}>{a.date}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="NOTIFICACIONES" icon="🔔">
          {notificaciones.length === 0
            ? <div style={{ fontSize: 12, color: 'var(--ul-text-subtle)', padding: '12px 0' }}>Sin notificaciones</div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {notificaciones.map((n, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < notificaciones.length - 1 ? '1px solid var(--ul-border)' : 'none' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ul-accent)', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--ul-text)' }}>{n.text}</span>
                    <span style={{ fontSize: 10, color: 'var(--ul-text-subtle)' }}>{n.when}</span>
                  </div>
                ))}
              </div>
          }
        </Panel>

        <Panel title="TAREAS / CALENDARIO" icon="📅">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {tareas.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < tareas.length - 1 ? '1px solid var(--ul-border)' : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--ul-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--ul-text)' }}>{t.d}</div>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--ul-text)', textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? .55 : 1 }}>{t.text}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  )
}

/* ────────── Hero ────────── */
function Hero({ slide, idx, total, onPick, onGo }: { slide: HeroSlide; idx: number; total: number; onPick: (i: number) => void; onGo: () => void }) {
  return (
    <div
      onClick={onGo}
      style={{
        position: 'relative', cursor: slide.href !== '#' ? 'pointer' : 'default',
        background: 'linear-gradient(135deg, var(--ul-surface) 0%, var(--ul-bg-elev) 100%)',
        border: '1px solid var(--ul-border)', borderRadius: 18, overflow: 'hidden',
        minHeight: 280, display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--ul-shadow-md)',
      }}
    >
      {/* Patrón de fondo */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(circle at 80% 20%, ${slide.accent}1F, transparent 50%)`,
        pointerEvents: 'none',
      }} />
      {/* Líneas diagonales sutiles */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 24px, rgba(255,255,255,.015) 24px 25px)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', padding: 28, display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '1px',
            padding: '4px 10px', borderRadius: 4,
            background: 'var(--ul-accent)', color: 'var(--ul-accent-fg)',
          }}>{slide.badge}</span>
          <span style={{ fontSize: 10, color: 'var(--ul-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ul-success)' }} />
            online
          </span>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div style={{ fontSize: 60, lineHeight: 1, marginBottom: 12 }}>{slide.icon}</div>
          <h2 className="ul-display" style={{ fontSize: 36, color: 'var(--ul-text)', letterSpacing: '-0.5px', lineHeight: 1.05, marginBottom: 8 }}>
            {slide.title}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--ul-text-muted)', lineHeight: 1.5, maxWidth: 480 }}>{slide.subtitle}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--ul-border)' }}>
          <span style={{ fontSize: 11, color: 'var(--ul-text-subtle)', display: 'flex', alignItems: 'center', gap: 6 }}>
            Click ↗ para abrir
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
    <div style={{
      background: 'var(--ul-surface)', border: '1px solid var(--ul-border)',
      borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="ul-display" style={{ fontSize: 11, color: 'var(--ul-text)', letterSpacing: '1px' }}>{title}</div>
        {icon && <span style={{ fontSize: 13, opacity: .6 }}>{icon}</span>}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}
