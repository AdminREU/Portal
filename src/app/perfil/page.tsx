'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'

type User = { id?: string; email: string; nombre?: string; rol: string; roles_extra?: string[]; puesto?: string; departamento?: string; telefono?: string; foto_url?: string }

export default function PerfilPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ k: 'ok' | 'err'; t: string } | null>(null)
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [perfilAvanzado, setPerfilAvanzado] = useState(true)

  const [form, setForm] = useState({ nombre: '', puesto: '', departamento: '', telefono: '', foto_url: '' })
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem('auth_token') ?? ''
    if (!t) { router.replace('/login'); return }
    setToken(t)

    Promise.all([
      fetch('/api/users/me', { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
      fetch('/api/avisos/feature-flags', { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()).catch(() => ({ ok: false })),
    ]).then(([me, ff]) => {
      if (!me.ok) { router.replace('/login'); return }
      const u = { ...me.user, roles_extra: me.roles_extra || [] }
      setUser(u)
      setForm({
        nombre: u.nombre || '',
        puesto: u.puesto || '',
        departamento: u.departamento || '',
        telefono: u.telefono || '',
        foto_url: u.foto_url || '',
      })
      if (ff.ok) {
        setFlags(ff.values || {})
        // Si flag está apagado, sólo admin puede editar
        const esAdmin = u.rol === 'ADMIN' || (u.roles_extra || []).includes('ADMIN')
        setPerfilAvanzado(esAdmin || ff.values?.USUARIO_PERFIL_AVANZADO !== false)
      }
    }).catch(() => router.replace('/login'))
      .finally(() => setLoading(false))
  }, [router])

  function flash(k: 'ok' | 'err', t: string) {
    setMsg({ k, t })
    setTimeout(() => setMsg(null), 3500)
  }

  async function save() {
    if (!perfilAvanzado) return flash('err', 'Edición de perfil deshabilitada por administrador')
    setSaving(true)
    try {
      const r = await fetch('/api/users/me', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      }).then(r => r.json())
      if (!r.ok) throw new Error(r.error || 'Error desconocido')
      flash('ok', 'Perfil guardado correctamente')
      // Usar la respuesta del servidor si la trae; sino aplicar el form localmente
      if (r.user) setUser(u => u ? { ...u, ...r.user } : r.user)
      else setUser(u => u ? { ...u, ...form } : u)
    } catch (e: any) {
      flash('err', `No se pudo guardar: ${e.message}`)
    } finally { setSaving(false) }
  }

  async function uploadFoto(file: File) {
    if (flags.USUARIO_FOTO_PERFIL === false && !(user?.rol === 'ADMIN' || (user?.roles_extra || []).includes('ADMIN'))) {
      return flash('err', 'Subida de foto deshabilitada por administrador')
    }
    setUploadingFoto(true)
    const fd = new FormData()
    fd.append('file', file)
    const r = await fetch('/api/upload?prefix=perfiles', {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
    }).then(r => r.json())
    if (r.ok) { setForm(f => ({ ...f, foto_url: r.url })); flash('ok', 'Foto subida — guarda para aplicar') }
    else flash('err', r.error)
    setUploadingFoto(false)
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ul-bg)' }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--ul-border)', borderTopColor: 'var(--ul-accent)', borderRadius: '50%', animation: 'ul-spin .8s linear infinite' }} />
    </div>
  }
  if (!user) return null

  const initial = (form.nombre || user.email).charAt(0).toUpperCase()
  const disabledEdit = !perfilAvanzado

  const nav = [
    {
      title: 'NAVEGACIÓN',
      items: [
        { key: 'portal', label: '← Volver al portal', icon: '◆', href: '/portal' },
        { key: 'helpdesk', label: 'Helpdesk', icon: '🎫', href: '/helpdesk' },
        { key: 'compras', label: 'Compras', icon: '🛒', href: '/compras' },
      ],
    },
    {
      title: 'CUENTA',
      items: [{ key: 'perfil', label: 'Mi perfil', icon: '👤' }],
    },
  ]

  return (
    <AppShell app="portal" appLabel="MI PERFIL" appVersion="Cuenta" nav={nav} activeKey="perfil" user={user} token={token} showSearch={false}>
      <div style={{ marginBottom: 22 }}>
        <h1 className="ul-display" style={{ fontSize: 28, color: 'var(--ul-text)', letterSpacing: '-0.3px' }}>Mi perfil</h1>
        <div style={{ fontSize: 13, color: 'var(--ul-text-subtle)', marginTop: 6 }}>
          {disabledEdit
            ? 'Solo lectura — la edición de perfil está deshabilitada por administrador.'
            : 'Actualiza tu información personal. Estos datos se muestran en tickets, órdenes y notificaciones.'}
        </div>
      </div>

      {msg && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 14,
          background: msg.k === 'ok' ? 'rgba(52,211,153,.12)' : 'rgba(248,113,113,.12)',
          border: `1px solid ${msg.k === 'ok' ? 'var(--ul-success)' : 'var(--ul-danger)'}`,
          color: msg.k === 'ok' ? 'var(--ul-success)' : 'var(--ul-danger)',
          fontSize: 13, fontWeight: 600,
        }}>{msg.t}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* Card Foto */}
        <div style={card}>
          <div className="ul-display" style={cardTitle}>FOTO DE PERFIL</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            {form.foto_url
              ? <img src={form.foto_url} alt="" style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--ul-accent)' }} />
              : <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'var(--ul-accent)', color: 'var(--ul-accent-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 44 }}>{initial}</div>
            }
            <input ref={fileRef} type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadFoto(e.target.files[0])} style={{ display: 'none' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => fileRef.current?.click()} disabled={disabledEdit || uploadingFoto} style={btnGhost}>
                {uploadingFoto ? 'Subiendo...' : (form.foto_url ? 'Cambiar foto' : 'Subir foto')}
              </button>
              {form.foto_url && <button onClick={() => setForm(f => ({ ...f, foto_url: '' }))} disabled={disabledEdit} style={{ ...btnGhost, color: 'var(--ul-danger)' }}>Quitar</button>}
            </div>
          </div>
        </div>

        {/* Card Identidad */}
        <div style={card}>
          <div className="ul-display" style={cardTitle}>IDENTIDAD</div>
          <Field label="Email (no editable)"><input value={user.email} disabled style={{ ...input, opacity: .6 }} /></Field>
          <Field label="Rol"><input value={user.roles_extra?.length ? `${user.rol} + ${user.roles_extra.join(', ')}` : user.rol} disabled style={{ ...input, opacity: .6 }} /></Field>
          <Field label="Nombre completo"><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} disabled={disabledEdit} style={input} placeholder="Tu nombre" /></Field>
        </div>

        {/* Card Trabajo */}
        <div style={card}>
          <div className="ul-display" style={cardTitle}>TRABAJO</div>
          <Field label="Puesto"><input value={form.puesto} onChange={e => setForm({ ...form, puesto: e.target.value })} disabled={disabledEdit} style={input} placeholder="Gerente, Jefe de área..." /></Field>
          <Field label="Departamento"><input value={form.departamento} onChange={e => setForm({ ...form, departamento: e.target.value })} disabled={disabledEdit} style={input} placeholder="Ventas, Producción..." /></Field>
          <Field label="Teléfono"><input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} disabled={disabledEdit} style={input} placeholder="55 0000 0000" /></Field>
        </div>
      </div>

      {!disabledEdit && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button onClick={() => router.push('/portal')} style={btnGhost}>Cancelar</button>
          <button onClick={save} disabled={saving} style={btnPrimary}>{saving ? 'Guardando...' : 'Guardar perfil'}</button>
        </div>
      )}
    </AppShell>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--ul-text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}
const card: React.CSSProperties = { background: 'var(--ul-surface)', border: '1px solid var(--ul-border)', borderRadius: 12, padding: 18 }
const cardTitle: React.CSSProperties = { fontSize: 12, color: 'var(--ul-text)', letterSpacing: '1px', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--ul-border)' }
const input: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--ul-border)', background: 'var(--ul-surface-2)', color: 'var(--ul-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
const btnPrimary: React.CSSProperties = { background: 'var(--ul-accent)', color: 'var(--ul-accent-fg)', border: 'none', padding: '10px 22px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { background: 'transparent', color: 'var(--ul-text)', border: '1px solid var(--ul-border)', padding: '10px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }
