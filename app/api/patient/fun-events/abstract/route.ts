import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError

  const patient_id = user!.role === 'patient'
    ? user!.id
    : req.nextUrl.searchParams.get('patient_id')
  if (!patient_id) return Response.json({ error: 'patient_idが必要です' }, { status: 400 })

  const { data: program } = await supabaseAdmin
    .from('counseling_programs')
    .select('started_at')
    .eq('patient_id', patient_id)
    .single()

  const { data: entries } = await supabaseAdmin
    .from('fun_events_abstract')
    .select('id, entry_num, content, created_at, updated_at')
    .eq('patient_id', patient_id)
    .order('entry_num', { ascending: true })

  return Response.json({
    started_at: program?.started_at ?? null,
    entries: entries ?? [],
  })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError
  if (user!.role !== 'patient') return Response.json({ error: '患者アカウントが必要です' }, { status: 403 })

  const { content } = await req.json().catch(() => ({}))
  if (!content?.trim()) return Response.json({ error: 'contentは必須です' }, { status: 400 })

  const { data: last } = await supabaseAdmin
    .from('fun_events_abstract')
    .select('entry_num')
    .eq('patient_id', user!.id)
    .order('entry_num', { ascending: false })
    .limit(1)
    .single()

  const entry_num = last ? last.entry_num + 1 : 1
  if (entry_num > 50) return Response.json({ error: '50話を超えて追加できません' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('fun_events_abstract')
    .insert({ patient_id: user!.id, entry_num, content: content.trim() })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ entry: data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError
  if (user!.role !== 'patient') return Response.json({ error: '患者アカウントが必要です' }, { status: 403 })

  const { id, content } = await req.json().catch(() => ({}))
  if (!id || !content?.trim()) return Response.json({ error: 'idとcontentは必須です' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('fun_events_abstract')
    .update({ content: content.trim(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('patient_id', user!.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ message: '更新しました' })
}
