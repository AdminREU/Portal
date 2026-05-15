'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type User = { email: string; nombre?: string; rol: string; roles_extra?: string[]; puesto?: string; departamento?: string; telefono?: string }
type Item = { posicion: number; cantidad: number; unidad: string; nombre: string; descripcion: string; marca_modelo: string; observaciones: string; precio_unitario: number }
type Tab = 'mis' | 'nueva' | 'pendientes' | 'gestion' | 'admin'

const ESTATUS_LABEL: Record<string, string> = {
  borrador:'Borrador', pendiente_aprob:'Pendiente aprob.', aprobada:'Aprobada', rechazada:'Rechazada',
  en_compra:'En compra', en_transito:'En tránsito', recibida_parcial:'Recibida parcial',
  recibida_total:'Recibida', facturada:'Facturada', pagada:'Pagada', cerrada:'Cerrada', cancelada:'Cancelada',
}
const ESTATUS_COLOR: Record<string, string> = {
  borrador:'#6b7280', pendiente_aprob:'#f59e0b', aprobada:'#10b981', rechazada:'#ef4444',
  en_compra:'#3b82f6', en_transito:'#8b5cf6', recibida_parcial:'#f97316',
  recibida_total:'#059669', facturada:'#0891b2', pagada:'#16a34a', cerrada:'#374151', cancelada:'#dc2626',
}

