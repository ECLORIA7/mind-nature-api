import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireCounselor } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  const err = requireCounselor(user)
  if (err) return err

  const group_id = req.nextUrl.searchParams.get('group_id')
  if (!group_id) return Response.json({ error: 'group_idが必要です' }, { status: 400 })

  const { data: messages } = await supabaseAdmin
    .from('group_messages')
    .select('id, sender_id, content, created_at')
    .eq('group_id', group_id)
    .order('created_at', { ascending: true })

  const senderIds = [...new Set((messages ?? []).map((m) => m.sender_id).filter(Boolean))]
  let senderMap: Record<string, string> = {}

  if (senderIds.length > 0) {
    const { data: patients } = await supabaseAdmin
      .from('patients')
      .select('id, full_name, nickname')
      .in('id', senderIds)
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .in('id', senderIds)

    ;(patients ?? []).forEach((p) => {
      senderMap[p.id] = p.nickname || p.full_name
    })
    ;(profiles ?? []).forEach((p) => {
      if (!senderMap[p.id]) senderMap[p.id] = p.full_name
    })
  }

  const enriched = (messages ?? []).map((m) => ({
    ...m,
    sender_name: m.sender_id ? (senderMap[m.sender_id] ?? '不明') : 'システム',
    is_mine: m.sender_id === user!.id,
  }))

  return Response.json({ messages: enriched })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  const err = requireCounselor(user)
  if (err) return err

  const { group_id, content } = await req.json()
  if (!group_id || !content?.trim()) return Response.json({ error: '必須項目が不足しています' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('group_messages')
    .insert({ group_id, sender_id: user!.id, content: content.trim() })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
