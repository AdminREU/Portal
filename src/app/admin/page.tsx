'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'

type User = { email: string; nombre?: string; rol: string; roles_extra?: string[]; puesto?: string; departamento?: string; telefono?: string }
type Tab = 'avisos' | 'flags' | 'usuarios' | 'ui'

const ROLES_DISPONIBLES = ['HELPDESK', 'COMPRAS', 'APROBADOR', 'ADMIN']

export default function AdminPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [tab, setTab] = useState<Tab>('avisos')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    const t = localStorage.getItem('auth_token') ?? ''
    if (!t) { router.replace('/login'); return }
    setToken(t)
    fetch('/api/users/me', { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()).then(me => {
      if (!me.ok) { router.replace('/login'); return }
      const extras: string[] = me.roles_extra || []
      if (me.user.rol !== 'ADMIN' && !extras.includes('ADMIN')) {
        router.replace('/portal')
        return
      }
      setUser({ ...me.user, roles_extra: extras })
    }).catch(() => router.replace('/login')).finally(() => setLoading(false))
  }, [router])

  function flash(kind: 'ok' | 'err', text: string) {
    setMsg({ kind, text })
    setTimeout(() => setMsg(null), 3500)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ul-bg)' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--ul-border)', borderTopColor: 'var(--ul-accent)', borderRadius: '50%', animation: 'ul-spin .8s linear infinite' }} />
      </div>
    )
  }
  if (!user) return null

  const nav = [
    {
      title: 'ADMINISTRACIÓN',
      items: [
        { key: 'avisos', label: 'Avisos', icon: '📢', onClick: () => setTab('avisos') },
        { key: 'flags', label: 'Funciones', icon: '⚡', onClick: () => setTab('flags') },
        { key: 'usuarios', label: 'Usuarios', icon: '👥', onClick: () => setTab('usuarios') },
        { key: 'ui', label: 'UI / Branding', icon: '🎨', onClick: () => setTab('ui') },
      ],
    },
    {
      title: 'NAVEGACIÓN',
      items: [
        { key: 'portal', label: 'Inicio', icon: '◆', href: '/portal' },
        { key: 'helpdesk', label: 'Helpdesk', icon: '🎫', href: '/helpdesk' },
        { key: 'compras', label: 'Compras', icon: '🛒', href: '/compras' },
      ],
    },
  ]

  return (
    <AppShell app="portal" appLabel="ADMIN" appVersion="Panel General" nav={nav} activeKey={tab} user={user}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 className="ul-display" style={{ fontSize: 28, color: 'var(--ul-text)', letterSpacing: '-0.3px' }}>
          {tab === 'avisos' && 'Gestión de avisos'}
          {tab === 'flags' && 'Funciones del sistema'}
          {tab === 'usuarios' && 'Usuarios y roles'}
          {tab === 'ui' && 'UI y branding'}
        </h1>
        <div style={{ fontSize: 13, color: 'var(--ul-text-subtle)', marginTop: 6 }}>
          {tab === 'avisos' && 'Anuncios, cumpleaños, eventos y frases del tablero del portal'}
          {tab === 'flags' && 'Activa o desactiva funciones de portal, helpdesk y compras'}
          {tab === 'usuarios' && 'Asigna roles extra para conceder permisos adicionales'}
          {tab === 'ui' && 'Logo, color institucional y nombre de la aplicación'}
        </div>
      </div>

      {msg && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 14,
          background: msg.kind === 'ok' ? 'rgba(52,211,153,.12)' : 'rgba(248,113,113,.12)',
          border: `1px solid ${msg.kind === 'ok' ? 'var(--ul-success)' : 'var(--ul-danger)'}`,
          color: msg.kind === 'ok' ? 'var(--ul-success)' : 'var(--ul-danger)',
          fontSize: 13, fontWeight: 600,
        }}>{msg.text}</div>
      )}

      {tab === 'avisos' && <AvisosTab token={token} flash={flash} />}
      {tab === 'flags' && <FlagsTab token={token} flash={flash} />}
      {tab === 'usuarios' && <UsuariosTab token={token} flash={flash} />}
      {tab === 'ui' && <UITab token={token} flash={flash} />}
    </AppShell>
  )
}

/* ============================================================
   TAB AVISOS — anuncios / cumpleaños / eventos / frases / tareas
   ============================================================ */