export default function ComprasPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [tab, setTab] = useState<Tab>('mis')
  const [loading, setLoading] = useState(true)
  const [ordenes, setOrdenes] = useState<any[]>([])
  const [proveedores, setProveedores] = useState<any[]>([])
  const [catalogos, setCatalogos] = useState<any>({})
  const [niveles, setNiveles] = useState<any[]>([])
  const [settings, setSettings] = useState<Record<string,string>>({})
  const [detail, setDetail] = useState<any>(null)
  const [filtroEstatus, setFiltroEstatus] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [q, setQ] = useState('')
  const [brand, setBrand] = useState({ name:'Portal Ultralam', color:'#F5C400', logo:'' })

  // Roles
  const roles = useMemo(() => {
    const r = new Set<string>()
    if (user?.rol) r.add(user.rol)
    for (const x of user?.roles_extra || []) r.add(x)
    if (r.has('ADMIN')) { r.add('COMPRAS'); r.add('APROBADOR'); r.add('HELPDESK') }
    return r
  }, [user])

  const puedeCompras  = roles.has('COMPRAS') || roles.has('ADMIN')
  const puedeAprobar  = roles.has('APROBADOR') || puedeCompras
  const esAdmin       = roles.has('ADMIN')

  useEffect(() => {
    const t = localStorage.getItem('auth_token') ?? ''
    if (!t) { router.replace('/login'); return }
    setToken(t)

    fetch('/api/branding').then(r => r.json()).then(b => {
      if (b.ok) setBrand({ name: b.name, color: b.primaryColor, logo: b.logoUrl })
    }).catch(() => {})

    bootstrap(t)
  }, [router])

  async function bootstrap(t: string) {
    setLoading(true)
    try {
      const [resume, me, ords, provs, cats, nivs] = await Promise.all([
        fetch('/api/auth/resume', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ token: t }) }).then(r => r.json()),
        fetch('/api/users/me',           { headers: { Authorization: `Bearer ${t}` }}).then(r => r.json()),
        fetch('/api/compras/ordenes',    { headers: { Authorization: `Bearer ${t}` }}).then(r => r.json()),
        fetch('/api/compras/proveedores',{ headers: { Authorization: `Bearer ${t}` }}).then(r => r.json()),
        fetch('/api/compras/catalogos',  { headers: { Authorization: `Bearer ${t}` }}).then(r => r.json()),
        fetch('/api/compras/niveles',    { headers: { Authorization: `Bearer ${t}` }}).then(r => r.json()),
      ])
      if (!resume.ok) { router.replace('/login'); return }
      if (me.ok) setUser({ ...me.user, roles_extra: me.roles_extra || [] })
      if (ords.ok) setOrdenes(ords.ordenes || [])
      if (provs.ok) setProveedores(provs.proveedores || [])
      if (cats.ok) setCatalogos(cats.catalogos || {})
      if (nivs.ok) setNiveles(nivs.niveles || [])
    } finally { setLoading(false) }
  }

  async function reloadOrdenes() {
    const r = await fetch('/api/compras/ordenes', { headers: { Authorization: `Bearer ${token}` }}).then(r => r.json())
    if (r.ok) setOrdenes(r.ordenes || [])
  }

  async function loadSettings() {
    const r = await fetch('/api/compras/settings', { headers: { Authorization: `Bearer ${token}` }}).then(r => r.json())
    if (r.ok) setSettings(r.settings || {})
  }

  useEffect(() => { if (tab === 'admin' && esAdmin) loadSettings() }, [tab, esAdmin])

  // Filtros
  const ordenesFiltradas = useMemo(() => {
    return ordenes.filter(o => {
      if (filtroEstatus && o.estatus !== filtroEstatus) return false
      if (filtroTipo && o.tipo_compra !== filtroTipo) return false
      if (q) {
        const s = q.toLowerCase()
        if (!o.id.toLowerCase().includes(s) &&
            !(o.solicitante_nombre || '').toLowerCase().includes(s) &&
            !(o.proveedor_razon || '').toLowerCase().includes(s)) return false
      }
      if (tab === 'pendientes') {
        if (o.estatus !== 'pendiente_aprob') return false
      }
      if (tab === 'gestion') {
        if (!['aprobada','en_compra','en_transito','recibida_parcial','recibida_total','facturada'].includes(o.estatus)) return false
      }
      return true
    })
  }, [ordenes, filtroEstatus, filtroTipo, q, tab])

  async function openDetail(folio: string) {
    const r = await fetch(`/api/compras/ordenes/${folio}`, { headers: { Authorization: `Bearer ${token}` }}).then(r => r.json())
    if (r.ok) setDetail(r)
    else alert(r.error || 'Error')
  }

  if (loading) return <Loading color={brand.color}/>
  if (!user) return null

  const tabs: Array<[Tab, string, boolean]> = [
    ['mis', 'Mis OC', true],
    ['nueva', 'Nueva OC', true],
    ['pendientes', 'Pendientes aprobación', puedeAprobar],
    ['gestion', 'Gestión compras', puedeCompras],
    ['admin', 'Administración', esAdmin],
  ]

  return (
    <div style={{ minHeight:'100vh', background:'var(--ul-bg)', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <Header user={user} brand={brand} onHome={() => router.push('/portal')} onLogout={() => { localStorage.removeItem('auth_token'); router.replace('/login') }}/>

      <div style={{ background:'var(--ul-surface)', borderBottom:'1px solid var(--ul-border)' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', padding:'0 24px', display:'flex', gap:8, overflowX:'auto' }}>
          {tabs.filter(([_,__,visible]) => visible).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding:'14px 16px', background:'none', border:'none', borderBottom: tab === k ? `2px solid ${brand.color}` : '2px solid transparent',
              fontSize:14, fontWeight: tab === k ? 700 : 500, color: tab === k ? 'var(--ul-text)' : 'var(--ul-text-muted)', cursor:'pointer', whiteSpace:'nowrap',
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:1280, margin:'0 auto', padding:'24px' }}>
        {tab === 'nueva' && <NuevaOC user={user} token={token} brand={brand} catalogos={catalogos} proveedores={proveedores} puedeCompras={puedeCompras} onCreated={() => { reloadOrdenes(); setTab('mis') }}/>}
        {(tab === 'mis' || tab === 'pendientes' || tab === 'gestion') && (
          <ListaOC
            ordenes={ordenesFiltradas} brand={brand}
            q={q} setQ={setQ} filtroEstatus={filtroEstatus} setFiltroEstatus={setFiltroEstatus}
            filtroTipo={filtroTipo} setFiltroTipo={setFiltroTipo}
            catalogos={catalogos}
            onOpen={openDetail}
            puedeCompras={puedeCompras} puedeAprobar={puedeAprobar}
          />
        )}
        {tab === 'admin' && esAdmin && (
          <AdminPanel
            token={token} brand={brand} settings={settings} setSettings={setSettings}
            niveles={niveles} setNiveles={setNiveles} proveedores={proveedores} setProveedores={setProveedores}
            catalogos={catalogos} setCatalogos={setCatalogos} reloadOrdenes={reloadOrdenes}
          />
        )}
      </div>

      {detail && (
        <DetailModal
          data={detail} token={token} brand={brand} user={user}
          puedeAprobar={puedeAprobar} puedeCompras={puedeCompras}
          onClose={() => setDetail(null)}
          onUpdated={async () => { const r = await fetch(`/api/compras/ordenes/${detail.orden.id}`, { headers: { Authorization: `Bearer ${token}` }}).then(r=>r.json()); if (r.ok) setDetail(r); reloadOrdenes() }}
        />
      )}
    </div>
  )
}

// ─── Header ──────────────────────────────────────────────────
function Header({ user, brand, onHome, onLogout }: any) {
  const [theme, setThemeState] = useState<'dark'|'light'>('dark')
  useEffect(() => {
    const t = (localStorage.getItem('ul-theme') as 'dark'|'light'|null) ?? 'dark'
    setThemeState(t)
    const onChange = (e: any) => setThemeState(e.detail)
    window.addEventListener('ul-theme-change', onChange as any)
    return () => window.removeEventListener('ul-theme-change', onChange as any)
  }, [])
  function flip(t: 'dark'|'light') {
    localStorage.setItem('ul-theme', t)
    document.documentElement.setAttribute('data-theme', t)
    setThemeState(t)
    window.dispatchEvent(new CustomEvent('ul-theme-change', { detail: t }))
  }
  return (
    <div style={{ background:'var(--ul-bg-elev)', borderBottom:'1px solid var(--ul-border)' }}>
      <div style={{ maxWidth:1280, margin:'0 auto', padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={onHome} title="Volver al portal" style={{ background:'var(--ul-surface)', border:'1px solid var(--ul-border)', borderRadius:8, padding:'6px 10px', cursor:'pointer', color:'var(--ul-text)', fontSize:13 }}>← Portal</button>
          <div style={{ width:32, height:32, borderRadius:8, background:'var(--ul-accent)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'var(--ul-accent-fg)', fontSize:15 }}>🛒</div>
          <div>
            <div className="ul-display" style={{ fontSize:15, color:'var(--ul-text)', letterSpacing:'.5px' }}>COMPRAS</div>
            <div style={{ fontSize:10, color:'var(--ul-text-subtle)' }}>Ultralam · v3.0.0</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {/* Theme switcher segmentado */}
          <div style={{ display:'flex', alignItems:'center', background:'var(--ul-surface)', border:'1px solid var(--ul-border)', borderRadius:999, padding:3, gap:2 }}>
            <button onClick={() => flip('dark')} style={{ border:'none', cursor:'pointer', padding:'5px 12px', borderRadius:999, fontSize:12, fontWeight:600, background: theme === 'dark' ? 'var(--ul-accent)' : 'transparent', color: theme === 'dark' ? 'var(--ul-accent-fg)' : 'var(--ul-text-muted)' }}>Oscuro</button>
            <button onClick={() => flip('light')} style={{ border:'none', cursor:'pointer', padding:'5px 12px', borderRadius:999, fontSize:12, fontWeight:600, background: theme === 'light' ? 'var(--ul-accent)' : 'transparent', color: theme === 'light' ? 'var(--ul-accent-fg)' : 'var(--ul-text-muted)' }}>Claro</button>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--ul-text)' }}>{user.nombre || user.email}</div>
            <div style={{ fontSize:11, color:'var(--ul-text-subtle)' }}>{user.rol}{user.roles_extra?.length ? ' · ' + user.roles_extra.join(', ') : ''}</div>
          </div>
          <button onClick={onLogout} title="Cerrar sesión" style={{ background:'var(--ul-surface)', border:'1px solid var(--ul-border)', borderRadius:8, padding:'6px 10px', cursor:'pointer', color:'var(--ul-text)' }}>↪</button>
        </div>
      </div>
    </div>
  )
}

function Loading({ color }: { color: string }) {
  return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:48, height:48, border:'4px solid #e5e4e0', borderTopColor:color, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
}

// ─── Lista OC ────────────────────────────────────────────────
function ListaOC({ ordenes, brand, q, setQ, filtroEstatus, setFiltroEstatus, filtroTipo, setFiltroTipo, catalogos, onOpen, puedeCompras, puedeAprobar }: any) {
  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
        <input placeholder="Buscar por folio, solicitante, proveedor..." value={q} onChange={e=>setQ(e.target.value)} style={{ ...input, flex:'1 1 240px' }}/>
        <select value={filtroEstatus} onChange={e=>setFiltroEstatus(e.target.value)} style={{ ...input, flex:'0 0 180px' }}>
          <option value="">Todos los estatus</option>
          {(catalogos.compras_estatus || []).map((s: any) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)} style={{ ...input, flex:'0 0 180px' }}>
          <option value="">Todos los tipos</option>
          {(catalogos.compras_tipos || []).map((s: any) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      <div style={{ background:'var(--ul-surface)', border:'1px solid var(--ul-border)', borderRadius:12, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, minWidth:900 }}>
            <thead>
              <tr style={{ background:'var(--ul-surface-2)', borderBottom:'1px solid var(--ul-border)' }}>
                <Th>Folio</Th><Th>Fecha</Th><Th>Solicitante</Th><Th>Empresa</Th><Th>Tipo</Th>
                <Th>Proveedor</Th><Th>Total</Th><Th>Estatus</Th><Th>Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {ordenes.length === 0 && <tr><td colSpan={9} style={{ padding:'40px', textAlign:'center', color:'var(--ul-text-subtle)' }}>Sin órdenes</td></tr>}
              {ordenes.map((o: any) => (
                <tr key={o.id} style={{ borderBottom:'1px solid var(--ul-border)' }}>
                  <Td><strong>{o.id}</strong></Td>
                  <Td>{new Date(o.created_at).toLocaleDateString('es-MX')}</Td>
                  <Td>{o.solicitante_nombre || o.solicitante_email}</Td>
                  <Td style={{ textTransform:'capitalize' }}>{o.empresa}</Td>
                  <Td style={{ textTransform:'capitalize' }}>{(o.tipo_compra || '').replace('_',' ')}</Td>
                  <Td>{o.proveedor_razon || '—'}</Td>
                  <Td style={{ textAlign:'right', fontWeight:600 }}>${Number(o.total).toLocaleString('es-MX', { minimumFractionDigits:2 })}</Td>
                  <Td><Badge text={ESTATUS_LABEL[o.estatus] || o.estatus} color={ESTATUS_COLOR[o.estatus] || '#888'}/></Td>
                  <Td><button onClick={()=>onOpen(o.id)} style={{ background:brand.color, border:'none', borderRadius:6, padding:'6px 10px', fontSize:12, fontWeight:600, cursor:'pointer' }}>Ver →</button></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Nueva OC ─────────────────────────────────────────────────
function NuevaOC({ user, token, brand, catalogos, proveedores, puedeCompras, onCreated }: any) {
  const [showProveedor, setShowProveedor] = useState(false)
  // Solo COMPRAS/APROBADOR/ADMIN ve montos. Para usuario solicitante normal, OC es solo descripción de necesidad.
  const verMontos = !!puedeCompras
  const empresas    = catalogos.compras_empresas || []
  const tipos       = catalogos.compras_tipos || []
  const categorias  = catalogos.compras_categorias || []
  const unidades    = catalogos.compras_unidades || []
  const departamentos = catalogos.compras_departamentos || []

  const [empresa, setEmpresa] = useState(empresas[0]?.key || 'ultralam')
  const [tipoCompra, setTipoCompra] = useState('recurrente')
  const [categoria, setCategoria] = useState('')
  const [justificacion, setJustificacion] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [aplicaIva, setAplicaIva] = useState(true)
  const [items, setItems] = useState<Item[]>([{ posicion:1, cantidad:1, unidad: unidades[0]?.key || 'pza', nombre:'', descripcion:'', marca_modelo:'', observaciones:'', precio_unitario:0 }])
  const [proveedorId, setProveedorId] = useState('')
  const [proveedorRfc, setProveedorRfc] = useState('')
  const [proveedorRazon, setProveedorRazon] = useState('')
  const [solicNombre, setSolicNombre] = useState(user.nombre || '')
  const [solicPuesto, setSolicPuesto] = useState(user.puesto || '')
  const [solicDepto, setSolicDepto] = useState(user.departamento || '')
  const [solicTel, setSolicTel] = useState(user.telefono || '')
  const [submitting, setSubmitting] = useState(false)

  const requiereJustif = tipoCompra === 'no_recurrente' || tipoCompra === 'urgente'

  // Totales
  const subtotal = items.reduce((s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0), 0)
  const iva = aplicaIva ? +(subtotal * 0.16).toFixed(2) : 0
  const total = +(subtotal + iva).toFixed(2)

  function updItem(i: number, patch: Partial<Item>) {
    setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  }
  function addItem() {
    setItems([...items, { posicion: items.length+1, cantidad:1, unidad: unidades[0]?.key || 'pza', nombre:'', descripcion:'', marca_modelo:'', observaciones:'', precio_unitario:0 }])
  }
  function rmItem(i: number) {
    if (items.length === 1) return
    setItems(items.filter((_, idx) => idx !== i).map((it, idx) => ({ ...it, posicion: idx+1 })))
  }
  function stepQty(i: number, d: number) {
    const v = Math.max(0, (Number(items[i].cantidad) || 0) + d)
    updItem(i, { cantidad: v })
  }

  async function submit(borrador: boolean) {
    if (!empresa)        return alert('Empresa requerida')
    if (!tipoCompra)     return alert('Tipo requerido')
    if (requiereJustif && !justificacion.trim()) return alert('Justificación requerida para No recurrente / Urgente')
    if (!items.length || items.every(i => !i.nombre.trim())) return alert('Agrega al menos un item con nombre')

    setSubmitting(true)
    try {
      const r = await fetch('/api/compras/ordenes', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({
          empresa, tipo_compra: tipoCompra, categoria, justificacion, observaciones,
          aplica_iva: aplicaIva,
          items: items.filter(i => i.nombre.trim()),
          proveedor_id: proveedorId || null,
          proveedor_rfc: proveedorRfc,
          proveedor_razon: proveedorRazon,
          solicitante_nombre: solicNombre,
          solicitante_puesto: solicPuesto,
          solicitante_depto: solicDepto,
          solicitante_tel: solicTel,
          guardar_borrador: borrador ? '1' : '',
        })
      }).then(r => r.json())
      if (!r.ok) throw new Error(r.error)
      alert(`OC creada: ${r.id}${r.fuera_ventana ? ' (Fuera de ventana — revisar)' : ''}`)
      onCreated()
    } catch (e: any) {
      alert(e.message)
    } finally { setSubmitting(false) }
  }

  function selectProveedor(id: string) {
    setProveedorId(id)
    const p = proveedores.find((x: any) => x.id === id)
    if (p) { setProveedorRfc(p.rfc); setProveedorRazon(p.razon_social) }
  }

  return (
    <div style={{ background:'var(--ul-surface)', border:'1px solid var(--ul-border)', borderRadius:12, padding:'24px' }}>
      <h2 style={{ fontSize:18, fontWeight:700, margin:'0 0 16px' }}>Nueva Orden de Compra</h2>

      <Section title="Datos del solicitante">
        <Grid cols={4}>
          <Field label="Nombre"><input value={solicNombre} onChange={e=>setSolicNombre(e.target.value)} style={input}/></Field>
          <Field label="Puesto"><input value={solicPuesto} onChange={e=>setSolicPuesto(e.target.value)} style={input}/></Field>
          <Field label="Departamento">
            <select value={solicDepto} onChange={e=>setSolicDepto(e.target.value)} style={input}>
              <option value="">— Seleccionar —</option>
              {departamentos.map((d: any) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </Field>
          <Field label="Teléfono"><input value={solicTel} onChange={e=>setSolicTel(e.target.value)} style={input}/></Field>
        </Grid>
      </Section>

      <Section title="Clasificación">
        <Grid cols={3}>
          <Field label="Empresa *">
            <select value={empresa} onChange={e=>setEmpresa(e.target.value)} style={input}>
              {empresas.map((emp: any) => <option key={emp.key} value={emp.key}>{emp.label}</option>)}
            </select>
          </Field>
          <Field label="Tipo de compra *">
            <select value={tipoCompra} onChange={e=>setTipoCompra(e.target.value)} style={input}>
              {tipos.map((t: any) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Categoría">
            <select value={categoria} onChange={e=>setCategoria(e.target.value)} style={input}>
              <option value="">— Seleccionar —</option>
              {categorias.map((c: any) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </Field>
        </Grid>
        {requiereJustif && (
          <Field label="Justificación * (obligatoria para No recurrente / Urgente)">
            <textarea value={justificacion} onChange={e=>setJustificacion(e.target.value)} rows={3} style={{ ...input, resize:'vertical' }} placeholder="Describe la razón de esta compra fuera del flujo recurrente..."/>
          </Field>
        )}
      </Section>

      <Section title="Items">
        <div style={{ overflowX:'auto', marginBottom:8 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:760 }}>
            <thead>
              <tr style={{ background:'var(--ul-surface-2)' }}>
                <Th style={{ width:36 }}>#</Th>
                <Th style={{ width:140 }}>Cantidad</Th>
                <Th style={{ width:100 }}>Unidad</Th>
                <Th>Nombre del material *</Th>
                <Th>Descripción / Especificación</Th>
                <Th>Marca/Modelo</Th>
                {verMontos && <Th style={{ width:110 }}>P. Unit.</Th>}
                {verMontos && <Th style={{ width:110 }}>Importe</Th>}
                <Th style={{ width:36 }}></Th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} style={{ borderBottom:'1px solid var(--ul-border)' }}>
                  <Td style={{ textAlign:'center', color:'var(--ul-text-subtle)' }}>{it.posicion}</Td>
                  <Td>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <button type="button" onClick={()=>stepQty(i,-1)} style={qtyBtn}>−</button>
                      <input type="number" min="0" step="1" value={it.cantidad} onChange={e=>updItem(i,{ cantidad: Number(e.target.value) || 0 })} style={{ ...input, width:60, textAlign:'center', padding:'6px 4px' }}/>
                      <button type="button" onClick={()=>stepQty(i,1)} style={qtyBtn}>+</button>
                    </div>
                  </Td>
                  <Td>
                    <select value={it.unidad} onChange={e=>updItem(i,{ unidad: e.target.value })} style={{ ...input, padding:'6px 4px' }}>
                      {unidades.map((u: any) => <option key={u.key} value={u.key}>{u.label}</option>)}
                    </select>
                  </Td>
                  <Td><input value={it.nombre} onChange={e=>updItem(i,{ nombre: e.target.value })} style={{ ...input, padding:'6px 8px' }} placeholder="Producto/servicio"/></Td>
                  <Td><input value={it.descripcion} onChange={e=>updItem(i,{ descripcion: e.target.value })} style={{ ...input, padding:'6px 8px' }}/></Td>
                  <Td><input value={it.marca_modelo} onChange={e=>updItem(i,{ marca_modelo: e.target.value })} style={{ ...input, padding:'6px 8px' }}/></Td>
                  {verMontos && <Td><input type="number" min="0" step="0.01" value={it.precio_unitario} onChange={e=>updItem(i,{ precio_unitario: Number(e.target.value) || 0 })} style={{ ...input, padding:'6px 8px', textAlign:'right' }}/></Td>}
                  {verMontos && <Td style={{ textAlign:'right', fontWeight:600 }}>${(it.cantidad * it.precio_unitario).toLocaleString('es-MX', { minimumFractionDigits:2 })}</Td>}
                  <Td><button type="button" onClick={()=>rmItem(i)} style={{ ...qtyBtn, background:'#fee2e2', color:'#dc2626' }}>×</button></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={addItem} style={{ background:'var(--ul-bg)', border:'1px dashed var(--ul-border)', borderRadius:8, padding:'10px 16px', fontSize:13, cursor:'pointer', width:'100%', color:'var(--ul-text-muted)' }}>+ Agregar item</button>
        {!verMontos && (
          <div style={{ marginTop:10, padding:'10px 14px', background:'var(--ul-surface-2)', border:'1px solid var(--ul-border)', borderRadius:8, fontSize:12, color:'var(--ul-text-muted)' }}>
            ℹ Esta orden es una <strong style={{ color:'var(--ul-text)' }}>solicitud de compra</strong>. El área de Compras se encarga de cotizar precios y seleccionar proveedor. No es necesario que captures montos.
          </div>
        )}
      </Section>

      {/* Proveedor sugerido — colapsable, oculto por defecto */}
      <div style={{ marginBottom:16 }}>
        <button type="button" onClick={() => setShowProveedor(s => !s)} style={{
          width:'100%', padding:'10px 14px', background:'var(--ul-surface-2)', border:'1px solid var(--ul-border)',
          borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between',
          color:'var(--ul-text-muted)', fontSize:12, fontWeight:600,
        }}>
          <span>{showProveedor ? '▼' : '▶'} ¿Tienes un proveedor sugerido? <span style={{ opacity:.6, fontWeight:400, marginLeft:6 }}>(opcional — Compras puede definirlo)</span></span>
        </button>
        {showProveedor && (
          <div style={{ marginTop:10, padding:14, background:'var(--ul-surface)', border:'1px solid var(--ul-border)', borderRadius:8 }}>
            <Grid cols={3}>
              <Field label="Buscar proveedor">
                <select value={proveedorId} onChange={e=>selectProveedor(e.target.value)} style={input}>
                  <option value="">— Capturar manual —</option>
                  {proveedores.map((p: any) => <option key={p.id} value={p.id}>{p.razon_social} ({p.rfc})</option>)}
                </select>
              </Field>
              <Field label="RFC"><input value={proveedorRfc} onChange={e=>setProveedorRfc(e.target.value.toUpperCase())} style={input}/></Field>
              <Field label="Razón social"><input value={proveedorRazon} onChange={e=>setProveedorRazon(e.target.value)} style={input}/></Field>
            </Grid>
          </div>
        )}
      </div>

      <Section title="Observaciones y totales">
        <Field label="Observaciones">
          <textarea value={observaciones} onChange={e=>setObservaciones(e.target.value)} rows={3} style={{ ...input, resize:'vertical' }}/>
        </Field>
        {verMontos && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:8 }}>
            <label style={{ fontSize:13, display:'flex', alignItems:'center', gap:6, color:'var(--ul-text)' }}>
              <input type="checkbox" checked={aplicaIva} onChange={e=>setAplicaIva(e.target.checked)}/> Aplica IVA (16%)
            </label>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:12, color:'var(--ul-text-subtle)' }}>Subtotal: ${subtotal.toLocaleString('es-MX', { minimumFractionDigits:2 })}</div>
              <div style={{ fontSize:12, color:'var(--ul-text-subtle)' }}>IVA: ${iva.toLocaleString('es-MX', { minimumFractionDigits:2 })}</div>
              <div style={{ fontSize:18, fontWeight:800, color:'var(--ul-accent)' }}>Total: ${total.toLocaleString('es-MX', { minimumFractionDigits:2 })}</div>
            </div>
          </div>
        )}
      </Section>

      <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
        <button type="button" disabled={submitting} onClick={() => submit(true)} style={{ background:'var(--ul-bg)', border:'1px solid var(--ul-border)', borderRadius:8, padding:'10px 18px', cursor:'pointer' }}>Guardar borrador</button>
        <button type="button" disabled={submitting} onClick={() => submit(false)} style={{ background: brand.color, border:'none', borderRadius:8, padding:'10px 24px', fontWeight:600, color:'var(--ul-text)', cursor:'pointer' }}>{submitting ? 'Enviando...' : 'Enviar a aprobación'}</button>
      </div>
    </div>
  )
}

// ─── Modal de Detalle ────────────────────────────────────────
function DetailModal({ data, token, brand, user, puedeAprobar, puedeCompras, onClose, onUpdated }: any) {
  const o = data.orden, items = data.items || [], history = data.history || [], aprobs = data.aprobaciones || []
  const [busy, setBusy] = useState('')
  const [coment, setComent] = useState('')

  async function callAprobar() {
    const c = prompt('Comentario (opcional):') || ''
    if (c === null) return
    setBusy('aprobar')
    const r = await fetch(`/api/compras/ordenes/${o.id}/aprobar`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ comentario: c })}).then(r=>r.json())
    setBusy('')
    if (!r.ok) return alert(r.error)
    onUpdated()
  }

  async function callRechazar() {
    const m = prompt('Motivo de rechazo (obligatorio):') || ''
    if (!m.trim()) return
    setBusy('rechazar')
    const r = await fetch(`/api/compras/ordenes/${o.id}/rechazar`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ motivo: m })}).then(r=>r.json())
    setBusy('')
    if (!r.ok) return alert(r.error)
    onUpdated()
  }

  async function descargarPdf() {
    setBusy('pdf')
    window.open(`/api/compras/ordenes/${o.id}/pdf?download=1`, '_blank')
    setBusy('')
  }

  async function enviarOC() {
    const to = prompt('Email(s) del proveedor o destinatarios (coma-separados):') || ''
    if (!to.trim()) return
    setBusy('enviar')
    const r = await fetch(`/api/compras/ordenes/${o.id}/enviar`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ destinatarios: to.split(',').map(s=>s.trim()).filter(Boolean) })}).then(r=>r.json())
    setBusy('')
    if (!r.ok) return alert(r.error)
    alert('OC enviada por email')
    onUpdated()
  }

  async function patchEstatus(estatus: string, extra: any = {}) {
    setBusy(estatus)
    const r = await fetch(`/api/compras/ordenes/${o.id}`, { method:'PATCH', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ estatus, ...extra })}).then(r=>r.json())
    setBusy('')
    if (!r.ok) return alert(r.error)
    onUpdated()
  }

  const canAprobar = puedeAprobar && o.estatus === 'pendiente_aprob'
  const canGestion = puedeCompras && ['aprobada','en_compra','en_transito','recibida_parcial','recibida_total','facturada'].includes(o.estatus)

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, zIndex:60 }}>
      <div style={{ background:'var(--ul-surface)', borderRadius:14, padding:0, maxWidth:980, width:'100%', maxHeight:'92vh', overflow:'auto' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--ul-border)', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, background:'var(--ul-surface)', zIndex:1 }}>
          <div>
            <div style={{ fontSize:11, color:'var(--ul-text-subtle)', textTransform:'uppercase', letterSpacing:'.5px' }}>Orden de compra</div>
            <h2 style={{ fontSize:20, fontWeight:700, margin:0 }}>{o.id}</h2>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Badge text={ESTATUS_LABEL[o.estatus] || o.estatus} color={ESTATUS_COLOR[o.estatus] || '#888'}/>
            <button onClick={onClose} style={{ background:'transparent', border:'1px solid var(--ul-border)', borderRadius:8, padding:'6px 12px', cursor:'pointer' }}>Cerrar</button>
          </div>
        </div>

        <div style={{ padding:24 }}>
          <Grid cols={3}>
            <Info label="Solicitante" value={o.solicitante_nombre || o.solicitante_email}/>
            <Info label="Puesto" value={o.solicitante_puesto}/>
            <Info label="Departamento" value={o.solicitante_depto}/>
            <Info label="Empresa" value={o.empresa}/>
            <Info label="Tipo" value={(o.tipo_compra || '').replace('_',' ')}/>
            <Info label="Categoría" value={o.categoria}/>
            <Info label="Proveedor" value={o.proveedor_razon}/>
            <Info label="RFC" value={o.proveedor_rfc}/>
            <Info label="Fecha" value={new Date(o.created_at).toLocaleString('es-MX')}/>
          </Grid>

          {o.justificacion && <Section title="Justificación"><div style={{ fontSize:13, color:'var(--ul-text)', whiteSpace:'pre-wrap' }}>{o.justificacion}</div></Section>}
          {o.observaciones && <Section title="Observaciones"><div style={{ fontSize:13, color:'var(--ul-text)', whiteSpace:'pre-wrap' }}>{o.observaciones}</div></Section>}

          <Section title="Items">
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead><tr style={{ background:'var(--ul-surface-2)' }}><Th>#</Th><Th>Cant</Th><Th>Unidad</Th><Th>Nombre</Th><Th>Descripción</Th><Th>P.Unit</Th><Th>Importe</Th></tr></thead>
              <tbody>
                {items.map((it: any) => (
                  <tr key={it.id} style={{ borderBottom:'1px solid var(--ul-border)' }}>
                    <Td>{it.posicion}</Td><Td>{it.cantidad}</Td><Td>{it.unidad}</Td>
                    <Td>{it.nombre}</Td><Td>{it.descripcion}</Td>
                    <Td style={{ textAlign:'right' }}>${Number(it.precio_unitario).toLocaleString('es-MX', { minimumFractionDigits:2 })}</Td>
                    <Td style={{ textAlign:'right', fontWeight:600 }}>${Number(it.importe).toLocaleString('es-MX', { minimumFractionDigits:2 })}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:12 }}>
              <div style={{ textAlign:'right', fontSize:13 }}>
                <div style={{ color:'var(--ul-text-subtle)' }}>Subtotal: ${Number(o.subtotal).toLocaleString('es-MX', { minimumFractionDigits:2 })}</div>
                <div style={{ color:'var(--ul-text-subtle)' }}>IVA: ${Number(o.iva).toLocaleString('es-MX', { minimumFractionDigits:2 })}</div>
                <div style={{ fontSize:18, fontWeight:800, color:'var(--ul-accent)' }}>Total: ${Number(o.total).toLocaleString('es-MX', { minimumFractionDigits:2 })}</div>
              </div>
            </div>
          </Section>

          <Section title="Aprobaciones">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:8 }}>
              {aprobs.length === 0 && <div style={{ color:'var(--ul-text-subtle)', fontSize:12 }}>Sin niveles configurados</div>}
              {aprobs.map((a: any) => (
                <div key={a.id} style={{ border:'1px solid var(--ul-border)', borderRadius:8, padding:10, fontSize:11 }}>
                  <div style={{ color:'var(--ul-text-subtle)', textTransform:'uppercase', letterSpacing:'.5px' }}>Nivel {a.nivel}</div>
                  <div style={{ fontWeight:600, fontSize:13, margin:'2px 0' }}>{a.nombre}</div>
                  <div style={{ color:'var(--ul-text-subtle)' }}>{a.email || '—'}</div>
                  <Badge text={(a.decision || 'pendiente').toUpperCase()} color={a.decision === 'aprobada' ? '#10b981' : a.decision === 'rechazada' ? '#ef4444' : '#888'}/>
                  {a.comentario && <div style={{ fontSize:11, marginTop:4, color:'var(--ul-text-muted)' }}>"{a.comentario}"</div>}
                </div>
              ))}
            </div>
          </Section>

          <Section title="Historial">
            {history.map((h: any) => (
              <div key={h.id} style={{ display:'flex', gap:12, padding:'6px 0', fontSize:12, borderTop:'1px solid var(--ul-border)' }}>
                <div style={{ color:'var(--ul-text-subtle)', minWidth:140 }}>{new Date(h.created_at).toLocaleString('es-MX')}</div>
                <div style={{ minWidth:120, fontWeight:600 }}>{h.action}</div>
                <div style={{ color:'var(--ul-text)', flex:1 }}>{h.note || `${h.estatus_prev || ''} → ${h.estatus_new || ''}`}</div>
                <div style={{ color:'var(--ul-text-subtle)' }}>{h.actor_email}</div>
              </div>
            ))}
          </Section>

          <div style={{ display:'flex', flexWrap:'wrap', gap:8, padding:'16px 0', borderTop:'1px solid #e5e4e0', marginTop:8 }}>
            <button onClick={descargarPdf} style={btn('#fff','#191919','#e5e4e0')}>📄 Descargar PDF</button>
            {canAprobar && <button onClick={callAprobar} disabled={busy === 'aprobar'} style={btn('#10b981','#fff')}>✓ Aprobar</button>}
            {canAprobar && <button onClick={callRechazar} disabled={busy === 'rechazar'} style={btn('#ef4444','#fff')}>✗ Rechazar</button>}
            {puedeCompras && o.estatus === 'aprobada' && <button onClick={enviarOC} disabled={busy === 'enviar'} style={btn(brand.color,'#191919')}>📧 Enviar a proveedor</button>}
            {canGestion && o.estatus !== 'recibida_total' && <button onClick={() => { const c = prompt('Confirmar recepción total?'); if (c !== null) patchEstatus('recibida_total', { fecha_recepcion: new Date().toISOString(), recibido_por: user.email, observaciones_recep: c }) }} style={btn('#059669','#fff')}>📦 Marcar recibida</button>}
            {canGestion && !['facturada','pagada','cerrada'].includes(o.estatus) && <button onClick={() => { const f = prompt('Folio de factura:'); if (f) patchEstatus('facturada', { factura_folio: f, fecha_factura: new Date().toISOString() }) }} style={btn('#0891b2','#fff')}>🧾 Marcar facturada</button>}
            {canGestion && o.estatus === 'facturada' && <button onClick={() => patchEstatus('pagada', { fecha_pago: new Date().toISOString() })} style={btn('#16a34a','#fff')}>💰 Marcar pagada</button>}
            {puedeCompras && !['cancelada','cerrada'].includes(o.estatus) && <button onClick={() => { if (confirm('¿Cancelar OC?')) patchEstatus('cancelada') }} style={btn('#fee2e2','#dc2626','#fecaca')}>Cancelar</button>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Admin Panel ─────────────────────────────────────────────
function AdminPanel({ token, brand, settings, setSettings, niveles, setNiveles, proveedores, setProveedores, catalogos, setCatalogos, reloadOrdenes }: any) {
  const [sub, setSub] = useState<'settings'|'niveles'|'proveedores'|'usuarios'|'pdfs'|'presupuestos'>('settings')

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {[
          ['settings','Configuración'],
          ['niveles','Niveles aprobación'],
          ['proveedores','Proveedores'],
          ['usuarios','Usuarios y roles'],
          ['pdfs','Gestión PDFs'],
          ['presupuestos','Presupuestos'],
        ].map(([k,label]) => (
          <button key={k} onClick={()=>setSub(k as any)} style={{
            padding:'8px 14px', borderRadius:8, border:'1px solid var(--ul-border)',
            background: sub === k ? 'var(--ul-accent)' : 'var(--ul-surface)', color: sub === k ? 'var(--ul-accent-fg)' : 'var(--ul-text)', fontWeight: sub === k ? 700 : 500, cursor:'pointer', fontSize:13,
          }}>{label}</button>
        ))}
      </div>

      {sub === 'settings' && <AdminSettings token={token} brand={brand} settings={settings} setSettings={setSettings}/>}
      {sub === 'niveles' && <AdminNiveles token={token} brand={brand} niveles={niveles} setNiveles={setNiveles}/>}
      {sub === 'proveedores' && <AdminProveedores token={token} brand={brand} proveedores={proveedores} setProveedores={setProveedores}/>}
      {sub === 'usuarios' && <AdminUsuarios token={token} brand={brand}/>}
      {sub === 'pdfs' && <AdminPdfs token={token} brand={brand}/>}
      {sub === 'presupuestos' && <AdminPresupuestos token={token} brand={brand} catalogos={catalogos}/>}
    </div>
  )
}

