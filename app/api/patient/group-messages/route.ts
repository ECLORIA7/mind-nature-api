import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

async function checkMembership(patient_id: string, group_id: string) {
  const { data } = await supabaseAdmin
    .from('group_members')
    .select('group_id')
    .eq('patient_id', patient_id)
    .eq('group_id', group_id)
    .single()
  return !!data
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: '認証が必要です' }, { status: 401 })
  if (user.role !== 'patient') return Response.json({ error: '権限がありません' }, { status: 403 })

  const group_id = req.nextUrl.searchParams.get('group_id')
  if (!group_id) return Response.json({ error: 'group_idが必要です' }, { status: 400 })

  const isMember = await checkMembership(user.id, group_id)
  if (!isMember) return Response.json({ error: 'このグループのメンバーではありません' }, { status: 403 })

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
    is_mine: m.sender_id === user.id,
  }))

  return Response.json({ messages: enriched })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: '認証が必要です' }, { status: 401 })
  if (user.role !== 'patient') return Response.json({ error: '権限がありません' }, { status: 403 })

  const { group_id, content } = await req.json()
  if (!group_id || !content?.trim()) return Response.json({ error: '必須項目が不足しています' }, { status: 400 })

  const isMember = await checkMembership(user.id, String(group_id))
  if (!isMember) return Response.json({ error: 'このグループのメンバーではありません' }, { status: 403 })

  const { error } = await supabaseAdmin
    .from('group_messages')
    .insert({ group_id, sender_id: user.id, content: content.trim() })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
