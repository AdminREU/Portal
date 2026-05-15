import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
})

const APP  = process.env.NEXT_PUBLIC_APP_NAME ?? 'Portal Ultralam'
const URL  = process.env.NEXT_PUBLIC_APP_URL ?? ''
const FROM = `${APP} <${process.env.GMAIL_USER}>`

export async function sendOtpEmail(email: string, code: string) {
  await transporter.sendMail({
    from: FROM, to: email,
    subject: `Tu código de acceso — ${APP}`,
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#191919;margin-bottom:4px">${APP}</h2>
      <p style="color:#555;margin-bottom:20px">Tu código de acceso de un solo uso:</p>
      <div style="font-size:40px;font-weight:bold;letter-spacing:8px;color:#191919;background:#f7f6f3;padding:20px;border-radius:8px;text-align:center;margin:0 0 20px">${code}</div>
      <p style="color:#555;font-size:13px">Válido por <strong>30 minutos</strong>. No compartas este código con nadie.</p>
    </div>`
  })
}

export async function sendNewTicketEmail(opts: { to: string; ticketId: string; asunto: string; descripcion: string; area: string; usuario: string; isHelpdesk: boolean }) {
  const subject = opts.isHelpdesk ? `🎫 Nuevo ticket ${opts.ticketId} — ${opts.asunto}` : `✅ Tu ticket ${opts.ticketId} fue recibido`
  const body = opts.isHelpdesk
    ? `<p>Se abrió un nuevo ticket que requiere atención:</p>
       <table style="width:100%;border-collapse:collapse;margin:16px 0">
         <tr><td style="padding:8px;border:1px solid #e5e4e0;font-weight:600;width:120px">ID</td><td style="padding:8px;border:1px solid #e5e4e0">${opts.ticketId}</td></tr>
         <tr><td style="padding:8px;border:1px solid #e5e4e0;font-weight:600">Asunto</td><td style="padding:8px;border:1px solid #e5e4e0">${opts.asunto}</td></tr>
         <tr><td style="padding:8px;border:1px solid #e5e4e0;font-weight:600">Área</td><td style="padding:8px;border:1px solid #e5e4e0">${opts.area||'—'}</td></tr>
         <tr><td style="padding:8px;border:1px solid #e5e4e0;font-weight:600">Usuario</td><td style="padding:8px;border:1px solid #e5e4e0">${opts.usuario}</td></tr>
         <tr><td style="padding:8px;border:1px solid #e5e4e0;font-weight:600">Descripción</td><td style="padding:8px;border:1px solid #e5e4e0">${opts.descripcion||'—'}</td></tr>
       </table>
       <a href="${URL}/helpdesk" style="display:inline-block;padding:12px 24px;background:#191919;color:#fff;border-radius:8px;text-decoration:none;font-size:13px">Ver en el panel →</a>`
    : `<p>Hemos recibido tu solicitud de soporte. En breve un agente la atenderá.</p>
       <table style="width:100%;border-collapse:collapse;margin:16px 0">
         <tr><td style="padding:8px;border:1px solid #e5e4e0;font-weight:600;width:120px">ID</td><td style="padding:8px;border:1px solid #e5e4e0">${opts.ticketId}</td></tr>
         <tr><td style="padding:8px;border:1px solid #e5e4e0;font-weight:600">Asunto</td><td style="padding:8px;border:1px solid #e5e4e0">${opts.asunto}</td></tr>
         <tr><td style="padding:8px;border:1px solid #e5e4e0;font-weight:600">Descripción</td><td style="padding:8px;border:1px solid #e5e4e0">${opts.descripcion||'—'}</td></tr>
       </table>
       <a href="${URL}/portal" style="display:inline-block;padding:12px 24px;background:#191919;color:#fff;border-radius:8px;text-decoration:none;font-size:13px">Ver mi portal →</a>`

  await transporter.sendMail({
    from: FROM, to: opts.to, subject,
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px">
      <h2 style="color:#191919;margin-bottom:16px">${APP}</h2>${body}
    </div>`
  })
}

export async function sendTicketReplyEmail(to: string, ticket: { id: string; asunto: string; respuesta: string }) {
  await transporter.sendMail({
    from: FROM, to,
    subject: `💬 Respuesta a tu ticket ${ticket.id}`,
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px">
      <h2 style="color:#191919;margin-bottom:4px">${APP}</h2>
      <p style="color:#555;margin-bottom:16px">El equipo de soporte respondió tu ticket <strong>${ticket.id} — ${ticket.asunto}</strong>:</p>
      <div style="background:#f7f6f3;border-left:3px solid #191919;padding:16px;border-radius:0 8px 8px 0;margin-bottom:20px;font-size:14px;line-height:1.6">${ticket.respuesta}</div>
      <a href="${URL}/portal" style="display:inline-block;padding:12px 24px;background:#191919;color:#fff;border-radius:8px;text-decoration:none;font-size:13px">Ver en mi portal →</a>
    </div>`
  })
}

// ════════════════════════════════════════════════════════════
// EMAILS COMPRAS
// ════════════════════════════════════════════════════════════
export async function sendOCEmail(opts: {
  to: string | string[]
  cc?: string[]
  subject: string
  oc: { id: string; total: number; moneda?: string; solicitante: string; tipo: string; empresa: string; estatus: string }
  body?: string
  pdfBytes?: Uint8Array
  pdfFilename?: string
}) {
  const moneda = opts.oc.moneda || 'MXN'
  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px">
    <h2 style="color:#191919;margin-bottom:4px">${APP}</h2>
    <p style="color:#555;margin-bottom:16px">${opts.body || `Detalle de la Orden de Compra <strong>${opts.oc.id}</strong>:`}</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px">
      <tr><td style="padding:8px;border:1px solid #e5e4e0;font-weight:600;width:140px">Folio</td><td style="padding:8px;border:1px solid #e5e4e0">${opts.oc.id}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e5e4e0;font-weight:600">Empresa</td><td style="padding:8px;border:1px solid #e5e4e0">${opts.oc.empresa}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e5e4e0;font-weight:600">Solicitante</td><td style="padding:8px;border:1px solid #e5e4e0">${opts.oc.solicitante}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e5e4e0;font-weight:600">Tipo</td><td style="padding:8px;border:1px solid #e5e4e0">${opts.oc.tipo}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e5e4e0;font-weight:600">Estatus</td><td style="padding:8px;border:1px solid #e5e4e0">${opts.oc.estatus}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e5e4e0;font-weight:600">Total</td><td style="padding:8px;border:1px solid #e5e4e0;color:#b8860b;font-weight:600">${new Intl.NumberFormat('es-MX',{style:'currency',currency:moneda}).format(opts.oc.total)}</td></tr>
    </table>
    <a href="${URL}/compras" style="display:inline-block;padding:12px 24px;background:#F5C400;color:#191919;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">Ver en Portal Compras →</a>
    <p style="color:#999;font-size:11px;margin-top:24px">${APP}</p>
  </div>`

  const attachments = opts.pdfBytes ? [{
    filename: opts.pdfFilename || `${opts.oc.id}.pdf`,
    content: Buffer.from(opts.pdfBytes),
    contentType: 'application/pdf',
  }] : undefined

  await transporter.sendMail({
    from: FROM,
    to: Array.isArray(opts.to) ? opts.to.join(',') : opts.to,
    cc: opts.cc?.length ? opts.cc.join(',') : undefined,
    subject: opts.subject,
    html,
    attachments,
  })
}
