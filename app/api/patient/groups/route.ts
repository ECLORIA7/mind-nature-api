import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: '認証が必要です' }, { status: 401 })
  if (user.role !== 'patient') return Response.json({ error: '権限がありません' }, { status: 403 })

  const { data: membership } = await supabaseAdmin
    .from('group_members')
    .select('group_id')
    .eq('patient_id', user.id)

  const groupIds = (membership ?? []).map((m) => m.group_id)
  if (groupIds.length === 0) return Response.json({ groups: [] })

  const { data: groups } = await supabaseAdmin
    .from('client_groups')
    .select('id, name, organization_id, organizations(name)')
    .in('id', groupIds)

  return Response.json({ groups: groups ?? [] })
}
