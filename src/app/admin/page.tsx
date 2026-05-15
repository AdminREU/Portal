'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'

type User = { email: string; nombre?: string; rol: string; roles_extra?: string[]; puesto?: string; departamento?: string; telefono?: string; foto_url?: string }
type Tab = 'avisos' | 'flags' | 'usuarios' | 'ui' | 'config'

const ROLES_DISPONIBLES = ['HELPDESK', 'COMPRAS', 'APROBADOR', 'ADMIN']
const ROLES_BASE = ['USUARIO', 'HELPDESK', 'COMPRAS', 'APROBADOR', 'ADMIN']

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
        router.replace('/portal'); return
      }
      setUser({ ...me.user, roles_extra: extras })
    }).catch(() => router.replace('/login')).finally(() => setLoading(false))
  }, [router])

  function flash(kind: 'ok' | 'err', text: string) {
    setMsg({ kind, text })
    setTimeout(() => setMsg(null), 3500)
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ul-bg)' }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--ul-border)', borderTopColor: 'var(--ul-accent)', borderRadius: '50%', animation: 'ul-spin .8s linear infinite' }} />
    </div>
  }
  if (!user) return null

  const nav = [
    {
      title: 'NAVEGACIÓN',
      items: [
        { key: 'portal', label: '← Volver al portal', icon: '◆', href: '/portal' },
        { key: 'helpdesk', label: 'Helpdesk', icon: '🎫', href: '/helpdesk' },
        { key: 'compras', label: 'Compras', icon: '🛒', href: '/compras' },
        { key: 'perfil', label: 'Mi perfil', icon: '👤', href: '/perfil' },
      ],
    },
    {
      title: 'CONFIGURACIÓN',
      items: [
        { key: 'avisos', label: 'Avisos', icon: '📢', onClick: () => setTab('avisos') },
        { key: 'flags', label: 'Funciones', icon: '⚡', onClick: () => setTab('flags') },
        { key: 'usuarios', label: 'Usuarios', icon: '👥', onClick: () => setTab('usuarios') },
        { key: 'config', label: 'Textos del portal', icon: '🛠', onClick: () => setTab('config') },
        { key: 'ui', label: 'Marca / Branding', icon: '🎨', onClick: () => setTab('ui') },
      ],
    },
  ]

  return (
    <AppShell app="admin" appLabel="ADMIN" appVersion="Panel General" nav={nav} activeKey={tab} user={user} token={token} showSearch={false}>
      <div style={{ marginBottom: 22 }}>
        <h1 className="ul-display" style={{ fontSize: 28, color: 'var(--ul-text)', letterSpacing: '-0.3px' }}>
          {tab === 'avisos' && 'Gestión de avisos'}
          {tab === 'flags' && 'Funciones del sistema'}
          {tab === 'usuarios' && 'Usuarios y roles'}
          {tab === 'config' && 'Configuración general'}
          {tab === 'ui' && 'UI y branding'}
        </h1>
        <div style={{ fontSize: 13, color: 'var(--ul-text-subtle)', marginTop: 6 }}>
          {tab === 'avisos' && 'Anuncios (con imágenes), cumpleaños, eventos y frases del tablero'}
          {tab === 'flags' && 'Activa o desactiva funciones de portal, helpdesk, compras y globales'}
          {tab === 'usuarios' && 'Asigna roles y activa/desactiva acceso'}
          {tab === 'config' && 'Saludo, mensaje de bienvenida, títulos e iconos de los módulos del portal'}
          {tab === 'ui' && 'Nombre de la aplicación, color institucional y logo'}
        </div>
      </div>

      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14,
          background: msg.kind === 'ok' ? 'rgba(52,211,153,.12)' : 'rgba(248,113,113,.12)',
          border: `1px solid ${msg.kind === 'ok' ? 'var(--ul-success)' : 'var(--ul-danger)'}`,
          color: msg.kind === 'ok' ? 'var(--ul-success)' : 'var(--ul-danger)',
          fontSize: 13, fontWeight: 600,
        }}>{msg.text}</div>
      )}

      {tab === 'avisos' && <AvisosTab token={token} flash={flash} />}
      {tab === 'flags' && <FlagsTab token={token} flash={flash} />}
      {tab === 'usuarios' && <UsuariosTab token={token} flash={flash} />}
      {tab === 'config' && <ConfigTab token={token} flash={flash} />}
      {tab === 'ui' && <UITab token={token} flash={flash} />}
    </AppShell>
  )
}

/* ============================================================
   TAB AVISOS
   ============================================================ */