function AvisosTab({ token, flash }: { token: string; flash: (k: 'ok' | 'err', t: string) => void }) {
  const [section, setSection] = useState<'anuncios' | 'cumples' | 'eventos' | 'frases' | 'tareas'>('anuncios')
  return (
    <div>
      <div style={pillsRow}>
        {[
          { k: 'anuncios', l: 'Anuncios' },
          { k: 'cumples', l: 'Cumpleaños' },
          { k: 'eventos', l: 'Eventos' },
          { k: 'frases', l: 'Frases del día' },
          { k: 'tareas', l: 'Tareas' },
        ].map((s: any) => (
          <button key={s.k} onClick={() => setSection(s.k)} style={pill(section === s.k)}>{s.l}</button>
        ))}
      </div>
      {section === 'anuncios' && <Anuncios token={token} flash={flash} />}
      {section === 'cumples' && <Cumples token={token} flash={flash} />}
      {section === 'eventos' && <Eventos token={token} flash={flash} />}
      {section === 'frases' && <Frases token={token} flash={flash} />}
      {section === 'tareas' && <Tareas token={token} flash={flash} />}
    </div>
  )
}

function Anuncios({ token, flash }: any) {
  const [list, setList] = useState<any[]>([])
  const [form, setForm] = useState({ categoria: 'ANUNCIO', titulo: '', mensaje: '', icono: '📢', prioridad: 0, expira_at: '', activo: true })
  const [loading, setLoading] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  async function load() {
    const r = await fetch('/api/avisos/anuncios?todos=1', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    if (r.ok) setList(r.anuncios)
  }
  useEffect(() => { load() }, [])

  async function save() {
    if (!form.titulo.trim()) return flash('err', 'Título requerido')
    setLoading(true)
    try {
      const url = editId ? `/api/avisos/anuncios/${editId}` : '/api/avisos/anuncios'
      const method = editId ? 'PATCH' : 'POST'
      const r = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, expira_at: form.expira_at || null }),
      }).then(r => r.json())
      if (!r.ok) throw new Error(r.error)
      flash('ok', editId ? 'Anuncio actualizado' : 'Anuncio creado')
      setForm({ categoria: 'ANUNCIO', titulo: '', mensaje: '', icono: '📢', prioridad: 0, expira_at: '', activo: true })
      setEditId(null)
      load()
    } catch (e: any) { flash('err', e.message) } finally { setLoading(false) }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este anuncio?')) return
    const r = await fetch(`/api/avisos/anuncios/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    if (r.ok) { flash('ok', 'Eliminado'); load() } else flash('err', r.error)
  }

  function startEdit(a: any) {
    setEditId(a.id)
    setForm({
      categoria: a.categoria, titulo: a.titulo, mensaje: a.mensaje || '',
      icono: a.icono || '📢', prioridad: a.prioridad,
      expira_at: a.expira_at ? a.expira_at.slice(0, 16) : '',
      activo: a.activo,
    })
  }

  return (
    <div style={twoCols}>
      <Card title={editId ? 'Editar anuncio' : 'Nuevo anuncio'}>
        <Row>
          <Field label="Categoría">
            <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} style={input}>
              {['ANUNCIO', 'SISTEMAS', 'CAPACIT.', 'RH', 'OPERACIONES', 'COMPRAS', 'HELPDESK'].map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Prioridad">
            <select value={form.prioridad} onChange={e => setForm({ ...form, prioridad: Number(e.target.value) })} style={input}>
              <option value={0}>Normal</option>
              <option value={1}>Destacado</option>
              <option value={2}>Urgente</option>
            </select>
          </Field>
        </Row>
        <Field label="Título">
          <input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} style={input} placeholder="Mantenimiento programado..." />
        </Field>
        <Field label="Mensaje">
          <textarea value={form.mensaje} onChange={e => setForm({ ...form, mensaje: e.target.value })} style={{ ...input, minHeight: 70 }} placeholder="Detalles del anuncio..." />
        </Field>
        <Row>
          <Field label="Icono"><input value={form.icono} onChange={e => setForm({ ...form, icono: e.target.value })} style={input} /></Field>
          <Field label="Expira (opcional)"><input type="datetime-local" value={form.expira_at} onChange={e => setForm({ ...form, expira_at: e.target.value })} style={input} /></Field>
        </Row>
        <Field label="">
          <label style={checkLbl}>
            <input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} /> Activo
          </label>
        </Field>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={save} disabled={loading} style={btnPrimary}>{loading ? '...' : (editId ? 'Actualizar' : 'Crear')}</button>
          {editId && <button onClick={() => { setEditId(null); setForm({ categoria: 'ANUNCIO', titulo: '', mensaje: '', icono: '📢', prioridad: 0, expira_at: '', activo: true }) }} style={btnGhost}>Cancelar</button>}
        </div>
      </Card>

      <Card title={`Anuncios (${list.length})`}>
        {list.length === 0 ? <Empty /> : list.map(a => (
          <div key={a.id} style={listItem}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={catBadge}>{a.categoria}</span>
              {a.prioridad > 0 && <span style={{ ...miniBadge, background: a.prioridad === 2 ? 'var(--ul-danger)' : 'var(--ul-accent)', color: a.prioridad === 2 ? '#fff' : 'var(--ul-accent-fg)' }}>{a.prioridad === 2 ? 'URGENTE' : 'DESTACADO'}</span>}
              {!a.activo && <span style={{ ...miniBadge, background: 'var(--ul-text-subtle)' }}>INACTIVO</span>}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ul-text)' }}>{a.icono} {a.titulo}</div>
            {a.mensaje && <div style={{ fontSize: 12, color: 'var(--ul-text-muted)', marginTop: 4 }}>{a.mensaje}</div>}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button onClick={() => startEdit(a)} style={btnSm}>Editar</button>
              <button onClick={() => remove(a.id)} style={{ ...btnSm, color: 'var(--ul-danger)' }}>Eliminar</button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}

function Cumples({ token, flash }: any) {
  const [list, setList] = useState<any[]>([])
  const [form, setForm] = useState({ nombre: '', email: '', departamento: '', tipo: 'cumple', dia: 1, mes: 1, anio: '', foto_url: '', mostrar: true })
  const [editId, setEditId] = useState<string | null>(null)

  async function load() {
    const r = await fetch('/api/avisos/cumpleanos', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    if (r.ok) setList(r.cumpleanos)
  }
  useEffect(() => { load() }, [])

  async function save() {
    if (!form.nombre || !form.dia || !form.mes) return flash('err', 'Nombre, día y mes son requeridos')
    try {
      const url = editId ? `/api/avisos/cumpleanos/${editId}` : '/api/avisos/cumpleanos'
      const method = editId ? 'PATCH' : 'POST'
      const r = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, anio: form.anio || null }),
      }).then(r => r.json())
      if (!r.ok) throw new Error(r.error)
      flash('ok', editId ? 'Actualizado' : 'Creado')
      setForm({ nombre: '', email: '', departamento: '', tipo: 'cumple', dia: 1, mes: 1, anio: '', foto_url: '', mostrar: true })
      setEditId(null); load()
    } catch (e: any) { flash('err', e.message) }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar?')) return
    const r = await fetch(`/api/avisos/cumpleanos/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    if (r.ok) { flash('ok', 'Eliminado'); load() }
  }

  function startEdit(c: any) {
    setEditId(c.id)
    setForm({ nombre: c.nombre, email: c.email || '', departamento: c.departamento || '', tipo: c.tipo, dia: c.dia, mes: c.mes, anio: c.anio || '', foto_url: c.foto_url || '', mostrar: c.mostrar })
  }

  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  return (
    <div style={twoCols}>
      <Card title={editId ? 'Editar' : 'Nuevo cumpleaños / aniversario'}>
        <Row>
          <Field label="Nombre"><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} style={input} /></Field>
          <Field label="Email (opcional)"><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={input} /></Field>
        </Row>
        <Row>
          <Field label="Departamento"><input value={form.departamento} onChange={e => setForm({ ...form, departamento: e.target.value })} style={input} placeholder="Ventas, Producción..." /></Field>
          <Field label="Tipo">
            <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} style={input}>
              <option value="cumple">Cumpleaños</option>
              <option value="aniversario">Aniversario laboral</option>
              <option value="onomastico">Onomástico</option>
            </select>
          </Field>
        </Row>
        <Row>
          <Field label="Día"><input type="number" min={1} max={31} value={form.dia} onChange={e => setForm({ ...form, dia: Number(e.target.value) })} style={input} /></Field>
          <Field label="Mes">
            <select value={form.mes} onChange={e => setForm({ ...form, mes: Number(e.target.value) })} style={input}>
              {meses.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </Field>
          <Field label="Año (aniv)"><input type="number" value={form.anio} onChange={e => setForm({ ...form, anio: e.target.value as any })} style={input} placeholder="opcional" /></Field>
        </Row>
        <Field label="Foto URL (opcional)"><input value={form.foto_url} onChange={e => setForm({ ...form, foto_url: e.target.value })} style={input} placeholder="https://..." /></Field>
        <Field label="">
          <label style={checkLbl}><input type="checkbox" checked={form.mostrar} onChange={e => setForm({ ...form, mostrar: e.target.checked })} /> Mostrar en portal</label>
        </Field>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={save} style={btnPrimary}>{editId ? 'Actualizar' : 'Crear'}</button>
          {editId && <button onClick={() => { setEditId(null); setForm({ nombre: '', email: '', departamento: '', tipo: 'cumple', dia: 1, mes: 1, anio: '', foto_url: '', mostrar: true }) }} style={btnGhost}>Cancelar</button>}
        </div>
      </Card>

      <Card title={`Registrados (${list.length})`}>
        {list.length === 0 ? <Empty /> : list.map(c => (
          <div key={c.id} style={listItem}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {c.foto_url ? <img src={c.foto_url} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} alt="" /> : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--ul-accent)', color: 'var(--ul-accent-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{c.nombre.charAt(0)}</div>}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ul-text)' }}>{c.nombre} {!c.mostrar && <span style={{ fontSize: 10, color: 'var(--ul-text-subtle)' }}>(oculto)</span>}</div>
                <div style={{ fontSize: 11, color: 'var(--ul-text-subtle)' }}>{c.departamento || c.tipo} · {meses[c.mes - 1]} {c.dia}{c.anio ? ` · ${c.anio}` : ''}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button onClick={() => startEdit(c)} style={btnSm}>Editar</button>
              <button onClick={() => remove(c.id)} style={{ ...btnSm, color: 'var(--ul-danger)' }}>Eliminar</button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}

function Eventos({ token, flash }: any) {
  const [list, setList] = useState<any[]>([])
  const [form, setForm] = useState({ titulo: '', descripcion: '', tipo: 'evento', fecha: '', hora_inicio: '', lugar: '', icono: '🎉', color: '#a78bfa', activo: true })
  const [editId, setEditId] = useState<string | null>(null)

  async function load() {
    const desde = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
    const r = await fetch(`/api/avisos/eventos?desde=${desde}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    if (r.ok) setList(r.eventos)
  }
  useEffect(() => { load() }, [])

  async function save() {
    if (!form.titulo || !form.fecha) return flash('err', 'Título y fecha requeridos')
    try {
      const url = editId ? `/api/avisos/eventos/${editId}` : '/api/avisos/eventos'
      const method = editId ? 'PATCH' : 'POST'
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...form, hora_inicio: form.hora_inicio || null }) }).then(r => r.json())
      if (!r.ok) throw new Error(r.error)
      flash('ok', editId ? 'Actualizado' : 'Creado')
      setForm({ titulo: '', descripcion: '', tipo: 'evento', fecha: '', hora_inicio: '', lugar: '', icono: '🎉', color: '#a78bfa', activo: true })
      setEditId(null); load()
    } catch (e: any) { flash('err', e.message) }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar?')) return
    const r = await fetch(`/api/avisos/eventos/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    if (r.ok) { flash('ok', 'Eliminado'); load() }
  }

  function startEdit(e: any) {
    setEditId(e.id)
    setForm({ titulo: e.titulo, descripcion: e.descripcion || '', tipo: e.tipo, fecha: e.fecha, hora_inicio: e.hora_inicio || '', lugar: e.lugar || '', icono: e.icono || '🎉', color: e.color || '#a78bfa', activo: e.activo })
  }

  return (
    <div style={twoCols}>
      <Card title={editId ? 'Editar evento' : 'Nuevo evento'}>
        <Field label="Título"><input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} style={input} /></Field>
        <Field label="Descripción"><textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} style={{ ...input, minHeight: 60 }} /></Field>
        <Row>
          <Field label="Fecha"><input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} style={input} /></Field>
          <Field label="Hora"><input type="time" value={form.hora_inicio} onChange={e => setForm({ ...form, hora_inicio: e.target.value })} style={input} /></Field>
        </Row>
        <Row>
          <Field label="Tipo">
            <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} style={input}>
              <option value="evento">Evento</option>
              <option value="convivio">Convivio</option>
              <option value="junta">Junta</option>
              <option value="capacitacion">Capacitación</option>
              <option value="mantenimiento">Mantenimiento</option>
            </select>
          </Field>
          <Field label="Lugar"><input value={form.lugar} onChange={e => setForm({ ...form, lugar: e.target.value })} style={input} /></Field>
        </Row>
        <Row>
          <Field label="Icono"><input value={form.icono} onChange={e => setForm({ ...form, icono: e.target.value })} style={input} /></Field>
          <Field label="Color"><input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ ...input, height: 38, padding: 4 }} /></Field>
        </Row>
        <Field label=""><label style={checkLbl}><input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} /> Activo</label></Field>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={save} style={btnPrimary}>{editId ? 'Actualizar' : 'Crear'}</button>
          {editId && <button onClick={() => setEditId(null)} style={btnGhost}>Cancelar</button>}
        </div>
      </Card>

      <Card title={`Eventos próximos (${list.length})`}>
        {list.length === 0 ? <Empty /> : list.map(e => (
          <div key={e.id} style={listItem}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: e.color || 'var(--ul-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{e.icono || '🎉'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ul-text)' }}>{e.titulo}</div>
                <div style={{ fontSize: 11, color: 'var(--ul-text-subtle)' }}>{e.fecha}{e.hora_inicio ? ` · ${e.hora_inicio}` : ''} · {e.tipo}{e.lugar ? ` · ${e.lugar}` : ''}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button onClick={() => startEdit(e)} style={btnSm}>Editar</button>
              <button onClick={() => remove(e.id)} style={{ ...btnSm, color: 'var(--ul-danger)' }}>Eliminar</button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}

