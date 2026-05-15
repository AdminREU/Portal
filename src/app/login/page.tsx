'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'email' | 'code' | 'loading'

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    document.title = 'Portal Ultralam'
    const stored = localStorage.getItem('auth_token') ?? document.cookie.match(/auth_token=([^;]+)/)?.[1]
    if (stored) {
      fetch('/api/auth/resume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: stored }) })
        .then(r => r.json()).then(d => { if (d.ok) router.replace('/portal') })
        .catch(() => {})
    }
  }, [router])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true); setError('')
    try {
      const r = await fetch('/api/auth/send-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      })
      const d = await r.json()
      if (!d.ok) throw new Error(d.error)
      setStep('code'); setCountdown(60)
    } catch (err: any) {
      setError(err.message ?? 'Error al enviar el código')
    } finally { setSending(false) }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    if (code.length < 6) return
    setSending(true); setError('')
    try {
      const r = await fetch('/api/auth/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.trim() })
      })
      const d = await r.json()
      if (!d.ok) throw new Error(d.error)
      localStorage.setItem('auth_token', d.token)
      document.cookie = `auth_token=${d.token}; path=/; max-age=${8 * 3600}`
      setStep('loading')
      router.replace('/portal')
    } catch (err: any) {
      setError(err.message ?? 'Código incorrecto')
    } finally { setSending(false) }
  }

  return (
    <div style={S.page}>
      {/* Fondo decorativo radial */}
      <div style={S.glow} aria-hidden />
      <div style={S.grid} aria-hidden />

      <div style={S.card}>
        <div style={S.brand}>
          <div style={S.markBox}>
            <span className="ul-display" style={S.markU}>U</span>
          </div>
          <div className="ul-display" style={S.brandName}>ULTRALAM</div>
          <div style={S.brandSub}>Portal corporativo · Helpdesk + Compras</div>
        </div>

        <div style={S.formBlock}>
          <div style={S.hint}>
            {step === 'email' && 'Ingresa tu correo institucional para recibir un código de acceso de un solo uso.'}
            {step === 'code' && `Enviamos un código a `}
            {step === 'code' && <strong style={{ color: 'var(--ul-text)' }}>{email}</strong>}
            {step === 'loading' && 'Iniciando sesión...'}
          </div>

          {step === 'email' && (
            <form onSubmit={sendOtp}>
              <label style={S.label}>Correo electrónico</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@ultralam.com.mx" required autoFocus style={S.input} />
              {error && <div style={S.error}>{error}</div>}
              <button type="submit" disabled={sending} style={{ ...S.btn, opacity: sending ? .6 : 1 }}>
                {sending ? 'Enviando...' : 'Enviar código →'}
              </button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={verifyCode}>
              <label style={S.label}>Código de 6 dígitos</label>
              <input type="text" value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" maxLength={6} required autoFocus inputMode="numeric"
                style={{ ...S.input, letterSpacing: '10px', textAlign: 'center', fontSize: 22, fontWeight: 700 }} />
              {error && <div style={S.error}>{error}</div>}
              <button type="submit" disabled={sending || code.length < 6}
                style={{ ...S.btn, opacity: (sending || code.length < 6) ? .55 : 1, cursor: (sending || code.length < 6) ? 'not-allowed' : 'pointer' }}>
                {sending ? 'Verificando...' : 'Ingresar'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                {countdown > 0
                  ? <span style={S.foot}>Podrás reenviar en <strong style={{ color: 'var(--ul-accent)' }}>{countdown}s</strong></span>
                  : <button type="button" onClick={() => { setStep('email'); setCode(''); setError('') }} style={S.linkBtn}>
                      Cambiar correo o reenviar
                    </button>}
              </div>
            </form>
          )}

          {step === 'loading' && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={S.spinner} />
            </div>
          )}
        </div>

        <div style={S.foot}>
          © {new Date().getFullYear()} Ultralam · Acceso restringido al personal autorizado
        </div>
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--ul-bg)', padding: 24, position: 'relative', overflow: 'hidden',
  },
  glow: {
    position: 'absolute', top: '-25%', left: '50%', transform: 'translateX(-50%)',
    width: 700, height: 700, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,212,0,.18), transparent 60%)',
    pointerEvents: 'none', filter: 'blur(40px)',
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage:
      'linear-gradient(var(--ul-border) 1px, transparent 1px), linear-gradient(90deg, var(--ul-border) 1px, transparent 1px)',
    backgroundSize: '64px 64px', opacity: .35, maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative', zIndex: 1, width: '100%', maxWidth: 420,
    background: 'var(--ul-bg-elev)', border: '1px solid var(--ul-border)',
    borderRadius: 18, padding: '36px 32px 28px',
    boxShadow: 'var(--ul-shadow-lg)',
  },
  brand: { textAlign: 'center', marginBottom: 28 },
  markBox: {
    width: 60, height: 60, borderRadius: 14, background: 'var(--ul-accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 14px',
  },
  markU: { color: 'var(--ul-accent-fg)', fontSize: 30, lineHeight: 1 },
  brandName: {
    fontSize: 22, color: 'var(--ul-text)', letterSpacing: '2px',
  },
  brandSub: { fontSize: 11, color: 'var(--ul-text-subtle)', marginTop: 6, letterSpacing: '.5px' },

  formBlock: { marginBottom: 20 },
  hint: { fontSize: 13, color: 'var(--ul-text-muted)', textAlign: 'center', marginBottom: 22, lineHeight: 1.5 },

  label: {
    display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--ul-text-muted)',
    textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 7,
  },
  input: {
    width: '100%', padding: '12px 14px', fontSize: 14, borderRadius: 10,
    border: '1px solid var(--ul-border)', background: 'var(--ul-surface)',
    color: 'var(--ul-text)', outline: 'none',
  },
  btn: {
    width: '100%', padding: '13px 16px', fontSize: 14, fontWeight: 700,
    borderRadius: 10, border: 'none', cursor: 'pointer', marginTop: 16,
    background: 'var(--ul-accent)', color: 'var(--ul-accent-fg)',
    transition: 'transform .1s, background .15s',
  },
  error: {
    fontSize: 12, color: 'var(--ul-danger)', marginTop: 10,
    background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.25)',
    padding: '8px 12px', borderRadius: 8,
  },
  linkBtn: {
    background: 'none', border: 'none', cursor: 'pointer', fontSize: 13,
    color: 'var(--ul-accent)', fontWeight: 600, padding: 0,
  },
  spinner: {
    width: 34, height: 34, border: '3px solid var(--ul-border)',
    borderTopColor: 'var(--ul-accent)', borderRadius: '50%',
    animation: 'ul-spin .8s linear infinite', margin: '0 auto',
  },
  foot: {
    fontSize: 11, color: 'var(--ul-text-subtle)', textAlign: 'center',
    paddingTop: 16, borderTop: '1px solid var(--ul-border)',
  },
}