function AvisosTab({ token, flash }: any) {
  const [section, setSection] = useState<'anuncios' | 'cumples' | 'eventos' | 'frases' | 'tareas'>('anuncios')
  return (
    <div>
      <div style={pillsRow}>
        {[
          { k: 'anuncios', l: 'Anuncios' }, { k: 'cumples', l: 'Cumpleaños' },
          { k: 'eventos', l: 'Eventos' }, { k: 'frases', l: 'Frases del día' },
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

/* ─── Imagen Uploader reutilizable ─── */
function ImageUploader({ token, prefix, value, onChange }: { token: string; prefix: string; value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const r = await fetch(`/api/upload?prefix=${prefix}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd }).then(r => r.json())
    if (r.ok) onChange(r.url)
    else alert(r.error || 'Error al subir')
    setUploading(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {value ? (
        <div style={{ position: 'relative' }}>
          <img src={value} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--ul-border)' }} />
          <button onClick={() => onChange('')} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: 'var(--ul-danger)', color: '#fff', border: '2px solid var(--ul-bg-elev)', cursor: 'pointer', fontSize: 11, lineHeight: 0 }}>×</button>
        </div>
      ) : (
        <div style={{ width: 80, height: 80, borderRadius: 8, background: 'var(--ul-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--ul-text-subtle)', border: '1px dashed var(--ul-border)' }}>Sin imagen</div>
      )}
      <input ref={ref} type="file" accept="image/*" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} style={{ display: 'none' }} />
      <button onClick={() => ref.current?.click()} disabled={uploading} style={btnGhost}>{uploading ? 'Subiendo...' : (value ? 'Cambiar' : 'Subir imagen')}</button>
    </div>
  )
}

function Anuncios({ token, flash }: any) {
  const [list, setList] = useState<any[]>([])
  const [form, setForm] = useState<any>({ categoria: 'ANUNCIO', titulo: '', mensaje: '', icono: '📢', prioridad: 0, expira_at: '', activo: true, imagen_url: '', link: '' })
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...form, expira_at: form.expira_at || null }) }).then(r => r.json())
      if (!r.ok) throw new Error(r.error)
      flash('ok', editId ? 'Anuncio actualizado' : 'Anuncio creado')
      setForm({ categoria: 'ANUNCIO', titulo: '', mensaje: '', icono: '📢', prioridad: 0, expira_at: '', activo: true, imagen_url: '', link: '' })
      setEditId(null); load()
    } catch (e: any) { flash('err', e.message) } finally { setLoading(false) }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar?')) return
    const r = await fetch(`/api/avisos/anuncios/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    if (r.ok) { flash('ok', 'Eliminado'); load() }
  }

  function startEdit(a: any) {
    setEditId(a.id)
    setForm({
      categoria: a.categoria, titulo: a.titulo, mensaje: a.mensaje || '', icono: a.icono || '📢',
      prioridad: a.prioridad, expira_at: a.expira_at ? a.expira_at.slice(0, 16) : '', activo: a.activo,
      imagen_url: a.imagen_url || '', link: a.link || '',
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
              <option value={0}>Normal</option><option value={1}>Destacado</option><option value={2}>Urgente</option>
            </select>
          </Field>
        </Row>
        <Field label="Título"><input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} style={input} placeholder="Mantenimiento programado..." /></Field>
        <Field label="Mensaje (descripción completa)"><textarea value={form.mensaje} onChange={e => setForm({ ...form, mensaje: e.target.value })} style={{ ...input, minHeight: 90 }} placeholder="Detalles del anuncio que se mostrará al hacer click..." /></Field>
        <Field label="Imagen (opcional, se muestra como banner en el modal)">
          <ImageUploader token={token} prefix="anuncios" value={form.imagen_url} onChange={url => setForm({ ...form, imagen_url: url })} />
        </Field>
        <Row>
          <Field label="Icono"><input value={form.icono} onChange={e => setForm({ ...form, icono: e.target.value })} style={input} /></Field>
          <Field label="Expira (opcional)"><input type="datetime-local" value={form.expira_at} onChange={e => setForm({ ...form, expira_at: e.target.value })} style={input} /></Field>
        </Row>
        <Field label="Link externo (opcional)"><input value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} style={input} placeholder="https://..." /></Field>
        <Field label=""><label style={checkLbl}><input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} /> Activo (visible en el portal)</label></Field>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={save} disabled={loading} style={btnPrimary}>{loading ? '...' : (editId ? 'Actualizar' : 'Crear')}</button>
          {editId && <button onClick={() => { setEditId(null); setForm({ categoria: 'ANUNCIO', titulo: '', mensaje: '', icono: '📢', prioridad: 0, expira_at: '', activo: true, imagen_url: '', link: '' }) }} style={btnGhost}>Cancelar</button>}
        </div>
      </Card>

      <Card title={`Anuncios (${list.length})`}>
        {list.length === 0 ? <Empty /> : list.map(a => (
          <div key={a.id} style={listItem}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {a.imagen_url && <img src={a.imagen_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={catBadge}>{a.categoria}</span>
                  {a.prioridad > 0 && <span style={{ ...miniBadge, background: a.prioridad === 2 ? 'var(--ul-danger)' : 'var(--ul-accent)', color: a.prioridad === 2 ? '#fff' : 'var(--ul-accent-fg)' }}>{a.prioridad === 2 ? 'URGENTE' : 'DESTACADO'}</span>}
                  {!a.activo && <span style={{ ...miniBadge, background: 'var(--ul-text-subtle)', color: '#fff' }}>INACTIVO</span>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ul-text)' }}>{a.icono} {a.titulo}</div>
                {a.mensaje && <div style={{ fontSize: 11, color: 'var(--ul-text-muted)', marginTop: 3, lineClamp: 2 } as any}>{a.mensaje}</div>}
              </div>
            </div>
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
  const [form, setForm] = useState<any>({ nombre: '', email: '', departamento: '', tipo: 'cumple', dia: 1, mes: 1, anio: '', foto_url: '', mostrar: true, mensaje: '', imagen_url: '', link: '' })
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
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...form, anio: form.anio || null }) }).then(r => r.json())
      if (!r.ok) throw new Error(r.error)
      flash('ok', editId ? 'Actualizado' : 'Creado')
      setForm({ nombre: '', email: '', departamento: '', tipo: 'cumple', dia: 1, mes: 1, anio: '', foto_url: '', mostrar: true, mensaje: '', imagen_url: '', link: '' })
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
    setForm({ nombre: c.nombre, email: c.email || '', departamento: c.departamento || '', tipo: c.tipo, dia: c.dia, mes: c.mes, anio: c.anio || '', foto_url: c.foto_url || '', mostrar: c.mostrar, mensaje: c.mensaje || '', imagen_url: c.imagen_url || '', link: c.link || '' })
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
          <Field label="Departamento"><input value={form.departamento} onChange={e => setForm({ ...form, departamento: e.target.value })} style={input} /></Field>
          <Field label="Tipo">
            <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} style={input}>
              <option value="cumple">Cumpleaños</option><option value="aniversario">Aniversario</option><option value="onomastico">Onomástico</option>
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
          <Field label="Año (aniv.)"><input type="number" value={form.anio} onChange={e => setForm({ ...form, anio: e.target.value })} style={input} placeholder="opcional" /></Field>
        </Row>
        <Field label="Foto de perfil">
          <ImageUploader token={token} prefix="cumples" value={form.foto_url} onChange={url => setForm({ ...form, foto_url: url })} />
        </Field>
        <Field label="Mensaje (felicitación, dato curioso — se muestra al hacer click en el portal)">
          <textarea value={form.mensaje} onChange={e => setForm({ ...form, mensaje: e.target.value })} style={{ ...input, minHeight: 70 }} placeholder="Ej: María cumple X años con nosotros. Le encanta..." />
        </Field>
        <Field label="Imagen banner (opcional, se muestra como banner en el modal del portal)">
          <ImageUploader token={token} prefix="cumples" value={form.imagen_url} onChange={url => setForm({ ...form, imagen_url: url })} />
        </Field>
        <Field label="Link externo (opcional)"><input value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} style={input} placeholder="https://..." /></Field>
        <Field label=""><label style={checkLbl}><input type="checkbox" checked={form.mostrar} onChange={e => setForm({ ...form, mostrar: e.target.checked })} /> Mostrar en portal</label></Field>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={save} style={btnPrimary}>{editId ? 'Actualizar' : 'Crear'}</button>
          {editId && <button onClick={() => { setEditId(null); setForm({ nombre: '', email: '', departamento: '', tipo: 'cumple', dia: 1, mes: 1, anio: '', foto_url: '', mostrar: true, mensaje: '', imagen_url: '', link: '' }) }} style={btnGhost}>Cancelar</button>}
        </div>
      </Card>

      <Card title={`Registrados (${list.length})`}>
        {list.length === 0 ? <Empty /> : list.map(c => (
          <div key={c.id} style={listItem}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {c.foto_url ? <img src={c.foto_url} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} alt="" /> : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--ul-accent)', color: 'var(--ul-accent-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{c.nombre.charAt(0)}</div>}
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
  const [form, setForm] = useState<any>({ titulo: '', descripcion: '', tipo: 'evento', fecha: '', hora_inicio: '', lugar: '', icono: '🎉', color: '#a78bfa', activo: true, imagen_url: '', link: '' })
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
      setForm({ titulo: '', descripcion: '', tipo: 'evento', fecha: '', hora_inicio: '', lugar: '', icono: '🎉', color: '#a78bfa', activo: true, imagen_url: '', link: '' })
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
    setForm({ titulo: e.titulo, descripcion: e.descripcion || '', tipo: e.tipo, fecha: e.fecha, hora_inicio: e.hora_inicio || '', lugar: e.lugar || '', icono: e.icono || '🎉', color: e.color || '#a78bfa', activo: e.activo, imagen_url: e.imagen_url || '', link: e.link || '' })
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
              <option value="evento">Evento</option><option value="convivio">Convivio</option><option value="junta">Junta</option><option value="capacitacion">Capacitación</option><option value="mantenimiento">Mantenimiento</option>
            </select>
          </Field>
          <Field label="Lugar"><input value={form.lugar} onChange={e => setForm({ ...form, lugar: e.target.value })} style={input} /></Field>
        </Row>
        <Row>
          <Field label="Icono"><input value={form.icono} onChange={e => setForm({ ...form, icono: e.target.value })} style={input} /></Field>
          <Field label="Color"><input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ ...input, height: 38, padding: 4 }} /></Field>
        </Row>
        <Field label="Imagen banner (opcional)">
          <ImageUploader token={token} prefix="eventos" value={form.imagen_url} onChange={url => setForm({ ...form, imagen_url: url })} />
        </Field>
        <Field label="Link externo (opcional)"><input value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} style={input} placeholder="https://..." /></Field>
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
              <div style={{ width: 32, height: 32, borderRadius: 8, background: (e.color || '#a78bfa') + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, border: '1px solid ' + (e.color || '#a78bfa') + '55' }}>{e.icono || '🎉'}</div>
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
        <Field label="Texto"><textarea value={form.texto} onChange={e => setForm({ ...form, texto: e.target.value })} style={{ ...input, minHeight: 80 }} /></Field>
        <Row>
          <Field label="Autor"><input value={form.autor} onChange={e => setForm({ ...form, autor: e.target.value })} style={input} /></Field>
          <Field label="Categoría">
            <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} style={input}>
              <option value="motivacion">Motivación</option><option value="calidad">Calidad</option><option value="gestion">Gestión</option><option value="innovacion">Innovación</option><option value="perseverancia">Perseverancia</option>
            </select>
          </Field>
        </Row>
        <button onClick={save} style={btnPrimary}>Crear frase</button>
      </Card>

      <Card title={`Frases (${list.length})`}>
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
    if (r.ok) { flash('ok', 'Creada'); setForm({ titulo: '', descripcion: '', fecha: '', hora: '', prioridad: 'media', modulo: 'portal', asignado_email: '' }); load() } else flash('err', r.error)
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
          <Field label="Prioridad"><select value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value })} style={input}><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option></select></Field>
          <Field label="Asignar a (email)"><input value={form.asignado_email} onChange={e => setForm({ ...form, asignado_email: e.target.value })} style={input} placeholder="vacío = global" /></Field>
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
   TAB FLAGS
   ============================================================ */