function Frases({ token, flash }: any) {
  const [list, setList] = useState<any[]>([])
  const [form, setForm] = useState({ texto: '', autor: '', categoria: 'motivacion', activo: true })

  async function load() {
    const r = await fetch('/api/avisos/frases', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    if (r.ok) setList(r.frases)
  }
  useEffect(() => { load() }, [])

  async function save() {
    if (!form.texto.trim()) return flash('err', 'Texto requerido')
    const r = await fetch('/api/avisos/frases', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) }).then(r => r.json())
    if (r.ok) { flash('ok', 'Frase creada'); setForm({ texto: '', autor: '', categoria: 'motivacion', activo: true }); load() } else flash('err', r.error)
  }

  async function toggle(id: string, activo: boolean) {
    const r = await fetch(`/api/avisos/frases/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ activo }) }).then(r => r.json())
    if (r.ok) load()
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar?')) return
    const r = await fetch(`/api/avisos/frases/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    if (r.ok) { flash('ok', 'Eliminada'); load() }
  }

  return (
    <div style={twoCols}>
      <Card title="Nueva frase">
        <Field label="Texto"><textarea value={form.texto} onChange={e => setForm({ ...form, texto: e.target.value })} style={{ ...input, minHeight: 80 }} placeholder="La calidad nunca es un accidente..." /></Field>
        <Row>
          <Field label="Autor"><input value={form.autor} onChange={e => setForm({ ...form, autor: e.target.value })} style={input} placeholder="John Ruskin" /></Field>
          <Field label="Categoría">
            <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} style={input}>
              <option value="motivacion">Motivación</option>
              <option value="calidad">Calidad</option>
              <option value="gestion">Gestión</option>
              <option value="innovacion">Innovación</option>
              <option value="perseverancia">Perseverancia</option>
            </select>
          </Field>
        </Row>
        <button onClick={save} style={btnPrimary}>Crear frase</button>
      </Card>

      <Card title={`Frases registradas (${list.length})`}>
        {list.length === 0 ? <Empty /> : list.map(f => (
          <div key={f.id} style={{ ...listItem, opacity: f.activo ? 1 : .5 }}>
            <div style={{ fontSize: 13, color: 'var(--ul-text)', fontStyle: 'italic' }}>"{f.texto}"</div>
            {f.autor && <div style={{ fontSize: 11, color: 'var(--ul-text-subtle)', marginTop: 4 }}>— {f.autor}</div>}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button onClick={() => toggle(f.id, !f.activo)} style={btnSm}>{f.activo ? 'Desactivar' : 'Activar'}</button>
              <button onClick={() => remove(f.id)} style={{ ...btnSm, color: 'var(--ul-danger)' }}>Eliminar</button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}

function Tareas({ token, flash }: any) {
  const [list, setList] = useState<any[]>([])
  const [form, setForm] = useState({ titulo: '', descripcion: '', fecha: '', hora: '', prioridad: 'media', modulo: 'portal', asignado_email: '' })

  async function load() {
    const r = await fetch('/api/avisos/tareas?scope=todas', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    if (r.ok) setList(r.tareas)
  }
  useEffect(() => { load() }, [])

  async function save() {
    if (!form.titulo || !form.fecha) return flash('err', 'Título y fecha requeridos')
    const r = await fetch('/api/avisos/tareas', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...form, hora: form.hora || null, asignado_email: form.asignado_email || null }) }).then(r => r.json())
    if (r.ok) { flash('ok', 'Tarea creada'); setForm({ titulo: '', descripcion: '', fecha: '', hora: '', prioridad: 'media', modulo: 'portal', asignado_email: '' }); load() } else flash('err', r.error)
  }

  async function setStatus(id: string, status: string) {
    const r = await fetch(`/api/avisos/tareas/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) }).then(r => r.json())
    if (r.ok) load()
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar?')) return
    const r = await fetch(`/api/avisos/tareas/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    if (r.ok) { flash('ok', 'Eliminada'); load() }
  }

  return (
    <div style={twoCols}>
      <Card title="Nueva tarea">
        <Field label="Título"><input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} style={input} /></Field>
        <Field label="Descripción"><textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} style={{ ...input, minHeight: 60 }} /></Field>
        <Row>
          <Field label="Fecha"><input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} style={input} /></Field>
          <Field label="Hora"><input type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} style={input} /></Field>
        </Row>
        <Row>
          <Field label="Prioridad">
            <select value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value })} style={input}>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </Field>
          <Field label="Asignar a (email, opcional)"><input value={form.asignado_email} onChange={e => setForm({ ...form, asignado_email: e.target.value })} style={input} placeholder="vacío = global" /></Field>
        </Row>
        <button onClick={save} style={btnPrimary}>Crear tarea</button>
      </Card>

      <Card title={`Tareas (${list.length})`}>
        {list.length === 0 ? <Empty /> : list.map(t => (
          <div key={t.id} style={listItem}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ ...miniBadge, background: t.prioridad === 'alta' ? 'var(--ul-danger)' : t.prioridad === 'media' ? 'var(--ul-accent)' : 'var(--ul-text-subtle)', color: t.prioridad === 'media' ? 'var(--ul-accent-fg)' : '#fff' }}>{t.prioridad.toUpperCase()}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ul-text)', textDecoration: t.status === 'completada' ? 'line-through' : 'none' }}>{t.titulo}</div>
                <div style={{ fontSize: 11, color: 'var(--ul-text-subtle)' }}>{t.fecha}{t.hora ? ' ' + t.hora : ''} · {t.status} · {t.asignado_email || 'global'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {t.status !== 'completada' && <button onClick={() => setStatus(t.id, 'completada')} style={btnSm}>Completar</button>}
              {t.status === 'completada' && <button onClick={() => setStatus(t.id, 'pendiente')} style={btnSm}>Reabrir</button>}
              <button onClick={() => remove(t.id)} style={{ ...btnSm, color: 'var(--ul-danger)' }}>Eliminar</button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}

