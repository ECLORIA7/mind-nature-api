import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError

  const params = req.nextUrl.searchParams
  const addiction_id = params.get('addic')
  const patient_id = user!.role === 'patient'
    ? user!.id
    : (params.get('patient_id') ?? user!.id)

  if (!addiction_id) {
    return Response.json({ error: 'addic パラメータが必要です' }, { status: 400 })
  }

  const { data: messages } = await supabaseAdmin
    .from('bbs_messages')
    .select(`
      id, content, sequence_num, created_at,
      poster_id,
      profiles!bbs_messages_poster_id_fkey ( full_name )
    `)
    .eq('patient_id', patient_id)
    .eq('addiction_id', Number(addiction_id))
    .order('sequence_num', { ascending: true })

  return Response.json({ messages: messages ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError

  const body = await req.json().catch(() => ({}))
  const content = body.content?.trim()
  const addiction_id = body.addic != null ? Number(body.addic) : null
  const patient_id = user!.role === 'patient'
    ? user!.id
    : (body.patient_id ?? user!.id)

  if (!content) return Response.json({ error: 'content は必須です' }, { status: 400 })
  if (!addiction_id) return Response.json({ error: 'addic は必須です' }, { status: 400 })
  if (content.length > 1000) return Response.json({ error: 'メッセージは1000文字以内です' }, { status: 400 })

  const { data: last } = await supabaseAdmin
    .from('bbs_messages')
    .select('sequence_num')
    .eq('patient_id', patient_id)
    .eq('addiction_id', addiction_id)
    .order('sequence_num', { ascending: false })
    .limit(1)
    .single()

  const sequence_num = last ? last.sequence_num + 1 : 1

  const { data, error } = await supabaseAdmin
    .from('bbs_messages')
    .insert({ patient_id, addiction_id, poster_id: user!.id, content, sequence_num })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ message: 'メッセージを送信しました', data }, { status: 201 })
}