function FlagsTab({ token, flash }: any) {
  const [flags, setFlags] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const r = await fetch('/api/avisos/feature-flags', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    if (r.ok) setFlags(r.flags); setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function toggle(clave: string, valor: boolean) {
    setFlags(fs => fs.map(f => f.clave === clave ? { ...f, valor } : f))
    const r = await fetch('/api/avisos/feature-flags', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ clave, valor }) }).then(r => r.json())
    if (!r.ok) { flash('err', r.error); load() } else flash('ok', `${clave} actualizado`)
  }

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {}
    for (const f of flags) { const cat = f.categoria || 'global'; if (!g[cat]) g[cat] = []; g[cat].push(f) }
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
    <button onClick={() => onChange(!checked)} style={{ width: 44, height: 24, borderRadius: 999, border: 'none', background: checked ? 'var(--ul-accent)' : 'var(--ul-surface-2)', position: 'relative', cursor: 'pointer', transition: 'background .2s' }} aria-pressed={checked}>
      <span style={{ position: 'absolute', top: 2, left: checked ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.3)', transition: 'left .2s' }} />
    </button>
  )
}

/* ============================================================
   TAB USUARIOS — ahora con toggle ACTIVO↔INACTIVO real
   ============================================================ */
function UsuariosTab({ token, flash }: any) {
  const [users, setUsers] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [busyRow, setBusyRow] = useState<string | null>(null)
  const [editUser, setEditUser] = useState<any | null>(null)
  const [newUserOpen, setNewUserOpen] = useState(false)
  const [confirmOtp, setConfirmOtp] = useState<string | null>(null)

  async function load() {
    const r = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    if (r.ok) setUsers(r.users)
  }
  async function loadSessions() {
    const r = await fetch('/api/admin/sessions', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    if (r.ok) setSessions(r.sessions)
  }
  useEffect(() => { load(); loadSessions() }, [])

  async function createUser(payload: any) {
    const r = await fetch('/api/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }).then(r => r.json())
    if (r.ok) { flash('ok', `Usuario ${payload.email} creado`); setNewUserOpen(false); load() }
    else flash('err', r.error || 'Error al crear')
  }

  async function clearOtp(email: string) {
    const r = await fetch('/api/admin/clear-otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email }),
    }).then(r => r.json())
    if (r.ok) { flash('ok', `OTP limpiado para ${email}`); setConfirmOtp(null) }
    else flash('err', r.error)
  }

  async function killSession(t: string) {
    if (!confirm('¿Cerrar esta sesión?')) return
    const r = await fetch('/api/admin/sessions', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ token: t }),
    }).then(r => r.json())
    if (r.ok) { flash('ok', 'Sesión cerrada'); loadSessions() }
  }

  /** Toggle robusto con optimistic update */
  async function toggleRol(u: any, rol: string) {
    setBusyRow(u.id + ':' + rol)
    const currentExtras: string[] = Array.isArray(u.roles_extra) ? u.roles_extra : []
    const has = currentExtras.includes(rol)
    const newExtras = has
      ? currentExtras.filter((r: string) => r !== rol)
      : Array.from(new Set([...currentExtras, rol]))

    setUsers(us => us.map(x => x.id === u.id ? { ...x, roles_extra: newExtras } : x))

    try {
      const r = await fetch(`/api/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ roles_extra: newExtras }),
      }).then(r => r.json())
      if (!r.ok) throw new Error(r.error)
      flash('ok', `${has ? '✗ Removido' : '✓ Asignado'} ${rol} · ${u.email}`)
      if (r.user) setUsers(us => us.map(x => x.id === u.id ? r.user : x))
    } catch (e: any) {
      flash('err', e.message || 'Error al actualizar rol')
      load()
    } finally { setBusyRow(null) }
  }

  /** Cambiar rol base */
  async function changeRolBase(u: any, nuevoRol: string) {
    if (u.rol === nuevoRol) return
    // Confirmar downgrade desde ADMIN
    if (u.rol === 'ADMIN' && nuevoRol !== 'ADMIN') {
      if (!confirm(`¿Quitar permisos ADMIN a ${u.email}? Cambiará su rol base a ${nuevoRol}.`)) return
    }
    setBusyRow(u.id + ':rolbase')
    setUsers(us => us.map(x => x.id === u.id ? { ...x, rol: nuevoRol } : x))
    try {
      const r = await fetch(`/api/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rol: nuevoRol }),
      }).then(r => r.json())
      if (!r.ok) throw new Error(r.error)
      flash('ok', `Rol base de ${u.email}: ${nuevoRol}`)
      if (r.user) setUsers(us => us.map(x => x.id === u.id ? r.user : x))
    } catch (e: any) {
      flash('err', e.message || 'Error al cambiar rol base')
      load()
    } finally { setBusyRow(null) }
  }

  async function toggleEstado(u: any) {
    const nuevo = u.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO'
    if (nuevo === 'INACTIVO' && !confirm(`¿Desactivar acceso de ${u.email}? No podrá iniciar sesión.`)) return
    setBusyRow(u.id + ':estado')
    setUsers(us => us.map(x => x.id === u.id ? { ...x, estado: nuevo } : x))
    try {
      const r = await fetch(`/api/users/${u.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ estado: nuevo }) }).then(r => r.json())
      if (!r.ok) throw new Error(r.error)
      flash('ok', `Usuario ${nuevo.toLowerCase()}`)
    } catch (e: any) { flash('err', e.message); load() } finally { setBusyRow(null) }
  }

  async function saveUserProfile(updated: any) {
    setBusyRow(updated.id + ':edit')
    try {
      const r = await fetch(`/api/users/${updated.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nombre: updated.nombre, puesto: updated.puesto, departamento: updated.departamento, telefono: updated.telefono, foto_url: updated.foto_url,
        }),
      }).then(r => r.json())
      if (!r.ok) throw new Error(r.error)
      flash('ok', `Perfil de ${updated.email} actualizado`)
      setEditUser(null); load()
    } catch (e: any) { flash('err', e.message) } finally { setBusyRow(null) }
  }

  const filtered = users.filter(u => !q || u.email?.toLowerCase().includes(q.toLowerCase()) || u.nombre?.toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <Card title={`Usuarios y roles (${users.length})`}>
        <div style={{ fontSize: 12, color: 'var(--ul-text-subtle)', marginBottom: 10, lineHeight: 1.5 }}>
          <strong>Rol base:</strong> usa el desplegable para cambiarlo (incluye quitar/dar ADMIN).<br />
          <strong>Permisos extra:</strong> usa los checkboxes para agregar permisos adicionales sin cambiar el rol base.<br />
          Los cambios se guardan automáticamente. Click en "✎" para editar perfil, "🔑" para limpiar OTP.
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por email o nombre..." style={{ ...input, flex: '1 1 240px' }} />
          <button onClick={() => setNewUserOpen(true)} style={btnPrimary}>+ Nuevo usuario</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--ul-surface-2)' }}>
                <Th2>Usuario</Th2>
                <Th2>Rol base</Th2>
                {ROLES_DISPONIBLES.map(r => <Th2 key={r}><span style={{ fontSize: 10, fontWeight: 700 }}>{r}</span></Th2>)}
                <Th2>Último acceso</Th2>
                <Th2>Estado</Th2>
                <Th2>Acciones</Th2>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const extras: string[] = Array.isArray(u.roles_extra) ? u.roles_extra : []
                const inactivo = u.estado === 'INACTIVO'
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--ul-border)', opacity: inactivo ? .55 : 1 }}>
                    <Td2>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {u.foto_url
                          ? <img src={u.foto_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                          : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--ul-accent)', color: 'var(--ul-accent-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{(u.nombre || u.email).charAt(0).toUpperCase()}</div>
                        }
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--ul-text)' }}>{u.nombre || u.email.split('@')[0]}</div>
                          <div style={{ fontSize: 11, color: 'var(--ul-text-subtle)' }}>{u.email}</div>
                        </div>
                      </div>
                    </Td2>
                    <Td2>
                      <select
                        value={u.rol}
                        onChange={e => changeRolBase(u, e.target.value)}
                        disabled={busyRow === u.id + ':rolbase'}
                        style={{
                          ...input,
                          padding: '5px 8px', fontSize: 12, minWidth: 110,
                          background: u.rol === 'ADMIN' ? 'var(--ul-accent)' : 'var(--ul-surface-2)',
                          color: u.rol === 'ADMIN' ? 'var(--ul-accent-fg)' : 'var(--ul-text)',
                          fontWeight: u.rol === 'ADMIN' ? 700 : 500,
                          border: '1px solid ' + (u.rol === 'ADMIN' ? 'var(--ul-accent)' : 'var(--ul-border)'),
                        }}
                      >
                        {ROLES_BASE.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </Td2>
                    {ROLES_DISPONIBLES.map(r => {
                      const tieneRol = extras.includes(r)
                      const esRolBase = u.rol === r
                      const busy = busyRow === (u.id + ':' + r)
                      // Checkbox refleja si tiene el rol (por base O por extra)
                      const checked = tieneRol || esRolBase
                      return (
                        <Td2 key={r}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: esRolBase ? 'help' : 'pointer', opacity: busy ? .5 : 1 }}
                            title={esRolBase
                              ? `${r} es el rol BASE. Para quitarlo, cambia el rol base en la columna anterior.`
                              : (tieneRol ? `Click para quitar ${r}` : `Click para asignar ${r}`)}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => !esRolBase && !busy && toggleRol(u, r)}
                              disabled={esRolBase || busy}
                              style={{ accentColor: 'var(--ul-accent)', width: 16, height: 16, cursor: esRolBase ? 'help' : 'pointer' }}
                            />
                          </label>
                        </Td2>
                      )
                    })}
                    <Td2>
                      <div style={{ fontSize: 11, color: 'var(--ul-text-muted)' }}>
                        {u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : <span style={{ opacity: .5 }}>Nunca</span>}
                      </div>
                      {u.login_count != null && <div style={{ fontSize: 10, color: 'var(--ul-text-subtle)' }}>{u.login_count} ingreso{u.login_count === 1 ? '' : 's'}</div>}
                    </Td2>
                    <Td2>
                      <button onClick={() => toggleEstado(u)} disabled={busyRow === u.id + ':estado'} style={{
                        ...btnSm,
                        background: inactivo ? 'transparent' : 'rgba(52,211,153,.12)',
                        color: inactivo ? 'var(--ul-text-subtle)' : 'var(--ul-success)',
                        borderColor: inactivo ? 'var(--ul-border)' : 'var(--ul-success)',
                      }}>{inactivo ? 'INACTIVO · Activar' : 'ACTIVO · Desactivar'}</button>
                    </Td2>
                    <Td2>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button onClick={() => setEditUser(u)} style={btnSm} title="Editar perfil">✎</button>
                        <button onClick={() => setConfirmOtp(u.email)} style={{ ...btnSm, color: 'var(--ul-warning)', borderColor: 'var(--ul-warning)' }} title="Limpiar OTP (resetear intentos fallidos)">🔑</button>
                      </div>
                    </Td2>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Sesiones activas */}
      {sessions.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Card title={`Sesiones activas (${sessions.length})`}>
            <div style={{ fontSize: 12, color: 'var(--ul-text-subtle)', marginBottom: 10 }}>
              Cierra sesiones para forzar nuevo login del usuario.
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--ul-surface-2)' }}>
                    <Th2>Email</Th2><Th2>Rol</Th2><Th2>Última actividad</Th2><Th2>Expira</Th2><Th2></Th2>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s: any) => (
                    <tr key={s.token} style={{ borderBottom: '1px solid var(--ul-border)' }}>
                      <Td2>{s.email}</Td2>
                      <Td2><span style={{ ...miniBadge, background: s.rol === 'ADMIN' ? 'var(--ul-accent)' : 'var(--ul-surface-2)', color: s.rol === 'ADMIN' ? 'var(--ul-accent-fg)' : 'var(--ul-text)' }}>{s.rol}</span></Td2>
                      <Td2><span style={{ fontSize: 11, color: 'var(--ul-text-muted)' }}>{s.last_active ? new Date(s.last_active).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</span></Td2>
                      <Td2><span style={{ fontSize: 11, color: 'var(--ul-text-muted)' }}>{new Date(s.expires_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</span></Td2>
                      <Td2><button onClick={() => killSession(s.token)} style={{ ...btnSm, color: 'var(--ul-danger)', borderColor: 'var(--ul-danger)' }}>Cerrar</button></Td2>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {editUser && <EditUserModal user={editUser} token={token} onSave={saveUserProfile} onClose={() => setEditUser(null)} />}
      {newUserOpen && <NewUserModal onCreate={createUser} onClose={() => setNewUserOpen(false)} />}
      {confirmOtp && (
        <div onClick={() => setConfirmOtp(null)} style={{ position: 'fixed', inset: 0, background: 'var(--ul-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, background: 'var(--ul-bg-elev)', border: '1px solid var(--ul-border)', borderRadius: 14, padding: 22 }}>
            <h3 className="ul-display" style={{ fontSize: 16, color: 'var(--ul-text)', marginBottom: 10 }}>Limpiar OTP</h3>
            <p style={{ fontSize: 13, color: 'var(--ul-text-muted)', marginBottom: 18, lineHeight: 1.5 }}>
              Esto borrará los códigos OTP pendientes y reseteará los intentos fallidos de <strong style={{ color: 'var(--ul-text)' }}>{confirmOtp}</strong>.
              <br /><br />Útil si el usuario quedó bloqueado por demasiados intentos.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmOtp(null)} style={btnGhost}>Cancelar</button>
              <button onClick={() => clearOtp(confirmOtp)} style={btnPrimary}>Limpiar OTP</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function NewUserModal({ onCreate, onClose }: { onCreate: (p: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({ email: '', nombre: '', rol: 'USUARIO', puesto: '', departamento: '', telefono: '' })
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'var(--ul-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: 'var(--ul-bg-elev)', border: '1px solid var(--ul-border)', borderRadius: 14, padding: 22, maxHeight: '92vh', overflowY: 'auto' }}>
        <h3 className="ul-display" style={{ fontSize: 16, color: 'var(--ul-text)', marginBottom: 4 }}>Nuevo usuario</h3>
        <div style={{ fontSize: 12, color: 'var(--ul-text-subtle)', marginBottom: 18 }}>
          El usuario podrá ingresar con su email solicitando un código OTP.
        </div>
        <Field label="Email *"><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={input} placeholder="email@ultralam.com.mx" /></Field>
        <Field label="Nombre"><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} style={input} /></Field>
        <Field label="Rol base">
          <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })} style={input}>
            {ROLES_BASE.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Row>
          <Field label="Puesto"><input value={form.puesto} onChange={e => setForm({ ...form, puesto: e.target.value })} style={input} /></Field>
          <Field label="Departamento"><input value={form.departamento} onChange={e => setForm({ ...form, departamento: e.target.value })} style={input} /></Field>
        </Row>
        <Field label="Teléfono"><input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} style={input} /></Field>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose} style={btnGhost}>Cancelar</button>
          <button
            onClick={() => {
              if (!form.email.trim()) return alert('Email requerido')
              onCreate({ ...form, email: form.email.trim().toLowerCase() })
            }}
            style={btnPrimary}
          >Crear usuario</button>
        </div>
      </div>
    </div>
  )
}

function EditUserModal({ user, token, onSave, onClose }: any) {
  const [form, setForm] = useState({
    id: user.id, email: user.email,
    nombre: user.nombre || '', puesto: user.puesto || '', departamento: user.departamento || '',
    telefono: user.telefono || '', foto_url: user.foto_url || '',
  })
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function uploadFoto(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const r = await fetch('/api/upload?prefix=perfiles', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd }).then(r => r.json())
    if (r.ok) setForm(f => ({ ...f, foto_url: r.url }))
    setUploading(false)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'var(--ul-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: 'var(--ul-bg-elev)', border: '1px solid var(--ul-border)', borderRadius: 14, padding: 22, maxHeight: '92vh', overflowY: 'auto' }}>
        <h3 className="ul-display" style={{ fontSize: 16, color: 'var(--ul-text)', marginBottom: 4 }}>Editar perfil</h3>
        <div style={{ fontSize: 12, color: 'var(--ul-text-subtle)', marginBottom: 18 }}>{user.email}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          {form.foto_url
            ? <img src={form.foto_url} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--ul-accent)' }} />
            : <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--ul-accent)', color: 'var(--ul-accent-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 24 }}>{(form.nombre || user.email).charAt(0).toUpperCase()}</div>
          }
          <input ref={fileRef} type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadFoto(e.target.files[0])} style={{ display: 'none' }} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} style={btnGhost}>{uploading ? 'Subiendo...' : (form.foto_url ? 'Cambiar' : 'Subir foto')}</button>
          {form.foto_url && <button onClick={() => setForm(f => ({ ...f, foto_url: '' }))} style={{ ...btnSm, color: 'var(--ul-danger)' }}>Quitar</button>}
        </div>
        <Field label="Nombre"><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} style={input} /></Field>
        <Field label="Puesto"><input value={form.puesto} onChange={e => setForm({ ...form, puesto: e.target.value })} style={input} /></Field>
        <Field label="Departamento"><input value={form.departamento} onChange={e => setForm({ ...form, departamento: e.target.value })} style={input} /></Field>
        <Field label="Teléfono"><input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} style={input} /></Field>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose} style={btnGhost}>Cancelar</button>
          <button onClick={() => onSave(form)} style={btnPrimary}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   TAB CONFIG GENERAL — saludo, mensaje bienvenida, títulos módulos
   ============================================================ */
