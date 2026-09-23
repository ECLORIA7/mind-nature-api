'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { apiFetch } from '@/lib/auth-client'
import styles from './behavior.module.css'

type Addiction = { id: number; name: string; behavior_type: string }
type CalendarDay = { abstained: boolean | null; has_entries: boolean; count?: number }

// 飲酒
type AlcoholEntry = {
  id: string; start_time: string; end_time: string | null; location: string | null
  companions: string | null; mood: string | null; drinks: { type: string; amount: string }[]; notes: string | null
}
// 禁煙
type SmokingEntry = { id: string; smoked_at: string; location: string | null; trigger: string | null }
// ギャンブル
type GamblingEntry = { id: string; session_time: string | null; location: string | null; trigger: string | null; amount_spent: number; amount_lost: number }

const DEFAULT_LOCATIONS = ['自宅', '居酒屋', 'レストラン', '職場', 'コンビニ・公園']
const DEFAULT_COMPANIONS = ['一人で', '家族と', '友人と', '同僚と', 'パートナーと']
const DEFAULT_MOODS = ['ストレス発散', '楽しみたかった', 'つき合いで', '習慣で', 'さびしかった', 'イライラしていた']
const DEFAULT_DRINK_TYPES = ['ビール', 'ハイボール', '焼酎', 'ワイン', '日本酒', 'チューハイ', 'ウイスキー']
const DRINK_AMOUNTS = ['1杯', '2杯', '3杯', '4杯', '5杯以上']
const OVERALL_AMOUNTS = ['少し（1〜2杯）', 'ふつう（3〜4杯）', '多め（5杯以上）']
const DEFAULT_GAMBLING_TRIGGERS = ['ストレス', '暇だった', '誘われた', 'お金を取り戻したかった', '勝てると思った', '習慣で']
const DEFAULT_GAMBLING_LOCATIONS = ['パチンコ店', 'カジノ', '競馬場', '競艇場', 'オンラインカジノ', '友人宅']

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, m] = value ? value.split(':') : ['', '']
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  const mins = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))
  function update(newH: string, newM: string) {
    if (newH && newM) onChange(`${newH}:${newM}`)
    else if (newH) onChange(newH + ':' + (m || '00'))
    else if (newM) onChange((h || '00') + ':' + newM)
  }
  return (
    <div className={styles.timePicker}>
      <select className={styles.timeSelect} value={h || ''} onChange={e => update(e.target.value, m)}>
        <option value="">時</option>
        {hours.map(hh => <option key={hh} value={hh}>{hh}</option>)}
      </select>
      <span className={styles.timeSep}>:</span>
      <select className={styles.timeSelect} value={m || ''} onChange={e => update(h, e.target.value)}>
        <option value="">分</option>
        {mins.map(mm => <option key={mm} value={mm}>{mm}</option>)}
      </select>
    </div>
  )
}

function toDateStr(d: Date) { return d.toLocaleDateString('sv-SE') }
function todayStr() { return toDateStr(new Date()) }
function nowTimeStr() { return new Date().toTimeString().slice(0, 5) }

function getDayMarker(streak7th: boolean, abstained: boolean | null, hasEntries: boolean) {
  if (streak7th) return '🌸'
  if (abstained === true) return '⭕'
  if (abstained === false || hasEntries) return '❌'
  return ''
}

export default function BehaviorPage() {
  const [addictions, setAddictions] = useState<Addiction[]>([])
  const [addicsLoading, setAddicsLoading] = useState(true)
  const [selAddicId, setSelAddicId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month')
  const [viewDate, setViewDate] = useState(todayStr())
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1)
  const [calendar, setCalendar] = useState<Record<string, CalendarDay>>({})
  const [currentStreak, setCurrentStreak] = useState(0)
  const [customOptions, setCustomOptions] = useState<Record<string, string[]>>({})
  const [loadingCal, setLoadingCal] = useState(false)
  const [loadingDay, setLoadingDay] = useState(false)
  const [saving, setSaving] = useState(false)
  const [celebration, setCelebration] = useState<null | '7days' | '30days' | '365days'>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 飲酒
  const [dayEntries, setDayEntries] = useState<AlcoholEntry[]>([])
  const [dayRecord, setDayRecord] = useState<{ abstained: boolean } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalStep, setModalStep] = useState(0)
  const [form, setForm] = useState({ startTime: '', endTime: '', location: '', companions: '', mood: '', drinkTypes: [] as string[], overallAmount: '', notes: '' })
  const [otherInput, setOtherInput] = useState({ location: '', companions: '', mood: '', drinkType: '' })
  const [editEntryId, setEditEntryId] = useState<string | null>(null)
  const [endTimeInput, setEndTimeInput] = useState('')
  const [showEndTimeModal, setShowEndTimeModal] = useState(false)

  // 禁煙
  const [smokingEntries, setSmokingEntries] = useState<SmokingEntry[]>([])
  const [showSmokingModal, setShowSmokingModal] = useState<'realtime' | 'manual' | null>(null)
  const [smokingForm, setSmokingForm] = useState({ time: '', location: '', trigger: '' })
  const [editSmokingId, setEditSmokingId] = useState<string | null>(null)
  const [editSmokingForm, setEditSmokingForm] = useState({ location: '', trigger: '' })
  const [smokingOther, setSmokingOther] = useState({ location: '', trigger: '' })

  // ギャンブル
  const [gamblingEntries, setGamblingEntries] = useState<GamblingEntry[]>([])
  const [weekSummary, setWeekSummary] = useState({ lost: 0, spent: 0 })
  const [monthSummary, setMonthSummary] = useState({ lost: 0, spent: 0 })
  const [showGamblingModal, setShowGamblingModal] = useState(false)
  const [gamblingForm, setGamblingForm] = useState({ time: '', location: '', trigger: '', amount: '', result: 'lost' as 'lost' | 'won' })
  const [gamblingOther, setGamblingOther] = useState({ location: '', trigger: '' })
  const [gamblingError, setGamblingError] = useState('')

  useEffect(() => {
    apiFetch('/patient/info').then(r => r.json()).then(d => {
      const addics: Addiction[] = (d.patient?.patient_addictions ?? []).map(
        (pa: { addiction_id: number; behavior_type: string; addictions: { name: string } }) => ({
          id: pa.addiction_id,
          name: pa.addictions?.name ?? '',
          behavior_type: pa.behavior_type ?? 'other',
        })
      )
      setAddictions(addics)
      if (addics.length > 0) setSelAddicId(addics[0].id)
    }).finally(() => setAddicsLoading(false))
  }, [])

  const selAddiction = addictions.find(a => a.id === selAddicId)
  const behaviorType = selAddiction?.behavior_type ?? 'other'
  const isSmoking = behaviorType === 'smoking'
  const isGambling = behaviorType === 'gambling'
  const isAlco = behaviorType === 'alcohol'

  const loadCalendar = useCallback(() => {
    if (!selAddicId) return
    setLoadingCal(true)
    apiFetch(`/patient/behavior/calendar?addiction_id=${selAddicId}&year=${viewYear}&month=${viewMonth}&behavior_type=${behaviorType}`)
      .then(r => r.json())
      .then(d => { setCalendar(d.calendar ?? {}); setCurrentStreak(d.current_streak ?? 0) })
      .finally(() => setLoadingCal(false))
  }, [selAddicId, viewYear, viewMonth, behaviorType])

  useEffect(() => { loadCalendar() }, [loadCalendar])

  useEffect(() => {
    if (!selAddicId) return
    apiFetch(`/patient/behavior/custom-options?addiction_id=${selAddicId}`)
      .then(r => r.json()).then(d => setCustomOptions(d.options ?? {}))
  }, [selAddicId])

  const loadDayData = useCallback(() => {
    if (!selAddicId) return
    setLoadingDay(true)
    if (isSmoking) {
      apiFetch(`/patient/behavior/smoking/entries?addiction_id=${selAddicId}&date=${viewDate}`)
        .then(r => r.json()).then(d => setSmokingEntries(d.entries ?? []))
        .finally(() => setLoadingDay(false))
    } else if (isGambling) {
      apiFetch(`/patient/behavior/gambling/entries?addiction_id=${selAddicId}&date=${viewDate}`)
        .then(r => r.json()).then(d => {
          setGamblingEntries(d.entries ?? [])
          setWeekSummary(d.week ?? { lost: 0, spent: 0 })
          setMonthSummary(d.month ?? { lost: 0, spent: 0 })
        }).finally(() => setLoadingDay(false))
    } else {
      Promise.all([
        apiFetch(`/patient/behavior/daily?addiction_id=${selAddicId}&date=${viewDate}`).then(r => r.json()),
      ]).then(([d]) => { setDayRecord(d.daily); setDayEntries(d.entries ?? []) })
        .finally(() => setLoadingDay(false))
    }
  }, [selAddicId, viewDate, isSmoking, isGambling])

  useEffect(() => { if (viewMode === 'day') loadDayData() }, [viewMode, loadDayData])

  // カレンダーグリッド
  function buildCalendarGrid() {
    const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay()
    const lastDate = new Date(viewYear, viewMonth, 0).getDate()
    const cells: (number | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= lastDate; d++) cells.push(d)
    return cells
  }

  function isStreakMilestoneDay(dateStr: string): boolean {
    if (calendar[dateStr]?.abstained !== true) return false
    let streak = 0
    const d = new Date(dateStr)
    while (true) {
      const key = toDateStr(d)
      if (calendar[key]?.abstained === true) { streak++; d.setDate(d.getDate() - 1) }
      else break
    }
    return streak % 7 === 0
  }

  // 断酒/禁煙/禁ギャンブルボタン
  async function handleSaveAbstained() {
    if (!selAddicId || saving) return
    setSaving(true)
    const res = await apiFetch('/patient/behavior/daily', {
      method: 'POST',
      body: JSON.stringify({ addiction_id: selAddicId, date: viewDate, abstained: true })
    })
    const data = await res.json()
    const streak = data.current_streak ?? 0
    setCurrentStreak(streak)
    loadCalendar()
    if (viewMode === 'day') loadDayData()
    if (streak > 0 && streak % 365 === 0) setCelebration('365days')
    else if (streak > 0 && streak % 30 === 0) { setCelebration('30days'); launchConfetti() }
    else if (streak > 0 && streak % 7 === 0) setCelebration('7days')
    setSaving(false)
  }

  async function handleDeleteAbstained() {
    if (!selAddicId) return
    if (!confirm('記録を取り消しますか？')) return
    setLoadingDay(true)
    await apiFetch(`/patient/behavior/daily?addiction_id=${selAddicId}&date=${viewDate}`, { method: 'DELETE' })
    loadDayData(); loadCalendar()
  }

  // ====== 飲酒 ======
  async function saveCustomOption(field: string, value: string) {
    if (!selAddicId || !value.trim()) return
    await apiFetch('/patient/behavior/custom-options', { method: 'POST', body: JSON.stringify({ addiction_id: selAddicId, field_name: field, value }) })
    apiFetch(`/patient/behavior/custom-options?addiction_id=${selAddicId}`).then(r => r.json()).then(d => setCustomOptions(d.options ?? {}))
  }

  async function handleSaveDrinking() {
    if (!selAddicId || !form.startTime || saving) return
    setSaving(true)
    if (otherInput.location && form.location === '__other__') await saveCustomOption('location', otherInput.location)
    if (otherInput.companions && form.companions === '__other__') await saveCustomOption('companions', otherInput.companions)
    if (otherInput.mood && form.mood === '__other__') await saveCustomOption('mood', otherInput.mood)
    const drinks = form.drinkTypes.filter(t => t !== '__other__').map(t => ({ type: t, amount: form.overallAmount || '' }))
    if (form.drinkTypes.includes('__other__') && otherInput.drinkType) {
      await saveCustomOption('drink_type', otherInput.drinkType)
      drinks.push({ type: otherInput.drinkType, amount: form.overallAmount || '' })
    }
    await apiFetch('/patient/behavior/entries', {
      method: 'POST',
      body: JSON.stringify({
        addiction_id: selAddicId, date: viewDate,
        start_time: form.startTime + ':00', end_time: form.endTime ? form.endTime + ':00' : null,
        location: form.location === '__other__' ? otherInput.location : form.location,
        companions: form.companions === '__other__' ? otherInput.companions : form.companions,
        mood: form.mood === '__other__' ? otherInput.mood : form.mood,
        drinks, notes: form.notes || null,
      })
    })
    setSaving(false); setShowModal(false); loadCalendar(); if (viewMode === 'day') loadDayData()
  }

  async function handleDeleteAlcoEntry(id: string) {
    if (!confirm('この記録を削除しますか？')) return
    setLoadingDay(true)
    await apiFetch(`/patient/behavior/entries?id=${id}`, { method: 'DELETE' })
    loadDayData(); loadCalendar()
  }

  async function handleSaveEndTime() {
    if (!editEntryId || !endTimeInput) return
    await apiFetch('/patient/behavior/entries', { method: 'PUT', body: JSON.stringify({ id: editEntryId, end_time: endTimeInput + ':00' }) })
    setShowEndTimeModal(false); setEditEntryId(null); loadDayData()
  }

  // ====== 禁煙 ======
  async function handleSmokeNow() {
    if (!selAddicId || saving) return
    setSaving(true)
    await apiFetch('/patient/behavior/smoking/entries', {
      method: 'POST',
      body: JSON.stringify({ addiction_id: selAddicId, date: viewDate, smoked_at: nowTimeStr() + ':00' })
    })
    setSaving(false); loadCalendar(); if (viewMode === 'day') loadDayData()
  }

  async function handleSaveSmokingEntry() {
    if (!selAddicId || !smokingForm.time || saving) return
    setSaving(true)
    const loc = smokingForm.location === '__other__' ? smokingOther.location : smokingForm.location
    const trig = smokingForm.trigger === '__other__' ? smokingOther.trigger : smokingForm.trigger
    if (smokingOther.location && smokingForm.location === '__other__') await saveCustomOption('location', smokingOther.location)
    if (smokingOther.trigger && smokingForm.trigger === '__other__') await saveCustomOption('mood', smokingOther.trigger)
    await apiFetch('/patient/behavior/smoking/entries', {
      method: 'POST',
      body: JSON.stringify({ addiction_id: selAddicId, date: viewDate, smoked_at: smokingForm.time + ':00', location: loc || null, trigger: trig || null })
    })
    setShowSmokingModal(null); setSmokingForm({ time: '', location: '', trigger: '' }); setSmokingOther({ location: '', trigger: '' })
    setSaving(false); loadCalendar(); if (viewMode === 'day') loadDayData()
  }

  async function handleUpdateSmokingEntry() {
    if (!editSmokingId) return
    const loc = editSmokingForm.location === '__other__' ? smokingOther.location : editSmokingForm.location
    const trig = editSmokingForm.trigger === '__other__' ? smokingOther.trigger : editSmokingForm.trigger
    await apiFetch('/patient/behavior/smoking/entries', {
      method: 'PUT',
      body: JSON.stringify({ id: editSmokingId, location: loc || null, trigger: trig || null })
    })
    setEditSmokingId(null); loadDayData()
  }

  async function handleDeleteSmokingEntry(id: string) {
    if (!confirm('この記録を削除しますか？')) return
    setLoadingDay(true)
    await apiFetch(`/patient/behavior/smoking/entries?id=${id}`, { method: 'DELETE' })
    loadDayData(); loadCalendar()
  }

  // ====== ギャンブル ======
  async function handleSaveGamblingEntry() {
    if (!selAddicId || saving) return
    setSaving(true)
    setGamblingError('')
    const loc = gamblingForm.location === '__other__' ? gamblingOther.location : gamblingForm.location
    const trig = gamblingForm.trigger === '__other__' ? gamblingOther.trigger : gamblingForm.trigger
    if (gamblingOther.location && gamblingForm.location === '__other__') await saveCustomOption('location', gamblingOther.location)
    if (gamblingOther.trigger && gamblingForm.trigger === '__other__') await saveCustomOption('mood', gamblingOther.trigger)
    const absAmount = Number(gamblingForm.amount) || 0
    const netAmount = gamblingForm.result === 'won' ? -absAmount : absAmount
    const res = await apiFetch('/patient/behavior/gambling/entries', {
      method: 'POST',
      body: JSON.stringify({
        addiction_id: selAddicId, date: viewDate,
        session_time: gamblingForm.time ? gamblingForm.time + ':00' : null,
        location: loc || null, trigger: trig || null,
        amount_spent: 0,
        amount_lost: netAmount,
      })
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setGamblingError(data.error ?? '記録に失敗しました。もう一度お試しください。')
      setSaving(false)
      return
    }
    setShowGamblingModal(false); setGamblingForm({ time: '', location: '', trigger: '', amount: '', result: 'lost' }); setGamblingOther({ location: '', trigger: '' }); setGamblingError('')
    setSaving(false); loadCalendar(); if (viewMode === 'day') loadDayData()
  }

  async function handleDeleteGamblingEntry(id: string) {
    if (!confirm('この記録を削除しますか？')) return
    setLoadingDay(true)
    await apiFetch(`/patient/behavior/gambling/entries?id=${id}`, { method: 'DELETE' })
    loadDayData(); loadCalendar()
  }

  function launchConfetti() {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    canvas.style.display = 'block'
    const W = window.innerWidth; const H = window.innerHeight
    canvas.width = W; canvas.height = H
    const c = ctx; const el = canvas
    const pieces = Array.from({ length: 120 }, () => ({
      x: Math.random() * W, y: -20, vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 3,
      color: ['#15803d', '#fcd34d', '#f97316', '#ec4899', '#3b82f6'][Math.floor(Math.random() * 5)],
      size: 6 + Math.random() * 8, angle: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.2,
    }))
    let frame = 0
    function draw() {
      c.clearRect(0, 0, W, H)
      pieces.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.angle += p.spin; p.vy += 0.05
        c.save(); c.translate(p.x, p.y); c.rotate(p.angle)
        c.fillStyle = p.color; c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); c.restore()
      })
      frame++
      if (frame < 180) requestAnimationFrame(draw)
      else { c.clearRect(0, 0, W, H); el.style.display = 'none' }
    }
    draw()
  }

  const DOW = ['日', '月', '火', '水', '木', '金', '土']
  const grid = buildCalendarGrid()
  const todayS = todayStr()
  const locOptions = [...DEFAULT_LOCATIONS, ...(customOptions.location ?? [])]
  const compOptions = [...DEFAULT_COMPANIONS, ...(customOptions.companions ?? [])]
  const moodOptions = [...DEFAULT_MOODS, ...(customOptions.mood ?? [])]
  const drinkOptions = [...DEFAULT_DRINK_TYPES, ...(customOptions.drink_type ?? [])]
  const gamblingLocOptions = [...DEFAULT_GAMBLING_LOCATIONS, ...(customOptions.location ?? [])]
  const gamblingTrigOptions = [...DEFAULT_GAMBLING_TRIGGERS, ...(customOptions.mood ?? [])]
  const smokingTrigOptions = [...DEFAULT_MOODS, ...(customOptions.mood ?? [])]
  // ギャンブルのデフォルト場所（最後に使った場所）
  const defaultGamblingLocation = customOptions.location?.[customOptions.location.length - 1] ?? ''

  const abstainLabel = isSmoking ? '吸わなかった ⭕' : isGambling ? 'しなかった ⭕' : '飲まなかった ⭕'
  const didLabel = isSmoking ? '吸った ❌' : isGambling ? 'した ❌' : '飲んだ ❌'
  const streakUnit = isSmoking ? '本' : ''

  const GUIDES: Record<string, { title: string; steps: { icon: string; text: string }[] }> = {
    smoking: {
      title: '禁煙記録の使い方',
      steps: [
        { icon: '📱', text: 'この画面は「禁煙の記録をつける」ための画面です。\n毎日、吸ったかどうかをここに記録するだけでOKです。難しい操作はありません。' },
        { icon: '🚬', text: '【吸いました（今）】赤いボタン\nタバコを吸ってしまったら、このボタンをすぐに押してください。押すと今の時刻が自動的に記録されます。たとえば「14:32に1本吸った」という記録がつきます。' },
        { icon: '🕐', text: '【後から記録】グレーのボタン\n吸ったときにすぐ押せなかった場合に使います。押すと時刻を選ぶ画面が出ますので、吸った時間を選んで記録してください。' },
        { icon: '📍', text: '場所・きっかけの追記\n記録した後に「場所・きっかけを追記」という文字を押すと、どこで吸ったか・何がきっかけだったかを入力できます。たとえば「ストレスがたまって吸ってしまった」など。カウンセラーと振り返るときに役立ちます。入力しなくても大丈夫です。' },
        { icon: '⭕', text: '【吸わなかった ⭕】緑のボタン\n「今日は1本も吸わなかった！」という日に押してください。カレンダーに⭕マークがつきます。この⭕を増やしていくことが目標です。' },
        { icon: '📅', text: 'カレンダーの見方\n上の「月間」タブを押すとカレンダーが表示されます。吸った日には本数が表示され、吸わなかった日には⭕がつきます。数字をタップするとその日の詳細が見られます。' },
        { icon: '🌸', text: '7日間連続で吸わない日が続くと、カレンダーに🌸マークがつきます。まず7日間続けることを目標にしてみてください！' },
      ],
    },
    alcohol: {
      title: '飲酒記録の使い方',
      steps: [
        { icon: '📱', text: 'この画面は「飲酒の記録をつける」ための画面です。\n毎日、飲んだかどうかをここに記録するだけでOKです。' },
        { icon: '🍺', text: '【記録を追加】ボタン（日別画面で表示）\nお酒を飲んだら押してください。いくつかの質問に答えるだけで記録できます。①飲み始めた時刻→②どこで飲んだか→③誰と、どんな気分で→④何を飲んだか、の順に選ぶだけです。' },
        { icon: '⭕', text: '【飲まなかった ⭕】緑のボタン\n「今日は1杯も飲まなかった！」という日に押してください。カレンダーに⭕マークがつきます。この⭕を増やしていくことが目標です。' },
        { icon: '📅', text: 'カレンダーの見方\n上の「月間」タブを押すとカレンダーが表示されます。飲んだ日には❌、飲まなかった日には⭕がつきます。日付をタップするとその日の詳細が確認できます。' },
        { icon: '🕐', text: '終了時刻の記録\n記録カードの「終了時刻を記録」を押すと、飲み終わった時刻も後から入力できます。' },
        { icon: '🌸', text: '7日間連続で飲まない日が続くと、カレンダーに🌸マークがつきます。まず7日間続けることを目標にしてみてください！' },
        { icon: '🗑️', text: '間違えて記録した場合\n「今日の記録」タブを開いて、記録カードの下にある「削除」を押すと消せます。' },
      ],
    },
    gambling: {
      title: 'ギャンブル記録の使い方',
      steps: [
        { icon: '📱', text: 'この画面は「ギャンブルの記録をつける」ための画面です。\nギャンブルをした日・しなかった日を毎日記録します。' },
        { icon: '🎰', text: '【ギャンブルした】ボタン（日別画面で表示）\nギャンブルをした日に押してください。次の内容を入力する画面が出ます。\n①時刻（何時ごろ始めたか）\n②場所（パチンコ店・オンラインなど）\n③きっかけ（ストレス・暇だったなど）\n④使った金額（全部で何円使ったか）\n⑤負けた金額（手元に戻らなかった金額）\n\n全部入力しなくても大丈夫です。分かる範囲で入力して「記録する」を押してください。' },
        { icon: '📍', text: '場所の選び方\nよく行く場所はリストから選べます。リストにない場所は「その他…」を押して自分で入力できます。入力した場所は次回から選べるようになります。\nまた、前回入力した場所が最初から選ばれています（変える必要がなければそのままでOK）。' },
        { icon: '💡', text: 'きっかけの選び方\n「ストレス」「暇だった」などのリストから選んでください。当てはまるものがなければ「その他…」から自由に入力できます。' },
        { icon: '💴', text: '金額の入力方法\n「使った金額」→ 今日ギャンブルに使ったお金の合計（例：10000と入力）\n「負けた金額」→ そのうち戻ってこなかった金額（例：8000と入力）\n数字だけ入力すればOKです（「円」は不要）。' },
        { icon: '⭕', text: '【しなかった ⭕】緑のボタン\n「今日はギャンブルをしなかった！」という日に押してください。カレンダーに⭕マークがつきます。この⭕を増やしていくことが目標です。' },
        { icon: '📊', text: '週間・月間の合計\n「今日の記録」画面と「月間」画面に、今週・今月の負け金額の合計が自動で表示されます。金額の推移を把握することが回復への第一歩です。' },
        { icon: '🌸', text: '7日間連続でギャンブルをしない日が続くと、カレンダーに🌸マークがつきます。まず7日間続けることを目標にしてみてください！' },
      ],
    },
    other: {
      title: '行動記録の使い方',
      steps: [
        { icon: '📱', text: 'この画面は、問題となる行動があったかどうかを毎日記録するための画面です。' },
        { icon: '⭕', text: '【なかった ⭕】緑のボタン\n「今日は問題となる行動がなかった」という日に押してください。カレンダーに⭕マークがつきます。この⭕を増やしていくことが目標です。' },
        { icon: '❌', text: '問題となる行動があった日は、カレンダーに❌マークが表示されます。' },
        { icon: '📅', text: 'カレンダーの見方\n上の「月間」タブを押すとカレンダーが表示されます。日付をタップするとその日の記録を確認・入力できます。' },
        { icon: '🌸', text: '7日間連続で⭕が続くと、カレンダーに🌸マークがつきます。まず7日間続けることを目標にしてみてください！' },
      ],
    },
  }

  const currentGuide = GUIDES[behaviorType] ?? GUIDES.other
  const [showGuide, setShowGuide] = useState(false)

  if (addicsLoading) return <div className={styles.empty}><p>読み込み中...</p></div>
  if (addictions.length === 0) return (
    <div className={styles.empty}>
      <p>症状カテゴリーが登録されていません。</p>
      <p>カウンセラーにご連絡ください。</p>
    </div>
  )

  return (
    <div className={styles.page}>
      <canvas ref={canvasRef} className={styles.confettiCanvas} style={{ display: 'none' }} />

      {/* 使い方ボタン */}
      <button
        onClick={() => setShowGuide(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 20, padding: '6px 16px', fontSize: 13, color: '#1e40af', cursor: 'pointer', fontWeight: 500 }}
      >
        ❓ 使い方を見る
      </button>

      {/* カテゴリータブ */}
      <div className={styles.addicTabs}>
        {addictions.map(a => (
          <button key={a.id} className={`${styles.addicTab} ${selAddicId === a.id ? styles.addicTabActive : ''}`}
            onClick={() => { setSelAddicId(a.id); setViewMode('month') }}>
            {a.name}
          </button>
        ))}
      </div>

      {/* ストリークバナー */}
      {currentStreak > 0 && (
        <div className={styles.streakBanner}>
          🔥 {selAddiction?.name}を{isSmoking ? '吸っていない' : isGambling ? 'していない' : 'していない'}日が
          <strong>{currentStreak}日</strong>続いています！
        </div>
      )}

      {/* 月間/日別切り替え */}
      <div className={styles.viewToggle}>
        <button className={viewMode === 'month' ? styles.toggleActive : styles.toggleBtn} onClick={() => setViewMode('month')}>月間</button>
        <button className={viewMode === 'day' ? styles.toggleActive : styles.toggleBtn} onClick={() => setViewMode('day')}>今日の記録</button>
      </div>


      {/* ======= 月間ビュー ======= */}
      {viewMode === 'month' && (
        <div className={styles.monthView}>
          <div className={styles.monthNav}>
            <button className={styles.navBtn} onClick={() => { if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) } else setViewMonth(m => m - 1) }}>‹</button>
            <span className={styles.monthTitle}>{viewYear}年{viewMonth}月</span>
            <button className={styles.navBtn} onClick={() => { if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) } else setViewMonth(m => m + 1) }}>›</button>
          </div>

          <div className={styles.calGrid}>
            {DOW.map((d, i) => <div key={d} className={`${styles.dow} ${i === 0 ? styles.sun : i === 6 ? styles.sat : ''}`}>{d}</div>)}
            {grid.map((day, i) => {
              if (!day) return <div key={`e${i}`} />
              const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const rec = calendar[dateStr]
              const isToday = dateStr === todayS
              const isFuture = dateStr > todayS
              const milestone = !isFuture && rec ? isStreakMilestoneDay(dateStr) : false
              const marker = isFuture ? '' : getDayMarker(milestone, rec?.abstained ?? null, rec?.has_entries ?? false)
              return (
                <div key={day} className={`${styles.calDay} ${isToday ? styles.calToday : ''} ${isFuture ? styles.calFuture : ''}`}
                  onClick={() => { setViewDate(dateStr); setViewMode('day') }}>
                  {marker && <span className={styles.marker}>{marker}</span>}
                  {isSmoking && rec?.count != null && rec.count > 0 && (
                    <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>{rec.count}本</span>
                  )}
                  <span className={styles.dayNum}>{day}</span>
                </div>
              )
            })}
          </div>

          <div className={styles.legend}>
            <span>⭕ {isSmoking ? '禁煙できた日' : isGambling ? 'しなかった日' : '断酒できた日'}</span>
            <span>🌸 7日達成</span>
            <span>❌ {isSmoking ? '喫煙した日' : isGambling ? 'ギャンブルした日' : '飲酒した日'}</span>
          </div>

          {isGambling && (
            <div style={{ display: 'flex', gap: 12, margin: '16px 0', flexWrap: 'wrap' }}>
              <div style={{ background: weekSummary.lost >= 0 ? '#fef2f2' : '#f0fdf4', borderRadius: 10, padding: '12px 16px', flex: 1, minWidth: 140 }}>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px' }}>今週の精算</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: weekSummary.lost >= 0 ? '#ef4444' : '#15803d', margin: 0 }}>
                  {weekSummary.lost >= 0 ? `−${weekSummary.lost.toLocaleString()}円` : `+${(-weekSummary.lost).toLocaleString()}円`}
                </p>
              </div>
              <div style={{ background: monthSummary.lost >= 0 ? '#fef2f2' : '#f0fdf4', borderRadius: 10, padding: '12px 16px', flex: 1, minWidth: 140 }}>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px' }}>今月の精算</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: monthSummary.lost >= 0 ? '#ef4444' : '#15803d', margin: 0 }}>
                  {monthSummary.lost >= 0 ? `−${monthSummary.lost.toLocaleString()}円` : `+${(-monthSummary.lost).toLocaleString()}円`}
                </p>
              </div>
            </div>
          )}

          <div className={styles.fabWrap}>
            <button className={styles.fab} onClick={() => { setViewDate(todayS); setViewMode('day') }}>
              <span className={styles.fabPlus}>＋</span> 今日の記録を入力
            </button>
          </div>
        </div>
      )}

      {/* ======= 日別ビュー ======= */}
      {viewMode === 'day' && (
        <div className={styles.dayView}>
          <div className={styles.monthNav}>
            <button className={styles.navBtn} onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() - 1); setViewDate(toDateStr(d)) }}>‹</button>
            <span className={styles.monthTitle}>
              {new Date(viewDate + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
            </span>
            <button className={styles.navBtn} onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() + 1); setViewDate(toDateStr(d)) }}>›</button>
          </div>

          {loadingDay && <div className={styles.loadingWrap}><span className={styles.spinner} /><span className={styles.loadingText}>読み込み中...</span></div>}

          {/* === 飲酒モード === */}
          {isAlco && !loadingDay && (
            <>
              {dayRecord?.abstained === true && (
                <div className={styles.abstainedBadge}>
                  <span>⭕ この日は断酒できました！</span>
                  <button className={styles.undoBtn} onClick={handleDeleteAbstained}>取り消す</button>
                </div>
              )}
              {dayEntries.map(entry => (
                <div key={entry.id} className={styles.entryCard}>
                  <div className={styles.entryTop}>
                    <span className={styles.entryTime}>{entry.start_time.slice(0, 5)}〜{entry.end_time ? entry.end_time.slice(0, 5) : '？'}</span>
                    {!entry.end_time && (
                      <button className={styles.endTimeBtn} onClick={() => { setEditEntryId(entry.id); setEndTimeInput(''); setShowEndTimeModal(true) }}>終了時刻を記録</button>
                    )}
                  </div>
                  <div className={styles.chips}>
                    {entry.location && <span className={styles.chip}>{entry.location}</span>}
                    {entry.companions && <span className={styles.chip}>{entry.companions}</span>}
                    {entry.mood && <span className={styles.chip}>{entry.mood}</span>}
                  </div>
                  {entry.drinks?.length > 0 && <div className={styles.drinks}>{entry.drinks.map((d, i) => <span key={i}>{d.type}{d.amount ? `（${d.amount}）` : ''}{i < entry.drinks.length - 1 ? '・' : ''}</span>)}</div>}
                  {entry.notes && <p className={styles.entryNotes}>{entry.notes}</p>}
                  <button className={styles.deleteBtn} onClick={() => handleDeleteAlcoEntry(entry.id)}>削除</button>
                </div>
              ))}
              {!dayRecord && dayEntries.length === 0 && <p className={styles.noRecord}>まだ記録がありません</p>}
              <div className={styles.fabWrap}>
                <button className={styles.fab} onClick={() => { setForm({ startTime: todayStr() === viewDate ? nowTimeStr() : '19:00', endTime: '', location: '', companions: '', mood: '', drinkTypes: [], overallAmount: '', notes: '' }); setOtherInput({ location: '', companions: '', mood: '', drinkType: '' }); setModalStep(0); setShowModal(true) }}>
                  <span className={styles.fabPlus}>＋</span> 記録を追加
                </button>
              </div>
            </>
          )}

          {/* === 禁煙モード === */}
          {isSmoking && !loadingDay && (
            <>
              {smokingEntries.length > 0 ? (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>この日の喫煙: <strong style={{ color: '#ef4444' }}>{smokingEntries.length}本</strong></p>
                  {smokingEntries.map(entry => (
                    <div key={entry.id} className={styles.entryCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span className={styles.entryTime}>{entry.smoked_at.slice(0, 5)}</span>
                        <button className={styles.deleteBtn} onClick={() => handleDeleteSmokingEntry(entry.id)}>削除</button>
                      </div>
                      {editSmokingId === entry.id ? (
                        <div style={{ marginTop: 8 }}>
                          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>場所</p>
                          <div className={styles.choiceGrid}>
                            {[...locOptions, '__other__'].map(v => (
                              <button key={v} className={`${styles.choiceBtn} ${editSmokingForm.location === v ? styles.choiceSel : ''}`}
                                onClick={() => setEditSmokingForm(f => ({ ...f, location: v }))}>
                                {v === '__other__' ? 'その他…' : v}
                              </button>
                            ))}
                          </div>
                          {editSmokingForm.location === '__other__' && <input className={styles.otherInput} value={smokingOther.location} onChange={e => setSmokingOther(o => ({ ...o, location: e.target.value }))} placeholder="場所を入力" />}
                          <p style={{ fontSize: 12, color: '#64748b', margin: '10px 0 4px' }}>きっかけ</p>
                          <div className={styles.choiceGrid}>
                            {[...smokingTrigOptions, '__other__'].map(v => (
                              <button key={v} className={`${styles.choiceBtn} ${editSmokingForm.trigger === v ? styles.choiceSel : ''}`}
                                onClick={() => setEditSmokingForm(f => ({ ...f, trigger: v }))}>
                                {v === '__other__' ? 'その他…' : v}
                              </button>
                            ))}
                          </div>
                          {editSmokingForm.trigger === '__other__' && <input className={styles.otherInput} value={smokingOther.trigger} onChange={e => setSmokingOther(o => ({ ...o, trigger: e.target.value }))} placeholder="きっかけを入力" />}
                          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                            <button className={styles.saveBtn} onClick={handleUpdateSmokingEntry} style={{ fontSize: 13, padding: '7px 16px' }}>保存</button>
                            <button className={styles.cancelBtn} onClick={() => setEditSmokingId(null)} style={{ fontSize: 13, padding: '7px 12px' }}>キャンセル</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: 4 }}>
                          <div className={styles.chips}>
                            {entry.location && <span className={styles.chip}>{entry.location}</span>}
                            {entry.trigger && <span className={styles.chip}>{entry.trigger}</span>}
                          </div>
                          <button style={{ fontSize: 12, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', marginTop: 2 }}
                            onClick={() => { setEditSmokingId(entry.id); setEditSmokingForm({ location: entry.location ?? '', trigger: entry.trigger ?? '' }); setSmokingOther({ location: '', trigger: '' }) }}>
                            場所・きっかけを追記
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.noRecord}>まだ記録がありません</p>
              )}
              <div className={styles.fabWrap} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className={styles.fab} onClick={handleSmokeNow} disabled={saving} style={{ flex: 1, background: '#ef4444' }}>
                  🚬 吸いました（今）
                </button>
                <button className={styles.fab} onClick={() => { setSmokingForm({ time: '', location: '', trigger: '' }); setSmokingOther({ location: '', trigger: '' }); setShowSmokingModal('manual') }} style={{ flex: 1, background: '#64748b' }}>
                  ＋ 後から記録
                </button>
                <button className={`${styles.fab} ${styles.choiceBtnGood}`} onClick={handleSaveAbstained} disabled={saving} style={{ flex: 1 }}>
                  {saving ? '保存中...' : '吸わなかった ⭕'}
                </button>
              </div>
            </>
          )}

          {/* === ギャンブルモード === */}
          {isGambling && !loadingDay && (
            <>
              {gamblingEntries.length > 0 ? (
                <div>
                  {gamblingEntries.map(entry => (
                    <div key={entry.id} className={styles.entryCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className={styles.entryTime}>{entry.session_time ? entry.session_time.slice(0, 5) : '時刻未記録'}</span>
                        <button className={styles.deleteBtn} onClick={() => handleDeleteGamblingEntry(entry.id)}>削除</button>
                      </div>
                      <div className={styles.chips}>
                        {entry.location && <span className={styles.chip}>{entry.location}</span>}
                        {entry.trigger && <span className={styles.chip}>{entry.trigger}</span>}
                      </div>
                      {entry.amount_lost !== 0 && (
                        <div style={{ marginTop: 6, fontSize: 14, fontWeight: 700 }}>
                          {entry.amount_lost > 0
                            ? <span style={{ color: '#ef4444' }}>負け: {entry.amount_lost.toLocaleString()}円 ❌</span>
                            : <span style={{ color: '#15803d' }}>勝ち: {(-entry.amount_lost).toLocaleString()}円 ✓</span>
                          }
                        </div>
                      )}
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 12, margin: '12px 0', flexWrap: 'wrap' }}>
                    <div style={{ background: weekSummary.lost >= 0 ? '#fef2f2' : '#f0fdf4', borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 120 }}>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 2px' }}>今週の精算</p>
                      <p style={{ fontSize: 18, fontWeight: 700, color: weekSummary.lost >= 0 ? '#ef4444' : '#15803d', margin: 0 }}>
                        {weekSummary.lost >= 0 ? `−${weekSummary.lost.toLocaleString()}円` : `+${(-weekSummary.lost).toLocaleString()}円`}
                      </p>
                    </div>
                    <div style={{ background: monthSummary.lost >= 0 ? '#fef2f2' : '#f0fdf4', borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 120 }}>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 2px' }}>今月の精算</p>
                      <p style={{ fontSize: 18, fontWeight: 700, color: monthSummary.lost >= 0 ? '#ef4444' : '#15803d', margin: 0 }}>
                        {monthSummary.lost >= 0 ? `−${monthSummary.lost.toLocaleString()}円` : `+${(-monthSummary.lost).toLocaleString()}円`}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className={styles.noRecord}>まだ記録がありません</p>
              )}
              <div className={styles.fabWrap} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className={styles.fab} onClick={() => {
                  setGamblingForm({ time: todayStr() === viewDate ? nowTimeStr() : '', location: defaultGamblingLocation, trigger: '', amount: '', result: 'lost' })
                  setGamblingOther({ location: '', trigger: '' }); setGamblingError(''); setShowGamblingModal(true)
                }} style={{ flex: 1 }}>
                  <span className={styles.fabPlus}>＋</span> ギャンブルした
                </button>
                <button className={`${styles.fab} ${styles.choiceBtnGood}`} onClick={handleSaveAbstained} disabled={saving} style={{ flex: 1 }}>
                  {saving ? '保存中...' : 'しなかった ⭕'}
                </button>
              </div>
            </>
          )}

          {/* その他モード */}
          {!isAlco && !isSmoking && !isGambling && !loadingDay && (
            <>
              {dayRecord?.abstained === true && (
                <div className={styles.abstainedBadge}>
                  <span>⭕ この日は問題行動がありませんでした</span>
                  <button className={styles.undoBtn} onClick={handleDeleteAbstained}>取り消す</button>
                </div>
              )}
              {dayRecord?.abstained === false && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: '#dc2626' }}>❌ この日は記録されています</span>
                  <button className={styles.undoBtn} onClick={handleDeleteAbstained}>取り消す</button>
                </div>
              )}
              {!dayRecord && <p className={styles.noRecord}>まだ記録がありません</p>}
              <div className={styles.fabWrap} style={{ display: 'flex', gap: 10 }}>
                <button className={styles.fab} onClick={async () => {
                  if (saving) return
                  setSaving(true)
                  await apiFetch('/patient/behavior/daily', { method: 'POST', body: JSON.stringify({ addiction_id: selAddicId, date: viewDate, abstained: false }) })
                  setSaving(false); loadCalendar(); loadDayData()
                }} disabled={saving} style={{ flex: 1, background: '#ef4444' }}>
                  {saving ? '保存中...' : 'あった ❌'}
                </button>
                <button className={`${styles.fab} ${styles.choiceBtnGood}`} onClick={handleSaveAbstained} disabled={saving} style={{ flex: 1 }}>
                  {saving ? '保存中...' : 'なかった ⭕'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ======= モーダル: 飲酒 ======= */}
      {showModal && isAlco && (
        <div className={styles.modalBg} onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>{['今日の記録', '飲み始めた時刻', 'どこで飲んだ？', '誰と・気分は？', '何を飲んだ？'][modalStep]}</span>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className={styles.stepDots}>
              {[0, 1, 2, 3, 4].map(i => <span key={i} className={`${styles.dot} ${i <= modalStep ? styles.dotActive : ''}`} />)}
            </div>
            {modalStep === 0 && (
              <div className={styles.choiceGrid}>
                <button className={styles.choiceBtn} onClick={() => setModalStep(1)}>飲んだ</button>
                <button className={`${styles.choiceBtn} ${styles.choiceBtnGood}`} onClick={handleSaveAbstained} disabled={saving}>{saving ? '保存中...' : '飲まなかった ⭕'}</button>
              </div>
            )}
            {modalStep === 1 && (
              <div>
                <p className={styles.fieldLabel}>飲み始めた時刻</p>
                <TimeSelect value={form.startTime} onChange={v => setForm(f => ({ ...f, startTime: v }))} />
                <p className={styles.fieldLabel} style={{ marginTop: 16 }}>終了時刻（後で入力もOK）</p>
                <TimeSelect value={form.endTime} onChange={v => setForm(f => ({ ...f, endTime: v }))} />
                <button className={styles.nextBtn} onClick={() => setModalStep(2)}>次へ</button>
              </div>
            )}
            {modalStep === 2 && (
              <div>
                <p className={styles.fieldLabel}>どこで？</p>
                <div className={styles.choiceGrid}>
                  {locOptions.map(v => <button key={v} className={`${styles.choiceBtn} ${form.location === v ? styles.choiceSel : ''}`} onClick={() => setForm(f => ({ ...f, location: v }))}>{v}</button>)}
                  <button className={`${styles.choiceBtn} ${form.location === '__other__' ? styles.choiceSel : ''}`} onClick={() => setForm(f => ({ ...f, location: '__other__' }))}>その他…</button>
                </div>
                {form.location === '__other__' && <input className={styles.otherInput} placeholder="場所を入力" value={otherInput.location} onChange={e => setOtherInput(o => ({ ...o, location: e.target.value }))} />}
                <button className={styles.nextBtn} disabled={!form.location || (form.location === '__other__' && !otherInput.location)} onClick={() => setModalStep(3)}>次へ</button>
              </div>
            )}
            {modalStep === 3 && (
              <div>
                <p className={styles.fieldLabel}>誰と？</p>
                <div className={styles.choiceGrid}>
                  {compOptions.map(v => <button key={v} className={`${styles.choiceBtn} ${form.companions === v ? styles.choiceSel : ''}`} onClick={() => setForm(f => ({ ...f, companions: v }))}>{v}</button>)}
                  <button className={`${styles.choiceBtn} ${form.companions === '__other__' ? styles.choiceSel : ''}`} onClick={() => setForm(f => ({ ...f, companions: '__other__' }))}>その他…</button>
                </div>
                {form.companions === '__other__' && <input className={styles.otherInput} placeholder="入力" value={otherInput.companions} onChange={e => setOtherInput(o => ({ ...o, companions: e.target.value }))} />}
                <p className={styles.fieldLabel} style={{ marginTop: 16 }}>気分・きっかけ</p>
                <div className={styles.choiceGrid}>
                  {moodOptions.map(v => <button key={v} className={`${styles.choiceBtn} ${form.mood === v ? styles.choiceSel : ''}`} onClick={() => setForm(f => ({ ...f, mood: v }))}>{v}</button>)}
                  <button className={`${styles.choiceBtn} ${form.mood === '__other__' ? styles.choiceSel : ''}`} onClick={() => setForm(f => ({ ...f, mood: '__other__' }))}>その他…</button>
                </div>
                {form.mood === '__other__' && <input className={styles.otherInput} placeholder="入力" value={otherInput.mood} onChange={e => setOtherInput(o => ({ ...o, mood: e.target.value }))} />}
                <button className={styles.nextBtn} disabled={!form.companions || !form.mood || (form.companions === '__other__' && !otherInput.companions) || (form.mood === '__other__' && !otherInput.mood)} onClick={() => setModalStep(4)}>次へ</button>
              </div>
            )}
            {modalStep === 4 && (
              <div>
                <p className={styles.fieldLabel}>何を？（複数選択可）</p>
                <div className={styles.choiceGrid}>
                  {drinkOptions.map(v => <button key={v} className={`${styles.choiceBtn} ${form.drinkTypes.includes(v) ? styles.choiceSel : ''}`} onClick={() => setForm(f => ({ ...f, drinkTypes: f.drinkTypes.includes(v) ? f.drinkTypes.filter(d => d !== v) : [...f.drinkTypes, v] }))}>{v}</button>)}
                  <button className={`${styles.choiceBtn} ${form.drinkTypes.includes('__other__') ? styles.choiceSel : ''}`} onClick={() => setForm(f => ({ ...f, drinkTypes: f.drinkTypes.includes('__other__') ? f.drinkTypes.filter(d => d !== '__other__') : [...f.drinkTypes, '__other__'] }))}>その他…</button>
                </div>
                {form.drinkTypes.includes('__other__') && <input className={styles.otherInput} placeholder="お酒の種類を入力" value={otherInput.drinkType} onChange={e => setOtherInput(o => ({ ...o, drinkType: e.target.value }))} />}
                <p className={styles.fieldLabel} style={{ marginTop: 16 }}>だいたいどれくらい？</p>
                <div className={styles.choiceGrid}>
                  {OVERALL_AMOUNTS.map(v => <button key={v} className={`${styles.choiceBtn} ${form.overallAmount === v ? styles.choiceSel : ''}`} onClick={() => setForm(f => ({ ...f, overallAmount: v }))}>{v}</button>)}
                </div>
                <button className={styles.nextBtn} disabled={form.drinkTypes.length === 0 || saving} onClick={handleSaveDrinking}>{saving ? '保存中...' : '記録する'}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======= モーダル: 禁煙（手動記録）======= */}
      {showSmokingModal === 'manual' && (
        <div className={styles.modalBg} onClick={e => { if (e.target === e.currentTarget) setShowSmokingModal(null) }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>喫煙を記録</span>
              <button className={styles.closeBtn} onClick={() => setShowSmokingModal(null)}>×</button>
            </div>
            <p className={styles.fieldLabel}>吸った時刻</p>
            <TimeSelect value={smokingForm.time} onChange={v => setSmokingForm(f => ({ ...f, time: v }))} />
            <p className={styles.fieldLabel} style={{ marginTop: 16 }}>場所</p>
            <div className={styles.choiceGrid}>
              {[...locOptions, '__other__'].map(v => (
                <button key={v} className={`${styles.choiceBtn} ${smokingForm.location === v ? styles.choiceSel : ''}`}
                  onClick={() => setSmokingForm(f => ({ ...f, location: v }))}>
                  {v === '__other__' ? 'その他…' : v}
                </button>
              ))}
            </div>
            {smokingForm.location === '__other__' && <input className={styles.otherInput} value={smokingOther.location} onChange={e => setSmokingOther(o => ({ ...o, location: e.target.value }))} placeholder="場所を入力" />}
            <p className={styles.fieldLabel} style={{ marginTop: 16 }}>きっかけ</p>
            <div className={styles.choiceGrid}>
              {[...smokingTrigOptions, '__other__'].map(v => (
                <button key={v} className={`${styles.choiceBtn} ${smokingForm.trigger === v ? styles.choiceSel : ''}`}
                  onClick={() => setSmokingForm(f => ({ ...f, trigger: v }))}>
                  {v === '__other__' ? 'その他…' : v}
                </button>
              ))}
            </div>
            {smokingForm.trigger === '__other__' && <input className={styles.otherInput} value={smokingOther.trigger} onChange={e => setSmokingOther(o => ({ ...o, trigger: e.target.value }))} placeholder="きっかけを入力" />}
            <button className={styles.nextBtn} disabled={!smokingForm.time || saving} onClick={handleSaveSmokingEntry}>{saving ? '保存中...' : '記録する'}</button>
          </div>
        </div>
      )}

      {/* ======= モーダル: ギャンブル ======= */}
      {showGamblingModal && (
        <div className={styles.modalBg} onClick={e => { if (e.target === e.currentTarget) setShowGamblingModal(false) }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>ギャンブルを記録</span>
              <button className={styles.closeBtn} onClick={() => setShowGamblingModal(false)}>×</button>
            </div>
            <p className={styles.fieldLabel}>時刻（任意）</p>
            <TimeSelect value={gamblingForm.time} onChange={v => setGamblingForm(f => ({ ...f, time: v }))} />
            <p className={styles.fieldLabel} style={{ marginTop: 16 }}>場所</p>
            <div className={styles.choiceGrid}>
              {[...gamblingLocOptions, '__other__'].map(v => (
                <button key={v} className={`${styles.choiceBtn} ${gamblingForm.location === v ? styles.choiceSel : ''}`}
                  onClick={() => setGamblingForm(f => ({ ...f, location: v }))}>
                  {v === '__other__' ? 'その他…' : v}
                </button>
              ))}
            </div>
            {gamblingForm.location === '__other__' && <input className={styles.otherInput} value={gamblingOther.location} onChange={e => setGamblingOther(o => ({ ...o, location: e.target.value }))} placeholder="場所を入力（次回から選べます）" />}
            <p className={styles.fieldLabel} style={{ marginTop: 16 }}>きっかけ</p>
            <div className={styles.choiceGrid}>
              {[...gamblingTrigOptions, '__other__'].map(v => (
                <button key={v} className={`${styles.choiceBtn} ${gamblingForm.trigger === v ? styles.choiceSel : ''}`}
                  onClick={() => setGamblingForm(f => ({ ...f, trigger: v }))}>
                  {v === '__other__' ? 'その他…' : v}
                </button>
              ))}
            </div>
            {gamblingForm.trigger === '__other__' && <input className={styles.otherInput} value={gamblingOther.trigger} onChange={e => setGamblingOther(o => ({ ...o, trigger: e.target.value }))} placeholder="きっかけを入力（次回から選べます）" />}
            <p className={styles.fieldLabel} style={{ marginTop: 16 }}>金額</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className={styles.otherInput}
                type="number"
                placeholder="例: 5000"
                value={gamblingForm.amount}
                onChange={e => setGamblingForm(f => ({ ...f, amount: e.target.value }))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: 14, color: '#374151' }}>円</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setGamblingForm(f => ({ ...f, result: 'lost' }))}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '2px solid', borderColor: gamblingForm.result === 'lost' ? '#ef4444' : '#e2e8f0', background: gamblingForm.result === 'lost' ? '#fef2f2' : '#f8fafc', color: gamblingForm.result === 'lost' ? '#dc2626' : '#64748b', fontWeight: gamblingForm.result === 'lost' ? 700 : 400, fontSize: 15, cursor: 'pointer' }}
              >
                負けた ❌
              </button>
              <button
                type="button"
                onClick={() => setGamblingForm(f => ({ ...f, result: 'won' }))}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '2px solid', borderColor: gamblingForm.result === 'won' ? '#15803d' : '#e2e8f0', background: gamblingForm.result === 'won' ? '#f0fdf4' : '#f8fafc', color: gamblingForm.result === 'won' ? '#15803d' : '#64748b', fontWeight: gamblingForm.result === 'won' ? 700 : 400, fontSize: 15, cursor: 'pointer' }}
              >
                勝った ✓
              </button>
            </div>
            {gamblingError && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8, padding: '8px 12px', background: '#fef2f2', borderRadius: 8 }}>{gamblingError}</p>}
            <button className={styles.nextBtn} disabled={saving} onClick={handleSaveGamblingEntry}>{saving ? '保存中...' : '記録する'}</button>
          </div>
        </div>
      )}

      {/* 終了時刻モーダル（飲酒） */}
      {showEndTimeModal && (
        <div className={styles.modalBg} onClick={e => { if (e.target === e.currentTarget) setShowEndTimeModal(false) }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>終了時刻を記録</span>
              <button className={styles.closeBtn} onClick={() => setShowEndTimeModal(false)}>×</button>
            </div>
            <p className={styles.fieldLabel}>何時に終わりましたか？</p>
            <TimeSelect value={endTimeInput} onChange={v => setEndTimeInput(v)} />
            <button className={styles.nextBtn} disabled={!endTimeInput} onClick={handleSaveEndTime}>保存</button>
          </div>
        </div>
      )}

      {/* 使い方モーダル */}
      {showGuide && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200, padding: '0' }}
          onClick={e => { if (e.target === e.currentTarget) setShowGuide(false) }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>{currentGuide.title}</h2>
              <button onClick={() => setShowGuide(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 18, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {currentGuide.steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: '#f8fafc', borderRadius: 12, padding: '14px 16px' }}>
                  <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{step.icon}</span>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#374151', whiteSpace: 'pre-wrap' }}>{step.text}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setShowGuide(false)}
              style={{ width: '100%', marginTop: 20, background: '#1e293b', color: 'white', border: 'none', borderRadius: 12, padding: '14px', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* お祝いモーダル */}
      {celebration === '7days' && (
        <div className={styles.celebBg} onClick={() => setCelebration(null)}>
          <div className={styles.celebCard}>
            <div className={styles.celebIcon}>🌸</div>
            <h2 className={styles.celebTitle}>7日間達成！</h2>
            <p className={styles.celebText}>素晴らしいです！<br />1週間続けることができました。</p>
            <button className={styles.celebBtn} onClick={() => setCelebration(null)}>ありがとう！</button>
          </div>
        </div>
      )}
      {celebration === '30days' && (
        <div className={styles.celebBg} onClick={() => setCelebration(null)}>
          <div className={styles.celebCard}>
            <div className={styles.celebIcon}>🎉</div>
            <h2 className={styles.celebTitle}>1ヶ月達成！</h2>
            <p className={styles.celebText}>本当によく頑張りました！</p>
            <button className={styles.celebBtn} onClick={() => setCelebration(null)}>やったー！</button>
          </div>
        </div>
      )}
      {celebration === '365days' && (
        <div className={styles.yearCelebBg}>
          <div className={styles.yearCelebContent}>
            <div className={styles.yearCelebStars}>✨ ✨ ✨</div>
            <div className={styles.yearCelebIcon}>🏆</div>
            <h1 className={styles.yearCelebTitle}>1年間、おめでとうございます！</h1>
            <p className={styles.yearCelebText}>365日間、本当によく頑張りました。<br /><br />これからも、あなたのことをみんなが応援しています。</p>
            <div className={styles.yearCelebStars}>🌟 🌟 🌟</div>
            <button className={styles.yearCelebBtn} onClick={() => { setCelebration(null); launchConfetti() }}>これからも頑張ります！</button>
          </div>
        </div>
      )}
    </div>
  )
}
