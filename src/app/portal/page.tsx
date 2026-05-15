'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type User = { email: string; nombre?: string; rol: string; roles_extra?: string[]; puesto?: string; departamento?: string; telefono?: string }
type AccesoFlags = { puede_helpdesk_admin: boolean; puede_compras_admin: boolean; es_admin: boolean }

export default function PortalPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [accesos, setAccesos] = useState<AccesoFlags>({ puede_helpdesk_admin: false, puede_compras_admin: false, es_admin: false })
  const [ordenes, setOrdenes] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showProfile, setShowProfile] = useState(false)

  const [brandingName, setBrandingName] = useState('Portal Ultralam')
  const [brandingColor, setBrandingColor] = useState('#F5C400')
  const [brandingLogo, setBrandingLogo] = useState('')

  useEffect(() => {
    const t = localStorage.getItem('auth_token') ?? ''
    if (!t) { router.replace('/login'); return }
    setToken(t)

    fetch('/api/branding').then(r => r.json()).then(b => {
      if (b.ok) { setBrandingName(b.name); setBrandingColor(b.primaryColor); setBrandingLogo(b.logoUrl) }
    }).catch(() => {})

    Promise.all([
      fetch('/api/auth/resume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: t }) }).then(r => r.json()),
      fetch('/api/users/me', { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
      fetch('/api/compras/dashboard', { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
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

  async function logout() {
    localStorage.removeItem('auth_token')
    document.cookie = 'auth_token=; path=/; max-age=0'
    router.replace('/login')
  }

  async function saveProfile(perfil: Partial<User>) {
    const r = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(perfil),
    })
    const d = await r.json()
    if (d.ok) {
      setUser(u => u ? { ...u, ...perfil } : u)
      setShowProfile(false)
    } else { alert(d.error || 'Error') }
  }

  if (loading) return <LoadingScreen color={brandingColor} />
  if (!user) return null

  const totalOrdenes = ordenes.length
  const ordenesPendientes = ordenes.filter(o => o.estatus === 'pendiente_aprob').length
  const ordenesAprob = ordenes.filter(o => ['aprobada','en_compra','pagada','recibida_total'].includes(o.estatus)).length
  const totalTickets = tickets.length
  const ticketsAbiertos = tickets.filter(t => !['resuelto','cerrado'].includes(t.estado)).length

  const moduleCards = [
    {
      key: 'compras', icon: '🛒', label: 'Compras',
      desc: accesos.puede_compras_admin ? 'Gestiona órdenes de compra, proveedores, aprobaciones' : 'Crea y consulta tus órdenes de compra',
      href: '/compras', color: brandingColor,
    },
    {
      key: 'helpdesk', icon: '🎫', label: 'Helpdesk',
      desc: accesos.puede_helpdesk_admin ? 'Atiende tickets de soporte y resuelve incidencias' : 'Crea y consulta tus tickets de soporte',
      href: '/helpdesk', color: '#3b82f6',
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f3', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e4e0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {brandingLogo
              ? <img src={brandingLogo} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }}/>
              : <div style={{ width: 36, height: 36, borderRadius: 8, background: brandingColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#191919' }}>{brandingName.charAt(0)}</div>
            }
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#191919' }}>{brandingName}</div>
              <div style={{ fontSize: 11, color: '#888' }}>Portal corporativo</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#191919' }}>{user.nombre || user.email}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{user.rol}{user.roles_extra?.length ? ' + ' + user.roles_extra.join(', ') : ''}</div>
            </div>
            <button onClick={() => setShowProfile(true)} style={iconBtn} title="Mi perfil">⚙️</button>
            <button onClick={logout} style={iconBtn} title="Cerrar sesión">🚪</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#191919', margin: '0 0 6px' }}>Hola, {user.nombre || user.email.split('@')[0]} 👋</h1>
        <p style={{ fontSize: 14, color: '#666', margin: '0 0 32px' }}>Selecciona un módulo o consulta tu actividad reciente.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '14px', marginBottom: '32px' }}>
          <StatCard label="Mis OC" value={totalOrdenes} sub={`${ordenesPendientes} pendientes`} color={brandingColor} />
          <StatCard label="OC aprobadas" value={ordenesAprob} sub="" color="#10b981" />
          <StatCard label="Mis tickets" value={totalTickets} sub={`${ticketsAbiertos} abiertos`} color="#3b82f6" />
          <StatCard label="Tu rol" value={user.rol} sub={user.roles_extra?.length ? user.roles_extra.join(', ') : 'Solo usuario'} color="#6366f1" />
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#191919', margin: '0 0 14px' }}>Módulos disponibles</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '16px', marginBottom: '32px' }}>
          {moduleCards.map(m => (
            <button key={m.key} onClick={() => router.push(m.href)}
              style={{ background: '#fff', border: '1px solid #e5e4e0', borderRadius: 14, padding: '24px', textAlign: 'left', cursor: 'pointer', transition: 'all .2s', display: 'flex', flexDirection: 'column', gap: 12 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = m.color; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e5e4e0'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
            >
              <div style={{ fontSize: 36 }}>{m.icon}</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#191919', marginBottom: 6 }}>{m.label}</div>
                <div style={{ fontSize: 13, color: '#666' }}>{m.desc}</div>
              </div>
              <div style={{ color: m.color, fontWeight: 600, fontSize: 13, marginTop: 'auto' }}>Ingresar →</div>
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: '16px' }}>
          <ListPanel
            title="Órdenes recientes"
            empty="No tienes órdenes aún"
            items={ordenes.slice(0,6).map(o => ({
              primary: o.id, secondary: `${labelEstatus(o.estatus)} · $${Number(o.total).toLocaleString('es-MX')}`,
              date: o.created_at,
            }))}
            onClick={() => router.push('/compras')}
            cta="Ver todas →"
            color={brandingColor}
          />
          <ListPanel
            title="Tickets recientes"
            empty="No tienes tickets aún"
            items={tickets.slice(0,6).map(t => ({
              primary: `${t.id} — ${t.asunto}`, secondary: `${t.estado} · ${t.prioridad}`,
              date: t.fecha_creacion,
            }))}
            onClick={() => router.push('/helpdesk')}
            cta="Ver todos →"
            color="#3b82f6"
          />
        </div>
      </div>

      {showProfile && <ProfileModal user={user} onSave={saveProfile} onClose={() => setShowProfile(false)} color={brandingColor} />}
    </div>
  )
}

function LoadingScreen({ color }: { color: string }) {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f7f6f3' }}>
      <div style={{ width:48, height:48, border:'4px solid #e5e4e0', borderTopColor: color, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string, value: any, sub: string, color: string }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #e5e4e0', borderRadius:12, padding:'16px' }}>
      <div style={{ fontSize:11, color:'#888', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:700, color:'#191919', marginBottom:2 }}>{value}</div>
      <div style={{ fontSize:11, color }}>{sub}</div>
    </div>
  )
}

function ListPanel({ title, items, empty, onClick, cta, color }: any) {
  return (
    <div style={{ background:'#fff', border:'1px solid #e5e4e0', borderRadius:12, padding:'16px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ fontSize:14, fontWeight:700, color:'#191919' }}>{title}</div>
        <button onClick={onClick} style={{ background:'none', border:'none', color, fontSize:12, fontWeight:600, cursor:'pointer' }}>{cta}</button>
      </div>
      {items.length === 0
        ? <div style={{ padding:'24px 0', textAlign:'center', fontSize:13, color:'#999' }}>{empty}</div>
        : items.map((it: any, i: number) => (
            <div key={i} style={{ padding:'10px 0', borderTop: i === 0 ? 'none' : '1px solid #f0efeb' }}>
              <div style={{ fontSize:13, color:'#191919', fontWeight:500, marginBottom:2 }}>{it.primary}</div>
              <div style={{ fontSize:11, color:'#888' }}>{it.secondary} · {it.date ? new Date(it.date).toLocaleDateString('es-MX') : ''}</div>
            </div>
          ))
      }
    </div>
  )
}

function ProfileModal({ user, onSave, onClose, color }: any) {
  const [nombre, setNombre] = useState(user.nombre || '')
  const [puesto, setPuesto] = useState(user.puesto || '')
  const [departamento, setDepartamento] = useState(user.departamento || '')
  const [telefono, setTelefono] = useState(user.telefono || '')

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, zIndex:50 }}>
      <div style={{ background:'#fff', borderRadius:16, padding:24, maxWidth:480, width:'100%' }}>
        <h2 style={{ fontSize:18, fontWeight:700, color:'#191919', margin:'0 0 16px' }}>Mi perfil</h2>
        <Field label="Email"><input value={user.email} disabled style={{ ...inputStyle, opacity:.7 }}/></Field>
        <Field label="Nombre completo"><input value={nombre} onChange={e=>setNombre(e.target.value)} style={inputStyle}/></Field>
        <Field label="Puesto"><input value={puesto} onChange={e=>setPuesto(e.target.value)} style={inputStyle}/></Field>
        <Field label="Departamento"><input value={departamento} onChange={e=>setDepartamento(e.target.value)} style={inputStyle}/></Field>
        <Field label="Teléfono"><input value={telefono} onChange={e=>setTelefono(e.target.value)} style={inputStyle}/></Field>
        <div style={{ display:'flex', gap:8, marginTop:16 }}>
          <button onClick={onClose} style={{ flex:1, padding:'10px 16px', background:'#f7f6f3', border:'1px solid #e5e4e0', borderRadius:8, cursor:'pointer' }}>Cancelar</button>
          <button onClick={() => onSave({ nombre, puesto, departamento, telefono })} style={{ flex:1, padding:'10px 16px', background:color, border:'none', borderRadius:8, fontWeight:600, color:'#191919', cursor:'pointer' }}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string, children: any }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ fontSize:11, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'.5px', display:'block', marginBottom:4 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: 8,
  border: '1px solid #e5e4e0', background: '#f7f6f3', color: '#191919', outline: 'none', boxSizing: 'border-box',
}

const iconBtn: React.CSSProperties = {
  background:'transparent', border:'1px solid #e5e4e0', borderRadius:8, padding:'6px 10px', fontSize:14, cursor:'pointer',
}

function labelEstatus(e: string): string {
  const m: Record<string,string> = {
    borrador:'Borrador', pendiente_aprob:'Pendiente', aprobada:'Aprobada', rechazada:'Rechazada',
    en_compra:'En compra', en_transito:'En tránsito', recibida_parcial:'Recibida parcial',
    recibida_total:'Recibida', facturada:'Facturada', pagada:'Pagada', cerrada:'Cerrada', cancelada:'Cancelada',
  }
  return m[e] || e
}
