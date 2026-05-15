'use client'
import { useEffect, useState, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getTheme, setTheme, type UlTheme } from '@/lib/theme'

type NavItem = { key: string; label: string; icon: ReactNode; href?: string; onClick?: () => void; badge?: string | number }
type NavGroup = { title?: string; items: NavItem[] }

type Props = {
  app?: 'portal' | 'helpdesk' | 'compras'
  appLabel?: string
  appVersion?: string
  nav?: NavGroup[]
  activeKey?: string
  user?: { email?: string; nombre?: string; rol?: string; roles_extra?: string[] }
  children: ReactNode
  rightSlot?: ReactNode
  searchPlaceholder?: string
  onSearch?: (q: string) => void
}

export default function AppShell({
  app = 'portal',
  appLabel,
  appVersion,
  nav = [],
  activeKey,
  user,
  children,
  rightSlot,
  searchPlaceholder = 'Buscar en el portal...',
  onSearch,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [theme, setThemeState] = useState<UlTheme>('dark')
  const [openMenu, setOpenMenu] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    setThemeState(getTheme())
    const onChange = (e: any) => setThemeState(e.detail as UlTheme)
    window.addEventListener('ul-theme-change', onChange as any)
    return () => window.removeEventListener('ul-theme-change', onChange as any)
  }, [])

  function flip(t: UlTheme) {
    setTheme(t)
    setThemeState(t)
  }

  function logout() {
    localStorage.removeItem('auth_token')
    document.cookie = 'auth_token=; path=/; max-age=0'
    router.replace('/login')
  }

  const initial = (user?.nombre || user?.email || 'U').charAt(0).toUpperCase()
  const rolesText = user?.rol
    ? (user.roles_extra?.length ? `${user.rol} + ${user.roles_extra.join(', ')}` : user.rol)
    : ''

  return (
    <div style={S.shell}>
      {/* ─── SIDEBAR ─────────────────────────────────────────── */}
      <aside style={S.sidebar}>
        <div style={S.brand} onClick={() => router.push('/portal')}>
          <UltraMark />
          <div>
            <div className="ul-display" style={S.brandTitle}>{appLabel || 'ULTRA'}</div>
            {appVersion && <div style={S.brandSub}>{appVersion}</div>}
          </div>
        </div>

        <nav style={S.nav}>
          {nav.map((group, gi) => (
            <div key={gi} style={{ marginBottom: 14 }}>
              {group.title && <div style={S.navTitle}>{group.title}</div>}
              {group.items.map(item => {
                const active = item.key === activeKey
                return (
                  <button
                    key={item.key}
                    onClick={() => { if (item.onClick) item.onClick(); else if (item.href) router.push(item.href) }}
                    style={{
                      ...S.navItem,
                      background: active ? 'var(--ul-accent)' : 'transparent',
                      color: active ? 'var(--ul-accent-fg)' : 'var(--ul-text-muted)',
                      fontWeight: active ? 700 : 500,
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--ul-surface-hover)' }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <span style={S.navIcon}>{item.icon}</span>
                    <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                    {item.badge != null && (
                      <span style={{
                        ...S.navBadge,
                        background: active ? 'rgba(14,14,14,.2)' : 'var(--ul-surface-2)',
                        color: active ? 'var(--ul-accent-fg)' : 'var(--ul-text)',
                      }}>{item.badge}</span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User card en sidebar */}
        <div style={S.sidebarUser}>
          <div style={S.userAvatar}>{initial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={S.userName}>{user?.nombre || user?.email?.split('@')[0] || 'Usuario'}</div>
            <div style={S.userRol}>{user?.rol?.toLowerCase() || ''}</div>
          </div>
          <button onClick={logout} style={S.iconBtn} title="Cerrar sesión" aria-label="Cerrar sesión">
            <IconLogout />
          </button>
        </div>
      </aside>

      {/* ─── MAIN COLUMN ─────────────────────────────────────── */}
      <main style={S.main}>
        {/* TOPBAR */}
        <header style={S.topbar}>
          <div style={S.topbarLeft}>
            <span style={S.appPill}>
              {app === 'portal' ? '◆ Portal interno' : app === 'helpdesk' ? '🎫 Helpdesk' : '🛒 Compras'}
            </span>

            <div style={S.searchWrap}>
              <span style={S.searchIcon}>⌕</span>
              <input
                value={q}
                onChange={e => { setQ(e.target.value); onSearch?.(e.target.value) }}
                placeholder={searchPlaceholder}
                style={S.searchInput}
              />
            </div>
          </div>

          <div style={S.topbarRight}>
            {rightSlot}

            {/* Theme switcher segmentado */}
            <div style={S.themeSeg} role="group" aria-label="Tema">
              <button
                onClick={() => flip('dark')}
                style={{ ...S.themeOpt, background: theme === 'dark' ? 'var(--ul-accent)' : 'transparent', color: theme === 'dark' ? 'var(--ul-accent-fg)' : 'var(--ul-text-muted)' }}
                aria-pressed={theme === 'dark'}
              >Oscuro</button>
              <button
                onClick={() => flip('light')}
                style={{ ...S.themeOpt, background: theme === 'light' ? 'var(--ul-accent)' : 'transparent', color: theme === 'light' ? 'var(--ul-accent-fg)' : 'var(--ul-text-muted)' }}
                aria-pressed={theme === 'light'}
              >Claro</button>
            </div>

            {/* Notificaciones placeholder */}
            <button style={S.iconBtnTop} title="Notificaciones">
              <span style={{ position: 'relative' }}>
                🔔
                <span style={S.dotBadge} />
              </span>
            </button>

            {/* User menu */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setOpenMenu(v => !v)} style={S.userBtn}>
                <div style={{ ...S.userAvatar, width: 30, height: 30, fontSize: 13 }}>{initial}</div>
              </button>
              {openMenu && (
                <>
                  <div onClick={() => setOpenMenu(false)} style={S.menuBackdrop} />
                  <div style={S.menu}>
                    <div style={S.menuHeader}>
                      <div style={S.menuName}>{user?.nombre || user?.email}</div>
                      <div style={S.menuRol}>{rolesText}</div>
                    </div>
                    <button onClick={() => { setOpenMenu(false); router.push('/portal') }} style={S.menuItem}>◆ Portal</button>
                    {pathname !== '/helpdesk' && <button onClick={() => { setOpenMenu(false); router.push('/helpdesk') }} style={S.menuItem}>🎫 Helpdesk</button>}
                    {pathname !== '/compras' && <button onClick={() => { setOpenMenu(false); router.push('/compras') }} style={S.menuItem}>🛒 Compras</button>}
                    <div style={S.menuSep} />
                    <button onClick={() => { setOpenMenu(false); logout() }} style={{ ...S.menuItem, color: 'var(--ul-danger)' }}>↪ Cerrar sesión</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <div style={S.content}>{children}</div>
      </main>
    </div>
  )
}

/* ─── Mini iconos ──────────────────────────────────────────────── */
function UltraMark() {
  return (
    <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--ul-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span className="ul-display" style={{ color: 'var(--ul-accent-fg)', fontSize: 18, lineHeight: 1 }}>U</span>
    </div>
  )
}
function IconLogout() {
  return <span style={{ fontSize: 14 }}>↪</span>
}

/* ─── Estilos (CSS-in-JS con CSS vars) ─────────────────────────── */
const S: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex', minHeight: '100vh', background: 'var(--ul-bg)', color: 'var(--ul-text)',
  },
  sidebar: {
    width: 240, flexShrink: 0, background: 'var(--ul-bg-elev)',
    borderRight: '1px solid var(--ul-border)', display: 'flex', flexDirection: 'column',
    position: 'sticky', top: 0, height: '100vh',
  },
  brand: {
    padding: '20px 18px 16px', display: 'flex', alignItems: 'center', gap: 12,
    cursor: 'pointer', borderBottom: '1px solid var(--ul-border)',
  },
  brandTitle: {
    fontSize: 16, color: 'var(--ul-text)', lineHeight: 1, letterSpacing: '.5px',
  },
  brandSub: {
    fontSize: 10, color: 'var(--ul-text-subtle)', marginTop: 3, fontWeight: 500,
  },
  nav: { flex: 1, padding: '14px 10px', overflowY: 'auto' },
  navTitle: {
    fontSize: 10, color: 'var(--ul-text-subtle)', textTransform: 'uppercase',
    letterSpacing: 1, fontWeight: 700, padding: '4px 10px 8px',
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
    padding: '9px 11px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontSize: 13, transition: 'background .15s, color .15s', marginBottom: 2,
  },
  navIcon: { width: 18, fontSize: 14, display: 'flex', justifyContent: 'center', alignItems: 'center' },
  navBadge: {
    fontSize: 10, padding: '2px 7px', borderRadius: 999, fontWeight: 700,
  },
  sidebarUser: {
    padding: '12px 14px', borderTop: '1px solid var(--ul-border)',
    display: 'flex', alignItems: 'center', gap: 10,
  },
  userAvatar: {
    width: 36, height: 36, borderRadius: '50%', background: 'var(--ul-accent)',
    color: 'var(--ul-accent-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 15, flexShrink: 0,
  },
  userName: { fontSize: 13, fontWeight: 600, color: 'var(--ul-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userRol: { fontSize: 11, color: 'var(--ul-text-subtle)', textTransform: 'capitalize' },
  iconBtn: {
    background: 'transparent', border: '1px solid var(--ul-border)', borderRadius: 8,
    width: 32, height: 32, cursor: 'pointer', color: 'var(--ul-text-muted)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  iconBtnTop: {
    background: 'var(--ul-surface)', border: '1px solid var(--ul-border)', borderRadius: 999,
    width: 36, height: 36, cursor: 'pointer', color: 'var(--ul-text)', fontSize: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  topbar: {
    position: 'sticky', top: 0, zIndex: 40, background: 'var(--ul-bg-elev)',
    borderBottom: '1px solid var(--ul-border)',
    padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 14,
    justifyContent: 'space-between',
  },
  topbarLeft: { display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 },
  topbarRight: { display: 'flex', alignItems: 'center', gap: 10 },
  appPill: {
    fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 999,
    background: 'var(--ul-surface-2)', color: 'var(--ul-text-muted)',
    textTransform: 'uppercase', letterSpacing: '.5px', whiteSpace: 'nowrap',
  },
  searchWrap: {
    position: 'relative', flex: 1, maxWidth: 520, display: 'flex', alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute', left: 14, color: 'var(--ul-text-subtle)', fontSize: 14, pointerEvents: 'none',
  },
  searchInput: {
    width: '100%', padding: '10px 14px 10px 36px', borderRadius: 999,
    background: 'var(--ul-surface)', color: 'var(--ul-text)',
    border: '1px solid var(--ul-border)', fontSize: 13, outline: 'none',
  },
  themeSeg: {
    display: 'flex', alignItems: 'center', background: 'var(--ul-surface)',
    border: '1px solid var(--ul-border)', borderRadius: 999, padding: 3, gap: 2,
  },
  themeOpt: {
    border: 'none', cursor: 'pointer', padding: '5px 12px', borderRadius: 999,
    fontSize: 12, fontWeight: 600, transition: 'all .15s',
  },
  dotBadge: {
    position: 'absolute', top: -2, right: -3, width: 8, height: 8, borderRadius: '50%',
    background: 'var(--ul-accent)', border: '2px solid var(--ul-bg-elev)',
  },
  userBtn: {
    background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
    borderRadius: '50%',
  },
  menuBackdrop: {
    position: 'fixed', inset: 0, zIndex: 49,
  },
  menu: {
    position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 50,
    minWidth: 240, background: 'var(--ul-bg-elev)',
    border: '1px solid var(--ul-border)', borderRadius: 12,
    boxShadow: 'var(--ul-shadow-lg)', padding: 6, animation: 'ul-fade-in .15s ease both',
  },
  menuHeader: {
    padding: '10px 12px', borderBottom: '1px solid var(--ul-border)', marginBottom: 6,
  },
  menuName: { fontSize: 13, fontWeight: 600, color: 'var(--ul-text)' },
  menuRol: { fontSize: 11, color: 'var(--ul-text-subtle)', marginTop: 2 },
  menuItem: {
    display: 'block', width: '100%', textAlign: 'left',
    padding: '9px 12px', background: 'transparent', border: 'none', cursor: 'pointer',
    borderRadius: 7, fontSize: 13, color: 'var(--ul-text)',
  },
  menuSep: { height: 1, background: 'var(--ul-border)', margin: '6px 0' },
  content: { flex: 1, padding: '28px', minWidth: 0 },
}