/* ============================================================
   TAB FLAGS — feature toggles
   ============================================================ */
function FlagsTab({ token, flash }: any) {
  const [flags, setFlags] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const r = await fetch('/api/avisos/feature-flags', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    if (r.ok) setFlags(r.flags)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function toggle(clave: string, valor: boolean) {
    setFlags(fs => fs.map(f => f.clave === clave ? { ...f, valor } : f))
    const r = await fetch('/api/avisos/feature-flags', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ clave, valor })
    }).then(r => r.json())
    if (!r.ok) { flash('err', r.error); load() } else flash('ok', `${clave} actualizado`)
  }

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {}
    for (const f of flags) {
      const cat = f.categoria || 'global'
      if (!g[cat]) g[cat] = []
      g[cat].push(f)
    }
    return g
  }, [flags])

  if (loading) return <Empty />

  return (
    <div>
      {Object.entries(grouped).map(([cat, items]) => (
        <Card key={cat} title={cat.toUpperCase()}>
          {items.map(f => (
            <div key={f.clave} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--ul-border)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ul-text)', fontFamily: 'monospace' }}>{f.clave}</div>
                {f.descripcion && <div style={{ fontSize: 11, color: 'var(--ul-text-subtle)', marginTop: 2 }}>{f.descripcion}</div>}
              </div>
              <Switch checked={f.valor} onChange={(v) => toggle(f.clave, v)} />
            </div>
          ))}
        </Card>
      ))}
    </div>
  )
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 999, border: 'none',
        background: checked ? 'var(--ul-accent)' : 'var(--ul-surface-2)',
        position: 'relative', cursor: 'pointer', transition: 'background .2s',
      }}
      aria-pressed={checked}
    >
      <span style={{
        position: 'absolute', top: 2, left: checked ? 22 : 2, width: 20, height: 20, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.3)', transition: 'left .2s',
      }} />
    </button>
  )
}