function ConfigTab({ token, flash }: any) {
  const [s, setS] = useState<any>({
    PORTAL_SALUDO: '', PORTAL_MENSAJE_BIENVENIDA: '',
    PORTAL_TITULO_HELPDESK: '', PORTAL_SUBTITULO_HELPDESK: '', PORTAL_ICONO_HELPDESK: '',
    PORTAL_TITULO_COMPRAS: '', PORTAL_SUBTITULO_COMPRAS: '', PORTAL_ICONO_COMPRAS: '',
    PORTAL_TITULO_SIMULADOR: '', PORTAL_SUBTITULO_SIMULADOR: '', PORTAL_ICONO_SIMULADOR: '',
  })

  async function load() {
    const r = await fetch('/api/branding').then(r => r.json())
    if (r.ok) {
      setS({
        PORTAL_SALUDO: r.saludo || 'equipo Ultralam',
        PORTAL_MENSAJE_BIENVENIDA: r.mensajeBienvenida || '',
        PORTAL_TITULO_HELPDESK: r.tituloHelpdesk, PORTAL_SUBTITULO_HELPDESK: r.subtituloHelpdesk, PORTAL_ICONO_HELPDESK: r.iconoHelpdesk,
        PORTAL_TITULO_COMPRAS: r.tituloCompras, PORTAL_SUBTITULO_COMPRAS: r.subtituloCompras, PORTAL_ICONO_COMPRAS: r.iconoCompras,
        PORTAL_TITULO_SIMULADOR: r.tituloSimulador, PORTAL_SUBTITULO_SIMULADOR: r.subtituloSimulador, PORTAL_ICONO_SIMULADOR: r.iconoSimulador,
      })
    }
  }
  useEffect(() => { load() }, [])

  async function save() {
    const pairs = Object.entries(s).map(([key, value]) => ({ key, value: String(value || '') }))
    const r = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ settings: pairs }) }).then(r => r.json())
    if (r.ok) flash('ok', 'Configuración guardada'); else flash('err', r.error)
  }

  return (
    <div style={twoCols}>
      <Card title="Saludo del portal">
        <Field label="Después de 'Buenos días/tardes/noches,'"><input value={s.PORTAL_SALUDO} onChange={e => setS({ ...s, PORTAL_SALUDO: e.target.value })} style={input} placeholder="equipo Ultralam" /></Field>
        <Field label="Mensaje de bienvenida (opcional, debajo del saludo)"><textarea value={s.PORTAL_MENSAJE_BIENVENIDA} onChange={e => setS({ ...s, PORTAL_MENSAJE_BIENVENIDA: e.target.value })} style={{ ...input, minHeight: 60 }} placeholder="Deja vacío para mostrar contador automático" /></Field>
      </Card>

      <Card title="Módulo Helpdesk">
        <Row>
          <Field label="Icono"><input value={s.PORTAL_ICONO_HELPDESK} onChange={e => setS({ ...s, PORTAL_ICONO_HELPDESK: e.target.value })} style={input} /></Field>
          <Field label="Título"><input value={s.PORTAL_TITULO_HELPDESK} onChange={e => setS({ ...s, PORTAL_TITULO_HELPDESK: e.target.value })} style={input} /></Field>
        </Row>
        <Field label="Subtítulo"><input value={s.PORTAL_SUBTITULO_HELPDESK} onChange={e => setS({ ...s, PORTAL_SUBTITULO_HELPDESK: e.target.value })} style={input} /></Field>
      </Card>

      <Card title="Módulo Compras">
        <Row>
          <Field label="Icono"><input value={s.PORTAL_ICONO_COMPRAS} onChange={e => setS({ ...s, PORTAL_ICONO_COMPRAS: e.target.value })} style={input} /></Field>
          <Field label="Título"><input value={s.PORTAL_TITULO_COMPRAS} onChange={e => setS({ ...s, PORTAL_TITULO_COMPRAS: e.target.value })} style={input} /></Field>
        </Row>
        <Field label="Subtítulo"><input value={s.PORTAL_SUBTITULO_COMPRAS} onChange={e => setS({ ...s, PORTAL_SUBTITULO_COMPRAS: e.target.value })} style={input} /></Field>
      </Card>

      <Card title="Módulo Simulador 3D">
        <Row>
          <Field label="Icono"><input value={s.PORTAL_ICONO_SIMULADOR} onChange={e => setS({ ...s, PORTAL_ICONO_SIMULADOR: e.target.value })} style={input} /></Field>
          <Field label="Título"><input value={s.PORTAL_TITULO_SIMULADOR} onChange={e => setS({ ...s, PORTAL_TITULO_SIMULADOR: e.target.value })} style={input} /></Field>
        </Row>
        <Field label="Subtítulo"><input value={s.PORTAL_SUBTITULO_SIMULADOR} onChange={e => setS({ ...s, PORTAL_SUBTITULO_SIMULADOR: e.target.value })} style={input} /></Field>
      </Card>

      <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={save} style={btnPrimary}>Guardar configuración</button>
      </div>
    </div>
  )
}

