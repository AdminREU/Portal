import type { Config } from '@netlify/functions'

export default async (_req: Request) => {
  const base = process.env.URL ?? process.env.DEPLOY_URL
  if (!base) return new Response('Falta URL/DEPLOY_URL', { status: 500 })
  const secret = process.env.INTERNAL_CRON_SECRET
  if (!secret) return new Response('Falta INTERNAL_CRON_SECRET', { status: 500 })

  try {
    const res = await fetch(`${base}/api/admin/purge-attachments`, {
      method: 'POST',
      headers: { 'x-cron-secret': secret },
    })
    const data = await res.json()
    console.log('[purge-cron]', data)
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    console.error('[purge-cron] error', e)
    return new Response(`Error: ${e.message}`, { status: 500 })
  }
}

export const config: Config = {
  schedule: '0 8 * * *', // 03:00 hora CDMX (UTC-5) = 08:00 UTC
}