/* ============================================================
   TAB USUARIOS — asignar roles_extra
   ============================================================ */
function UsuariosTab({ token, flash }: any) {
  const [users, setUsers] = useState<any[]>([])
  const [q, setQ] = useState('')

  async function load() {
    const r = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    if (r.ok) setUsers(r.users)
  }
  useEffect(() => { load() }, [])

  async function toggleRol(u: any, rol: string) {
    const extras: string[] = Array.isArray(u.roles_extra) ? [...u.roles_extra] : []
    const has = extras.includes(rol)
    const newExtras = has ? extras.filter(r => r !== rol) : [...extras, rol]
    const r = await fetch(`/api/users/${u.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ roles_extra: newExtras })
    }).then(r => r.json())
    if (r.ok) { flash('ok', `${has ? '-' : '+'}${rol} para ${u.email}`); load() } else flash('err', r.error)
  }

  async function toggleEstado(u: any) {
    const nuevo = u.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO'
    const r = await fetch(`/api/users/${u.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ estado: nuevo })
    }).then(r => r.json())
    if (r.ok) { flash('ok', `Usuario ${nuevo.toLowerCase()}`); load() }
  }

  const filtered = users.filter(u =>
    !q || u.email?.toLowerCase().includes(q.toLowerCase()) || u.nombre?.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div>
      <Card title="Usuarios">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por email o nombre..." style={{ ...input, marginBottom: 12 }} />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--ul-surface-2)' }}>
                <Th2>Usuario</Th2>
                <Th2>Rol base</Th2>
                {ROLES_DISPONIBLES.map(r => <Th2 key={r}><span style={{ fontSize: 10, fontWeight: 700 }}>{r}</span></Th2>)}
                <Th2>Estado</Th2>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const extras: string[] = Array.isArray(u.roles_extra) ? u.roles_extra : []
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--ul-border)' }}>
                    <Td2>
                      <div style={{ fontWeight: 600, color: 'var(--ul-text)' }}>{u.nombre || u.email.split('@')[0]}</div>
                      <div style={{ fontSize: 11, color: 'var(--ul-text-subtle)' }}>{u.email}</div>
                    </Td2>
                    <Td2><span style={{ ...miniBadge, background: u.rol === 'ADMIN' ? 'var(--ul-accent)' : 'var(--ul-surface-2)', color: u.rol === 'ADMIN' ? 'var(--ul-accent-fg)' : 'var(--ul-text)' }}>{u.rol}</span></Td2>
                    {ROLES_DISPONIBLES.map(r => (
                      <Td2 key={r}>
                        <input type="checkbox" checked={extras.includes(r)} onChange={() => toggleRol(u, r)} disabled={u.rol === r} style={{ accentColor: 'var(--ul-accent)' }} />
                      </Td2>
                    ))}
                    <Td2>
                      <button onClick={() => toggleEstado(u)} style={{ ...btnSm, color: u.estado === 'ACTIVO' ? 'var(--ul-success)' : 'var(--ul-text-subtle)' }}>{u.estado || 'ACTIVO'}</button>
                    </Td2>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

