import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireOperator } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  const err = requireOperator(user)
  if (err) return err

  const { data: patients } = await supabaseAdmin
    .from('patients')
    .select('id, full_name, furigana, age, sex, nickname, profile_completed')

  const { data: addictions } = await supabaseAdmin
    .from('patient_addictions')
    .select('patient_id, addictions(id, name)')

  const ids = (patients ?? []).map((p) => p.id)
  const createdAtMap: Record<string, string> = {}
  const emailMap: Record<string, string> = {}

  if (ids.length > 0) {
    for (const id of ids) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id)
      if (authUser?.user) {
        createdAtMap[id] = authUser.user.created_at
        emailMap[id] = authUser.user.email ?? ''
      }
    }
  }

  const addictionMap: Record<string, { id: number; name: string }[]> = {}
  for (const row of (addictions ?? [])) {
    if (!addictionMap[row.patient_id]) addictionMap[row.patient_id] = []
    if (row.addictions && !Array.isArray(row.addictions)) {
      addictionMap[row.patient_id].push(row.addictions as unknown as { id: number; name: string })
    }
  }

  const { data: allAddictions } = await supabaseAdmin
    .from('addictions')
    .select('id, name')
    .order('name')

  const enriched = (patients ?? []).map((p) => ({
    ...p,
    email: emailMap[p.id] ?? '',
    created_at: createdAtMap[p.id] ?? '',
    addictions: addictionMap[p.id] ?? [],
  }))

  enriched.sort((a, b) => (a.furigana ?? a.full_name ?? '').localeCompare(b.furigana ?? b.full_name ?? '', 'ja'))

  return Response.json({ clients: enriched, addictions: allAddictions ?? [] })
}