function AdminSettings({ token, brand, settings, setSettings }: any) {
  const [busy, setBusy] = useState(false)
  function set(k: string, v: string) { setSettings({ ...settings, [k]: v }) }
  async function save() {
    setBusy(true)
    const r = await fetch('/api/compras/settings', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(settings)}).then(r=>r.json())
    setBusy(false)
    alert(r.ok ? 'Guardado' : (r.error || 'Error'))
  }

  return (
    <div style={card}>
      <h3 style={h3}>Emails institucionales <span style={{ fontSize:11, color:'var(--ul-text-subtle)', fontWeight:400 }}>(opcionales — todos pueden quedar vacíos)</span></h3>
      <Grid cols={3}>
        <Field label="Compras"><input value={settings.COMPRAS_EMAIL_COMPRAS || ''} onChange={e=>set('COMPRAS_EMAIL_COMPRAS', e.target.value)} style={input}/></Field>
        <Field label="Jefe Compras Nacionales *"><input value={settings.COMPRAS_EMAIL_JEFE_COMPRAS_NACIONALES || ''} onChange={e=>set('COMPRAS_EMAIL_JEFE_COMPRAS_NACIONALES', e.target.value)} style={input}/></Field>
        <Field label="Gerente Administrativo *"><input value={settings.COMPRAS_EMAIL_GERENTE_ADM || ''} onChange={e=>set('COMPRAS_EMAIL_GERENTE_ADM', e.target.value)} style={input}/></Field>
        <Field label="Contraloría"><input value={settings.COMPRAS_EMAIL_CONTRALORIA || ''} onChange={e=>set('COMPRAS_EMAIL_CONTRALORIA', e.target.value)} style={input}/></Field>
        <Field label="Dirección"><input value={settings.COMPRAS_EMAIL_DIRECCION || ''} onChange={e=>set('COMPRAS_EMAIL_DIRECCION', e.target.value)} style={input}/></Field>
        <Field label="Contabilidad"><input value={settings.COMPRAS_EMAIL_CONTABILIDAD || ''} onChange={e=>set('COMPRAS_EMAIL_CONTABILIDAD', e.target.value)} style={input}/></Field>
        <Field label="Almacén"><input value={settings.COMPRAS_EMAIL_ALMACEN || ''} onChange={e=>set('COMPRAS_EMAIL_ALMACEN', e.target.value)} style={input}/></Field>
      </Grid>
      <div style={{ fontSize:11, color:'var(--ul-text-subtle)', marginTop:4 }}>* Los marcados con asterisco influyen en routing de aprobación PT-COMP, pero no son obligatorios.</div>

      <h3 style={h3}>Folio</h3>
      <Grid cols={4}>
        <Field label="Prefijo"><input value={settings.COMPRAS_FOLIO_PREFIX || ''} onChange={e=>set('COMPRAS_FOLIO_PREFIX', e.target.value)} style={input}/></Field>
        <Field label="Año actual"><input value={settings.COMPRAS_FOLIO_YEAR || ''} onChange={e=>set('COMPRAS_FOLIO_YEAR', e.target.value)} style={input}/></Field>
        <Field label="Siguiente secuencial"><input value={settings.COMPRAS_FOLIO_SEQ || ''} onChange={e=>set('COMPRAS_FOLIO_SEQ', e.target.value)} style={input}/></Field>
        <Field label="Padding (dígitos)"><input value={settings.COMPRAS_FOLIO_PAD || ''} onChange={e=>set('COMPRAS_FOLIO_PAD', e.target.value)} style={input}/></Field>
      </Grid>

      <h3 style={h3}>Plazos (hábiles / horas)</h3>
      <Grid cols={4}>
        <Field label="Plazo recurrente"><input value={settings.COMPRAS_PLAZO_RECURRENTE_HABILES || ''} onChange={e=>set('COMPRAS_PLAZO_RECURRENTE_HABILES', e.target.value)} style={input}/></Field>
        <Field label="Plazo no recurrente"><input value={settings.COMPRAS_PLAZO_NORECURRENTE_HABILES || ''} onChange={e=>set('COMPRAS_PLAZO_NORECURRENTE_HABILES', e.target.value)} style={input}/></Field>
        <Field label="Plazo factura (hrs)"><input value={settings.COMPRAS_FACTURA_PLAZO_HRS || ''} onChange={e=>set('COMPRAS_FACTURA_PLAZO_HRS', e.target.value)} style={input}/></Field>
        <Field label="Plazo aprobación (hrs)"><input value={settings.COMPRAS_APPROVAL_EXPIRY_HRS || ''} onChange={e=>set('COMPRAS_APPROVAL_EXPIRY_HRS', e.target.value)} style={input}/></Field>
      </Grid>

      <h3 style={h3}>Ventanas por tipo de compra</h3>
      {['RECURRENTE','NO_RECURRENTE','URGENTE'].map(k => (
        <div key={k} style={{ border:'1px solid var(--ul-border)', borderRadius:8, padding:12, marginBottom:8 }}>
          <div style={{ fontWeight:600, marginBottom:8, textTransform:'capitalize' }}>{k.replace('_',' ').toLowerCase()}</div>
          <Grid cols={4}>
            <Field label="Día inicio"><input value={settings[`COMPRAS_VENTANA_${k}_DIAS_INICIO`] || ''} onChange={e=>set(`COMPRAS_VENTANA_${k}_DIAS_INICIO`, e.target.value)} style={input}/></Field>
            <Field label="Día fin"><input value={settings[`COMPRAS_VENTANA_${k}_DIAS_FIN`] || ''} onChange={e=>set(`COMPRAS_VENTANA_${k}_DIAS_FIN`, e.target.value)} style={input}/></Field>
            <Field label="Permite finde">
              <select value={settings[`COMPRAS_VENTANA_${k}_PERMITE_FINSEM`] || 'false'} onChange={e=>set(`COMPRAS_VENTANA_${k}_PERMITE_FINSEM`, e.target.value)} style={input}>
                <option value="true">Sí</option><option value="false">No</option>
              </select>
            </Field>
            <Field label="Validar (bloqueante)">
              <select value={settings[`COMPRAS_VENTANA_${k}_VALIDAR`] || 'false'} onChange={e=>set(`COMPRAS_VENTANA_${k}_VALIDAR`, e.target.value)} style={input}>
                <option value="false">No (advisory)</option><option value="true">Sí (bloquea)</option>
              </select>
            </Field>
          </Grid>
        </div>
      ))}

      <h3 style={h3}>Flags y otros</h3>
      <Grid cols={3}>
        <Field label="Min. cotizaciones (no recurrente)"><input value={settings.COMPRAS_MIN_COTIZACIONES_NORECURRENTE || ''} onChange={e=>set('COMPRAS_MIN_COTIZACIONES_NORECURRENTE', e.target.value)} style={input}/></Field>
        <Field label="Requiere justificación urgente">
          <select value={settings.COMPRAS_REQUIERE_JUSTIF_URGENTE || 'true'} onChange={e=>set('COMPRAS_REQUIERE_JUSTIF_URGENTE', e.target.value)} style={input}>
            <option value="true">Sí</option><option value="false">No</option>
          </select>
        </Field>
        <Field label="Días sin actualizar (recordatorio)"><input value={settings.COMPRAS_REMINDER_DAYS || ''} onChange={e=>set('COMPRAS_REMINDER_DAYS', e.target.value)} style={input}/></Field>
        <Field label="Retención PDF (días)"><input value={settings.COMPRAS_PDF_RETENTION_DAYS || ''} onChange={e=>set('COMPRAS_PDF_RETENTION_DAYS', e.target.value)} style={input}/></Field>
        <Field label="Auto-link ticket → OC">
          <select value={settings.COMPRAS_AUTO_LINK_TICKET || 'true'} onChange={e=>set('COMPRAS_AUTO_LINK_TICKET', e.target.value)} style={input}>
            <option value="true">Sí</option><option value="false">No</option>
          </select>
        </Field>
      </Grid>

      <h3 style={h3}>Branding y sanciones</h3>
      <Grid cols={3}>
        <Field label="Nombre empresa"><input value={settings.COMPRAS_BRAND_NOMBRE || ''} onChange={e=>set('COMPRAS_BRAND_NOMBRE', e.target.value)} style={input}/></Field>
        <Field label="Color primario"><input value={settings.COMPRAS_BRAND_COLOR || ''} onChange={e=>set('COMPRAS_BRAND_COLOR', e.target.value)} style={input}/></Field>
        <Field label="Logo URL"><input value={settings.COMPRAS_BRAND_LOGO_URL || ''} onChange={e=>set('COMPRAS_BRAND_LOGO_URL', e.target.value)} style={input}/></Field>
      </Grid>
      <Field label="Texto sanción factura tardía"><textarea value={settings.COMPRAS_SANCION_FACTURA_TARDIA || ''} onChange={e=>set('COMPRAS_SANCION_FACTURA_TARDIA', e.target.value)} rows={2} style={{ ...input, resize:'vertical' }}/></Field>

      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
        <button onClick={save} disabled={busy} style={btn(brand.color, '#191919')}>{busy ? 'Guardando...' : 'Guardar configuración'}</button>
      </div>
    </div>
  )
}