/* ============================================================
   TAB UI — branding (nombre, color, logo)
   ============================================================ */
function UITab({ token, flash }: any) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#ffd400')
  const [logo, setLogo] = useState('')
  const [uploading, setUploading] = useState(false)

  async function load() {
    const r = await fetch('/api/branding').then(r => r.json())
    if (r.ok) { setName(r.name); setColor(r.primaryColor || '#ffd400'); setLogo(r.logoUrl || '') }
  }
  useEffect(() => { load() }, [])

  async function save() {
    const r = await fetch('/api/settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ settings: [{ key: 'APP_NAME', value: name }, { key: 'APP_PRIMARY_COLOR', value: color }] })
    }).then(r => r.json())
    if (r.ok) flash('ok', 'Branding actualizado'); else flash('err', r.error)
  }

  async function uploadLogo(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const r = await fetch('/api/branding/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd }).then(r => r.json())
    if (r.ok) { setLogo(r.url); flash('ok', 'Logo subido') } else flash('err', r.error)
    setUploading(false)
  }

  async function removeLogo() {
    if (!confirm('¿Eliminar logo?')) return
    const r = await fetch('/api/branding/upload', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    if (r.ok) { setLogo(''); flash('ok', 'Logo eliminado') }
  }

  return (
    <div style={twoCols}>
      <Card title="Identidad">
        <Field label="Nombre de la aplicación"><input value={name} onChange={e => setName(e.target.value)} style={input} /></Field>
        <Field label="Color institucional (HEX)">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 50, height: 38, borderRadius: 8, border: '1px solid var(--ul-border)', padding: 4 }} />
            <input value={color} onChange={e => setColor(e.target.value)} style={{ ...input, flex: 1 }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--ul-text-subtle)', marginTop: 4 }}>
            El sistema de tema usa <strong style={{ color: 'var(--ul-accent)' }}>#ffd400</strong> como acento. Este campo se conserva por compatibilidad con módulos legacy.
          </div>
        </Field>
        <button onClick={save} style={btnPrimary}>Guardar</button>
      </Card>

      <Card title="Logo">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          {logo
            ? <img src={logo} alt="Logo actual" style={{ width: 120, height: 120, objectFit: 'contain', borderRadius: 12, background: 'var(--ul-surface-2)', padding: 12 }} />
            : <div style={{ width: 120, height: 120, borderRadius: 12, background: 'var(--ul-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--ul-text-subtle)' }}>Sin logo</div>
          }
          <label style={{ ...btnPrimary, display: 'inline-block', cursor: 'pointer' }}>
            {uploading ? 'Subiendo...' : 'Subir nuevo logo'}
            <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} style={{ display: 'none' }} />
          </label>
          {logo && <button onClick={removeLogo} style={btnGhost}>Eliminar logo</button>}
          <div style={{ fontSize: 11, color: 'var(--ul-text-subtle)', textAlign: 'center', maxWidth: 280 }}>
            Recomendado: PNG cuadrado con fondo transparente, máximo 2 MB.
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ────────── Primitivas UI ────────── */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--ul-surface)', border: '1px solid var(--ul-border)', borderRadius: 12, padding: 18 }}>
      <div className="ul-display" style={{ fontSize: 12, color: 'var(--ul-text)', letterSpacing: '1px', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--ul-border)' }}>{title}</div>
      {children}
    </div>
  )
}
function Field({ label, children }: any) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--ul-text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{label}</label>}
      {children}
    </div>
  )
}
function Row({ children }: any) { return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>{children}</div> }
function Empty() { return <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--ul-text-subtle)' }}>Sin registros</div> }
function Th2({ children }: any) { return <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--ul-text-subtle)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{children}</th> }
function Td2({ children }: any) { return <td style={{ padding: '10px 8px', fontSize: 13, color: 'var(--ul-text)' }}>{children}</td> }

