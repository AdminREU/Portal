'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { getTheme, type UlTheme } from '@/lib/theme'

type User = { email: string; nombre?: string; rol: string; roles_extra?: string[]; foto_url?: string }

export default function SimuladorPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [theme, setThemeState] = useState<UlTheme>('dark')

  useEffect(() => {
    const t = localStorage.getItem('auth_token') ?? ''
    if (!t) { router.replace('/login'); return }
    setToken(t)
    setThemeState(getTheme())

    Promise.all([
      fetch('/api/users/me', { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
      fetch('/api/avisos/feature-flags', { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()).catch(() => ({ ok: false })),
    ]).then(([me, ff]) => {
      if (!me.ok) { router.replace('/login'); return }
      setUser({ ...me.user, roles_extra: me.roles_extra || [] })
      if (ff.ok) setFlags(ff.values || {})
    }).catch(() => router.replace('/login'))
      .finally(() => setLoading(false))
  }, [router])

  // Escuchar el cambio de tema global y propagarlo al iframe
  useEffect(() => {
    const onChange = (e: any) => {
      const t = e.detail as UlTheme
      setThemeState(t)
      try { iframeRef.current?.contentWindow?.postMessage({ type: 'ul-theme', theme: t }, '*') } catch {}
    }
    window.addEventListener('ul-theme-change', onChange as any)
    return () => window.removeEventListener('ul-theme-change', onChange as any)
  }, [])

  // Escuchar mensajes del iframe (logout, volver al portal)
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data || {}
      if (d.type === 'ul-logout') {
        localStorage.removeItem('auth_token')
        document.cookie = 'auth_token=; path=/; max-age=0'
        router.replace('/login')
      } else if (d.type === 'ul-go-portal') {
        router.push('/portal')
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [router])

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ul-bg)' }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--ul-border)', borderTopColor: 'var(--ul-accent)', borderRadius: '50%', animation: 'ul-spin .8s linear infinite' }} />
    </div>
  }
  if (!user) return null

  // Si el flag está apagado y NO eres admin, bloquear
  const esAdmin = user.rol === 'ADMIN' || (user.roles_extra || []).includes('ADMIN')
  if (flags.SIMULADOR_HABILITADO === false && !esAdmin) {
    return (
      <AppShell app="portal" appLabel="ULTRAPORTAL" nav={[]} user={user} token={token} showSearch={false}>
        <div style={{ maxWidth: 540, margin: '60px auto', textAlign: 'center', padding: 24, background: 'var(--ul-surface)', border: '1px solid var(--ul-border)', borderRadius: 14 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📐</div>
          <h1 className="ul-display" style={{ fontSize: 22, color: 'var(--ul-text)', marginBottom: 8 }}>Simulador de Carga 3D</h1>
          <p style={{ fontSize: 13, color: 'var(--ul-text-muted)', marginBottom: 18 }}>
            El simulador está deshabilitado por el administrador.
          </p>
          <button onClick={() => router.push('/portal')} style={{ padding: '10px 18px', background: 'var(--ul-accent)', color: 'var(--ul-accent-fg)', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>← Volver al portal</button>
        </div>
      </AppShell>
    )
  }

  const nav = [
    {
      title: 'NAVEGACIÓN',
      items: [
        { key: 'portal', label: '← Volver al portal', icon: '◆', href: '/portal' },
        { key: 'helpdesk', label: 'Helpdesk', icon: '🎫', href: '/helpdesk' },
        { key: 'compras', label: 'Compras', icon: '🛒', href: '/compras' },
        { key: 'simulador', label: 'Simulador 3D', icon: '📐' },
      ],
    },
  ]

  const params = new URLSearchParams({
    embed: '1',
    email: user.email,
    admin: esAdmin ? '1' : '0',
    theme,
  })
  const iframeSrc = `/sim/index.html?${params.toString()}`

  return (
    <AppShell
      app="portal"
      appLabel="SIMULADOR 3D"
      appVersion="Carga · Ultralam"
      nav={nav}
      activeKey="simulador"
      user={user}
      token={token}
      showSearch={false}
    >
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 className="ul-display" style={{ fontSize: 22, color: 'var(--ul-text)', letterSpacing: '-0.3px' }}>Simulador de Carga 3D</h1>
          <div style={{ fontSize: 12, color: 'var(--ul-text-subtle)', marginTop: 4 }}>Visualización 3D y cálculo de cargas para transporte</div>
        </div>
        <a href={iframeSrc} target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: '7px 14px', background: 'var(--ul-surface)', border: '1px solid var(--ul-border)', borderRadius: 8, color: 'var(--ul-text)', fontWeight: 600 }}>↗ Abrir en pantalla completa</a>
      </div>
      <div style={{ background: 'var(--ul-surface)', border: '1px solid var(--ul-border)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--ul-shadow-md)' }}>
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          title="Simulador de Carga 3D"
          style={{ width: '100%', height: 'calc(100vh - 200px)', minHeight: 600, border: 'none', display: 'block' }}
          allow="fullscreen; clipboard-write"
        />
      </div>
    </AppShell>
  )
}