function AdminNiveles({ token, brand, niveles, setNiveles }: any) {
  const [edit, setEdit] = useState<any>(null)
  async function reload() {
    const r = await fetch('/api/compras/niveles', { headers: { Authorization: `Bearer ${token}` }}).then(r=>r.json())
    if (r.ok) setNiveles(r.niveles || [])
  }
  async function save(n: any) {
    const r = await fetch('/api/compras/niveles', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(n)}).then(r=>r.json())
    if (!r.ok) return alert(r.error)
    setEdit(null); reload()
  }
  async function del(nivel: number) {
    if (!confirm(`Eliminar nivel ${nivel}?`)) return
    const r = await fetch(`/api/compras/niveles?nivel=${nivel}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` }}).then(r=>r.json())
    if (!r.ok) return alert(r.error)
    reload()
  }
  return (
    <div style={card}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <h3 style={h3}>Niveles de autorización</h3>
        <button onClick={()=>setEdit({ nivel: (niveles[niveles.length-1]?.nivel || 0) + 1, nombre:'', monto_hasta:0, email:'', puesto:'', activo:true })} style={btn(brand.color,'#191919')}>+ Nuevo</button>
      </div>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead><tr style={{ background:'var(--ul-surface-2)' }}><Th>Nivel</Th><Th>Nombre</Th><Th>Monto hasta</Th><Th>Email</Th><Th>Puesto</Th><Th>Activo</Th><Th></Th></tr></thead>
        <tbody>
          {niveles.map((n: any) => (
            <tr key={n.id} style={{ borderBottom:'1px solid var(--ul-border)' }}>
              <Td>{n.nivel}</Td><Td>{n.nombre}</Td>
              <Td>${Number(n.monto_hasta || 0).toLocaleString('es-MX')}</Td>
              <Td>{n.email || '—'}</Td><Td>{n.puesto || '—'}</Td>
              <Td>{n.activo ? '✓' : '✗'}</Td>
              <Td>
                <button onClick={()=>setEdit(n)} style={smBtn}>Editar</button>
                <button onClick={()=>del(n.nivel)} style={{ ...smBtn, color:'#dc2626' }}>Eliminar</button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
      {edit && <NivelForm n={edit} onSave={save} onClose={()=>setEdit(null)} brand={brand}/>}
    </div>
  )
}

function NivelForm({ n, onSave, onClose, brand }: any) {
  const [d, setD] = useState(n)
  return (
    <Modal onClose={onClose} title="Editar nivel">
      <Grid cols={2}>
        <Field label="Nivel *"><input type="number" value={d.nivel} onChange={e=>setD({ ...d, nivel: Number(e.target.value)})} style={input}/></Field>
        <Field label="Nombre *"><input value={d.nombre || ''} onChange={e=>setD({ ...d, nombre: e.target.value})} style={input}/></Field>
        <Field label="Monto hasta (0 = sin límite)"><input type="number" value={d.monto_hasta || 0} onChange={e=>setD({ ...d, monto_hasta: Number(e.target.value)})} style={input}/></Field>
        <Field label="Puesto"><input value={d.puesto || ''} onChange={e=>setD({ ...d, puesto: e.target.value})} style={input}/></Field>
        <Field label="Email aprobador"><input value={d.email || ''} onChange={e=>setD({ ...d, email: e.target.value})} style={input}/></Field>
        <Field label="Activo"><select value={d.activo ? 'true' : 'false'} onChange={e=>setD({ ...d, activo: e.target.value === 'true'})} style={input}><option value="true">Sí</option><option value="false">No</option></select></Field>
      </Grid>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
        <button onClick={onClose} style={btn('#f7f6f3','#191919','#e5e4e0')}>Cancelar</button>
        <button onClick={()=>onSave(d)} style={btn(brand.color,'#191919')}>Guardar</button>
      </div>
    </Modal>
  )
}

function AdminProveedores({ token, brand, proveedores, setProveedores }: any) {
  const [edit, setEdit] = useState<any>(null)
  const [q, setQ] = useState('')
  async function reload() {
    const r = await fetch('/api/compras/proveedores?activos=0', { headers: { Authorization: `Bearer ${token}` }}).then(r=>r.json())
    if (r.ok) setProveedores(r.proveedores || [])
  }
  async function save(p: any) {
    const r = await fetch('/api/compras/proveedores', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(p)}).then(r=>r.json())
    if (!r.ok) return alert(r.error)
    setEdit(null); reload()
  }
  const filtrados = proveedores.filter((p: any) => !q || `${p.razon_social} ${p.rfc} ${p.nombre_comercial}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <div style={card}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, gap:12 }}>
        <h3 style={h3}>Proveedores</h3>
        <div style={{ display:'flex', gap:8 }}>
          <input placeholder="Buscar..." value={q} onChange={e=>setQ(e.target.value)} style={{ ...input, width:240 }}/>
          <button onClick={()=>setEdit({ rfc:'', razon_social:'', activo:true })} style={btn(brand.color,'#191919')}>+ Nuevo</button>
        </div>
      </div>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead><tr style={{ background:'var(--ul-surface-2)' }}><Th>RFC</Th><Th>Razón social</Th><Th>Contacto</Th><Th>Categoría</Th><Th>Activo</Th><Th></Th></tr></thead>
        <tbody>
          {filtrados.map((p: any) => (
            <tr key={p.id} style={{ borderBottom:'1px solid var(--ul-border)' }}>
              <Td>{p.rfc}</Td><Td>{p.razon_social}</Td>
              <Td>{p.contacto_nombre || '—'} {p.contacto_email && <span style={{ color:'var(--ul-text-subtle)', fontSize:11 }}>· {p.contacto_email}</span>}</Td>
              <Td>{p.categoria}</Td><Td>{p.activo ? '✓' : '✗'}</Td>
              <Td><button onClick={()=>setEdit(p)} style={smBtn}>Editar</button></Td>
            </tr>
          ))}
        </tbody>
      </table>
      {edit && <ProveedorForm p={edit} onSave={save} onClose={()=>setEdit(null)} brand={brand}/>}
    </div>
  )
}

function ProveedorForm({ p, onSave, onClose, brand }: any) {
  const [d, setD] = useState(p)
  return (
    <Modal onClose={onClose} title={p.id ? 'Editar proveedor' : 'Nuevo proveedor'} wide>
      <Grid cols={2}>
        <Field label="RFC *"><input value={d.rfc || ''} onChange={e=>setD({ ...d, rfc: e.target.value.toUpperCase()})} style={input}/></Field>
        <Field label="Razón social *"><input value={d.razon_social || ''} onChange={e=>setD({ ...d, razon_social: e.target.value})} style={input}/></Field>
        <Field label="Nombre comercial"><input value={d.nombre_comercial || ''} onChange={e=>setD({ ...d, nombre_comercial: e.target.value})} style={input}/></Field>
        <Field label="Categoría / Giro"><input value={d.categoria || ''} onChange={e=>setD({ ...d, categoria: e.target.value})} style={input}/></Field>
        <Field label="Contacto"><input value={d.contacto_nombre || ''} onChange={e=>setD({ ...d, contacto_nombre: e.target.value})} style={input}/></Field>
        <Field label="Email contacto"><input value={d.contacto_email || ''} onChange={e=>setD({ ...d, contacto_email: e.target.value})} style={input}/></Field>
        <Field label="Teléfono contacto"><input value={d.contacto_tel || ''} onChange={e=>setD({ ...d, contacto_tel: e.target.value})} style={input}/></Field>
        <Field label="Dirección"><input value={d.direccion || ''} onChange={e=>setD({ ...d, direccion: e.target.value})} style={input}/></Field>
        <Field label="Banco"><input value={d.banco || ''} onChange={e=>setD({ ...d, banco: e.target.value})} style={input}/></Field>
        <Field label="Cuenta"><input value={d.cuenta || ''} onChange={e=>setD({ ...d, cuenta: e.target.value})} style={input}/></Field>
        <Field label="CLABE"><input value={d.clabe || ''} onChange={e=>setD({ ...d, clabe: e.target.value})} style={input}/></Field>
        <Field label="Activo"><select value={d.activo === false ? 'false' : 'true'} onChange={e=>setD({ ...d, activo: e.target.value === 'true'})} style={input}><option value="true">Sí</option><option value="false">No</option></select></Field>
      </Grid>
      <Field label="Notas"><textarea value={d.notas || ''} onChange={e=>setD({ ...d, notas: e.target.value})} rows={2} style={{ ...input, resize:'vertical' }}/></Field>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
        <button onClick={onClose} style={btn('#f7f6f3','#191919','#e5e4e0')}>Cancelar</button>
        <button onClick={()=>onSave(d)} style={btn(brand.color,'#191919')}>Guardar</button>
      </div>
    </Modal>
  )
}

function AdminUsuarios({ token, brand }: any) {
  const [users, setUsers] = useState<any[]>([])
  const [edit, setEdit] = useState<any>(null)
  async function reload() {
    const r = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` }}).then(r=>r.json())
    if (r.ok) setUsers(r.users || [])
  }
  useEffect(() => { reload() }, [])
  async function save(u: any) {
    const r = await fetch(`/api/users/${u.id}`, { method:'PATCH', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(u)}).then(r=>r.json())
    if (!r.ok) return alert(r.error)
    setEdit(null); reload()
  }
  return (
    <div style={card}>
      <h3 style={h3}>Usuarios y roles</h3>
      <div style={{ fontSize:12, color:'var(--ul-text-subtle)', marginBottom:8 }}>Todos los usuarios tienen rol base USUARIO. Asigna roles adicionales: HELPDESK · COMPRAS · APROBADOR · ADMIN.</div>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead><tr style={{ background:'var(--ul-surface-2)' }}><Th>Email</Th><Th>Nombre</Th><Th>Depto</Th><Th>Rol principal</Th><Th>Roles extra</Th><Th>Estado</Th><Th></Th></tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={{ borderBottom:'1px solid var(--ul-border)' }}>
              <Td>{u.email}</Td><Td>{u.nombre || '—'}</Td><Td>{u.departamento || '—'}</Td>
              <Td>{u.rol}</Td>
              <Td>{Array.isArray(u.roles_extra) && u.roles_extra.length ? u.roles_extra.join(', ') : '—'}</Td>
              <Td>{u.estado}</Td>
              <Td><button onClick={()=>setEdit(u)} style={smBtn}>Editar</button></Td>
            </tr>
          ))}
        </tbody>
      </table>
      {edit && <UsuarioForm u={edit} onSave={save} onClose={()=>setEdit(null)} brand={brand}/>}
    </div>
  )
}

