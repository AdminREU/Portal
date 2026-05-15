import { NextResponse } from 'next/server'
import { validateToken, getToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { email } = await validateToken(getToken(req))
    const formData = await req.formData()
    const file = formData.get('file') as File
    const ticketId = formData.get('ticketId') as string
    if (!file || !ticketId) return NextResponse.json({ ok: false, error: 'Faltan datos' }, { status: 400 })
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ ok: false, error: 'Archivo mayor a 10MB' }, { status: 400 })
    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `${ticketId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const bytes = await file.arrayBuffer()
    const { error } = await supabase.storage.from('evidencias').upload(path, bytes, { contentType: file.type, upsert: false })
    if (error) throw new Error(error.message)
    const { data: urlData } = supabase.storage.from('evidencias').getPublicUrl(path)
    const { data: ticket } = await supabase.from('tickets').select('evidencias_json').eq('id', ticketId).single()
    const evidencias = Array.isArray(ticket?.evidencias_json) ? ticket.evidencias_json : []
    evidencias.push({ name: file.name, path, url: urlData.publicUrl, uploadedBy: email, uploadedAt: new Date().toISOString() })
    await supabase.from('tickets').update({ evidencias_json: evidencias }).eq('id', ticketId)
    return NextResponse.json({ ok: true, file: { name: file.name, path, url: urlData.publicUrl } })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 500 }) }
}

export async function DELETE(req: Request) {
  try {
    await validateToken(getToken(req))
    const { path, ticketId } = await req.json()
    await supabase.storage.from('evidencias').remove([path])
    const { data: ticket } = await supabase.from('tickets').select('evidencias_json').eq('id', ticketId).single()
    const evidencias = (Array.isArray(ticket?.evidencias_json) ? ticket.evidencias_json : []).filter((e: any) => e.path !== path)
    await supabase.from('tickets').update({ evidencias_json: evidencias }).eq('id', ticketId)
    return NextResponse.json({ ok: true })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 500 }) }
}