/* ============================================================
   TAB UI / BRANDING — nombre, color, logo
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
    const r = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ settings: [{ key: 'APP_NAME', value: name }, { key: 'APP_PRIMARY_COLOR', value: color }] }) }).then(r => r.json())
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
        <Field label="Nombre de la aplicación"><input value={name} onChange={e => setName(e.target.value)} style={input} placeholder="Portal Ultralam" /></Field>
        <Field label="Color institucional (HEX)">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 50, height: 38, borderRadius: 8, border: '1px solid var(--ul-border)', padding: 4 }} />
            <input value={color} onChange={e => setColor(e.target.value)} style={{ ...input, flex: 1 }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--ul-text-subtle)', marginTop: 4 }}>
            El acento del sistema (negro/amarillo) está fijo. Este campo se conserva para módulos legacy.
          </div>
        </Field>
        <button onClick={save} style={btnPrimary}>Guardar</button>
      </Card>

      <Card title="Logo">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          {logo
            ? <img src={logo} alt="Logo" style={{ width: 120, height: 120, objectFit: 'contain', borderRadius: 12, background: 'var(--ul-surface-2)', padding: 12 }} />
            : <div style={{ width: 120, height: 120, borderRadius: 12, background: 'var(--ul-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--ul-text-subtle)' }}>Sin logo</div>
          }
          <label style={{ ...btnPrimary, display: 'inline-block', cursor: 'pointer' }}>
            {uploading ? 'Subiendo...' : 'Subir logo'}
            <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} style={{ display: 'none' }} />
          </label>
          {logo && <button onClick={removeLogo} style={btnGhost}>Eliminar logo</button>}
          <div style={{ fontSize: 11, color: 'var(--ul-text-subtle)', textAlign: 'center', maxWidth: 280 }}>PNG cuadrado con fondo transparente, máximo 2 MB.</div>
        </div>
      </Card>
    </div>
  )
}

/* ────────── Primitivas UI compartidas ────────── */
function Card({ title, children }: any) {
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
function Empty({ children }: any) { return <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--ul-text-subtle)' }}>{children || 'Sin registros'}</div> }
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