function UsuarioForm({ u, onSave, onClose, brand }: any) {
  const [d, setD] = useState({ ...u, roles_extra: Array.isArray(u.roles_extra) ? u.roles_extra : [] })
  const allRoles = ['HELPDESK','COMPRAS','APROBADOR','ADMIN']
  function toggleRol(r: string) {
    const has = d.roles_extra.includes(r)
    setD({ ...d, roles_extra: has ? d.roles_extra.filter((x: string) => x !== r) : [...d.roles_extra, r] })
  }
  return (
    <Modal onClose={onClose} title={u.email}>
      <Grid cols={2}>
        <Field label="Nombre"><input value={d.nombre || ''} onChange={e=>setD({ ...d, nombre: e.target.value})} style={input}/></Field>
        <Field label="Rol principal">
          <select value={d.rol || 'USUARIO'} onChange={e=>setD({ ...d, rol: e.target.value})} style={input}>
            <option value="USUARIO">USUARIO</option><option value="HELPDESK">HELPDESK</option>
            <option value="COMPRAS">COMPRAS</option><option value="APROBADOR">APROBADOR</option><option value="ADMIN">ADMIN</option>
          </select>
        </Field>
        <Field label="Puesto"><input value={d.puesto || ''} onChange={e=>setD({ ...d, puesto: e.target.value})} style={input}/></Field>
        <Field label="Departamento"><input value={d.departamento || ''} onChange={e=>setD({ ...d, departamento: e.target.value})} style={input}/></Field>
        <Field label="Teléfono"><input value={d.telefono || ''} onChange={e=>setD({ ...d, telefono: e.target.value})} style={input}/></Field>
        <Field label="Nivel aprobación"><input type="number" value={d.nivel_aprobacion ?? ''} onChange={e=>setD({ ...d, nivel_aprobacion: e.target.value ? Number(e.target.value) : null })} style={input}/></Field>
        <Field label="Estado"><select value={d.estado || 'ACTIVO'} onChange={e=>setD({ ...d, estado: e.target.value})} style={input}><option value="ACTIVO">ACTIVO</option><option value="INACTIVO">INACTIVO</option></select></Field>
      </Grid>
      <Field label="Roles adicionales">
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {allRoles.map(r => (
            <label key={r} style={{ fontSize:13, display:'flex', alignItems:'center', gap:4, padding:'6px 10px', border:`1px solid ${d.roles_extra.includes(r) ? brand.color : '#e5e4e0'}`, borderRadius:8, cursor:'pointer', background: d.roles_extra.includes(r) ? brand.color : '#fff' }}>
              <input type="checkbox" checked={d.roles_extra.includes(r)} onChange={()=>toggleRol(r)}/>
              {r}
            </label>
          ))}
        </div>
      </Field>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
        <button onClick={onClose} style={btn('#f7f6f3','#191919','#e5e4e0')}>Cancelar</button>
        <button onClick={()=>onSave(d)} style={btn(brand.color,'#191919')}>Guardar</button>
      </div>
    </Modal>
  )
}

