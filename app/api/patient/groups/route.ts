import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: '認証が必要です' }, { status: 401 })

  const patientId = user.role === 'patient'
    ? user.id
    : (req.nextUrl.searchParams.get('patient_id') ?? null)

  if (!patientId) return Response.json({ error: 'patient_id が必要です' }, { status: 400 })

  const { data: membership } = await supabaseAdmin
    .from('group_members')
    .select('group_id')
    .eq('patient_id', patientId)

  const groupIds = (membership ?? []).map((m) => m.group_id)
  if (groupIds.length === 0) return Response.json({ groups: [] })

  const { data: groups } = await supabaseAdmin
    .from('client_groups')
    .select('id, name, organization_id, organizations(name)')
    .in('id', groupIds)

  return Response.json({ groups: groups ?? [] })
}