const twoCols: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }
const input: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--ul-border)', background: 'var(--ul-surface-2)', color: 'var(--ul-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
const checkLbl: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ul-text)', cursor: 'pointer' }
const btnPrimary: React.CSSProperties = { background: 'var(--ul-accent)', color: 'var(--ul-accent-fg)', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { background: 'transparent', color: 'var(--ul-text-muted)', border: '1px solid var(--ul-border)', padding: '10px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }
const btnSm: React.CSSProperties = { background: 'transparent', border: '1px solid var(--ul-border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--ul-text-muted)' }
const listItem: React.CSSProperties = { padding: '12px 0', borderBottom: '1px solid var(--ul-border)' }
const catBadge: React.CSSProperties = { fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 4, background: 'var(--ul-surface-2)', color: 'var(--ul-text-muted)', letterSpacing: '.5px' }
const miniBadge: React.CSSProperties = { fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 4, letterSpacing: '.5px' }
const pillsRow: React.CSSProperties = { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }
const pill = (active: boolean): React.CSSProperties => ({
  padding: '7px 16px', borderRadius: 999, border: '1px solid ' + (active ? 'var(--ul-text)' : 'var(--ul-border)'),
  background: active ? 'var(--ul-text)' : 'transparent', color: active ? 'var(--ul-bg)' : 'var(--ul-text-muted)',
  cursor: 'pointer', fontSize: 12, fontWeight: 600,
})