function AdminPdfs({ token, brand }: any) {
  const [pdfs, setPdfs] = useState<any[]>([])
  const [busy, setBusy] = useState(false)
  async function reload() {
    const r = await fetch('/api/compras/admin/pdfs', { headers: { Authorization: `Bearer ${token}` }}).then(r=>r.json())
    if (r.ok) setPdfs(r.pdfs || [])
  }
  useEffect(() => { reload() }, [])
  async function del(filename: string) {
    if (!confirm(`Eliminar ${filename}?`)) return
    await fetch(`/api/compras/admin/pdfs?filename=${encodeURIComponent(filename)}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` }})
    reload()
  }
  async function purgar() {
    if (!confirm('Eliminar PDFs antiguos según retención configurada?')) return
    setBusy(true)
    const r = await fetch('/api/compras/admin/purge-pdfs', { method:'POST', headers:{ Authorization:`Bearer ${token}` }}).then(r=>r.json())
    setBusy(false)
    alert(r.ok ? `${r.deleted} PDFs eliminados` : r.error)
    reload()
  }
  return (
    <div style={card}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <h3 style={h3}>PDFs almacenados ({pdfs.length})</h3>
        <button onClick={purgar} disabled={busy} style={btn('#ef4444','#fff')}>{busy ? 'Purgando...' : '🗑 Ejecutar purga por retención'}</button>
      </div>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead><tr style={{ background:'var(--ul-surface-2)' }}><Th>Folio</Th><Th>Tamaño</Th><Th>Fecha</Th><Th></Th></tr></thead>
        <tbody>
          {pdfs.map(p => (
            <tr key={p.filename} style={{ borderBottom:'1px solid var(--ul-border)' }}>
              <Td><strong>{p.folio}</strong></Td>
              <Td>{Math.round((p.size || 0) / 1024)} KB</Td>
              <Td>{p.created_at ? new Date(p.created_at).toLocaleString('es-MX') : '—'}</Td>
              <Td>
                <a href={p.url} target="_blank" style={{ ...smBtn, textDecoration:'none' }} rel="noreferrer">Descargar</a>
                <button onClick={()=>del(p.filename)} style={{ ...smBtn, color:'#dc2626' }}>Eliminar</button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AdminPresupuestos({ token, brand, catalogos }: any) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState<any[]>([])
  const departamentos = catalogos.compras_departamentos || []
  async function reload() {
    const r = await fetch(`/api/compras/presupuestos?anio=${year}`, { headers: { Authorization: `Bearer ${token}` }}).then(r=>r.json())
    if (r.ok) setData(r.presupuestos || [])
  }
  useEffect(() => { reload() }, [year])
  async function save(p: any) {
    const r = await fetch('/api/compras/presupuestos', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(p)}).then(r=>r.json())
    if (!r.ok) return alert(r.error)
    reload()
  }
  return (
    <div style={card}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <h3 style={h3}>Presupuestos {year}</h3>
        <input type="number" value={year} onChange={e=>setYear(Number(e.target.value))} style={{ ...input, width:120 }}/>
      </div>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead><tr style={{ background:'var(--ul-surface-2)' }}><Th>Departamento</Th><Th>Mes</Th><Th>Monto</Th><Th>Gastado</Th><Th>Restante</Th><Th></Th></tr></thead>
        <tbody>
          {departamentos.flatMap((d: any) =>
            Array.from({ length: 12 }, (_, i) => i + 1).map(mes => {
              const p = data.find(x => x.departamento === d.key && x.mes === mes) || { departamento: d.key, anio: year, mes, monto: 0, gastado: 0 }
              return (
                <tr key={`${d.key}-${mes}`} style={{ borderBottom:'1px solid var(--ul-border)' }}>
                  <Td>{d.label}</Td>
                  <Td>{['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][mes-1]}</Td>
                  <Td><input type="number" defaultValue={p.monto} onBlur={e => save({ ...p, monto: Number(e.target.value) })} style={{ ...input, width:120, padding:'4px 6px' }}/></Td>
                  <Td>${Number(p.gastado || 0).toLocaleString('es-MX')}</Td>
                  <Td style={{ fontWeight:600, color: (p.monto - p.gastado) < 0 ? '#dc2626' : '#10b981' }}>${(Number(p.monto || 0) - Number(p.gastado || 0)).toLocaleString('es-MX')}</Td>
                  <Td></Td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── UI Primitives ───────────────────────────────────────────
const input: React.CSSProperties = { width:'100%', padding:'8px 12px', fontSize:13, borderRadius:8, border:'1px solid var(--ul-border)', background:'var(--ul-surface)', color:'var(--ul-text)', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }
const qtyBtn: React.CSSProperties = { width:24, height:24, border:'1px solid var(--ul-border)', borderRadius:6, background:'var(--ul-bg)', cursor:'pointer', fontSize:13, padding:0, fontWeight:700 }
const smBtn: React.CSSProperties = { background:'transparent', border:'none', cursor:'pointer', color:'#3b82f6', fontSize:12, padding:'4px 8px' }
const card: React.CSSProperties = { background:'var(--ul-surface)', border:'1px solid var(--ul-border)', borderRadius:12, padding:'20px' }
const h3: React.CSSProperties = { fontSize:14, fontWeight:700, color:'var(--ul-text)', margin:'16px 0 8px' }
function btn(bg: string, fg: string, border: string = bg): React.CSSProperties {
  return { background:bg, color:fg, border:`1px solid ${border}`, borderRadius:8, padding:'8px 14px', fontWeight:600, fontSize:13, cursor:'pointer' }
}

function Section({ title, children }: any) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--ul-text-subtle)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8, paddingBottom:4, borderBottom:'1px solid var(--ul-border)' }}>{title}</div>
      {children}
    </div>
  )
}
function Field({ label, children }: any) {
  return (
    <div style={{ marginBottom:10 }}>
      <label style={{ fontSize:11, fontWeight:600, color:'var(--ul-text-subtle)', textTransform:'uppercase', letterSpacing:'.5px', display:'block', marginBottom:4 }}>{label}</label>
      {children}
    </div>
  )
}
function Grid({ cols, children }: any) {
  return <div style={{ display:'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap:'8px' }}>{children}</div>
}
function Th({ children, style }: any) {
  return <th style={{ padding:'10px 12px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--ul-text-subtle)', textTransform:'uppercase', letterSpacing:'.5px', ...style }}>{children}</th>
}
function Td({ children, style }: any) {
  return <td style={{ padding:'10px 12px', fontSize:13, color:'var(--ul-text)', ...style }}>{children}</td>
}
function Badge({ text, color }: any) {
  return <span style={{ display:'inline-block', padding:'2px 8px', background: color + '22', color, borderRadius:12, fontSize:11, fontWeight:600 }}>{text}</span>
}
function Info({ label, value }: any) {
  return <div><div style={{ fontSize:11, color:'var(--ul-text-subtle)', textTransform:'uppercase', letterSpacing:'.5px' }}>{label}</div><div style={{ fontSize:14, color:'var(--ul-text)' }}>{value || '—'}</div></div>
}
function Modal({ children, onClose, title, wide }: any) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, zIndex:70 }}>
      <div style={{ background:'var(--ul-surface)', borderRadius:14, padding:24, maxWidth: wide ? 800 : 520, width:'100%', maxHeight:'92vh', overflow:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <h2 style={{ fontSize:18, fontWeight:700, margin:0 }}>{title}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
