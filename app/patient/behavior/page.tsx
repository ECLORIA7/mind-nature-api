'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { apiFetch } from '@/lib/auth-client'
import styles from './behavior.module.css'

type Addiction = { id: number; name: string }
type CalendarDay = { abstained: boolean | null; has_entries: boolean }
type AlcoholEntry = {
  id: string
  start_time: string
  end_time: string | null
  location: string | null
  companions: string | null
  mood: string | null
  drinks: { type: string; amount: string }[]
  notes: string | null
}
type Drink = { type: string; amount: string }

const DEFAULT_LOCATIONS = ['自宅', '居酒屋', 'レストラン', '職場', 'コンビニ・公園']
const DEFAULT_COMPANIONS = ['一人で', '家族と', '友人と', '同僚と', 'パートナーと']
const DEFAULT_MOODS = ['ストレス発散', '楽しみたかった', 'つき合いで', '習慣で', 'さびしかった', 'イライラしていた']
const DEFAULT_DRINK_TYPES = ['ビール', 'ハイボール', '焼酎', 'ワイン', '日本酒', 'チューハイ', 'ウイスキー']
const DRINK_AMOUNTS = ['1杯', '2杯', '3杯', '4杯', '5杯以上']
const OVERALL_AMOUNTS = ['少し（1〜2杯）', 'ふつう（3〜4杯）', '多め（5杯以上）']

function isAlcohol(name: string) {
  return /アルコール|飲酒|お酒|酒/.test(name)
}

function toDateStr(d: Date) {
  return d.toLocaleDateString('sv-SE')
}

function todayStr() {
  return toDateStr(new Date())
}

// 断酒連続日数に基づいてマーカーを決定
function getDayMarker(streak7th: boolean, abstained: boolean | null, hasEntries: boolean) {
  if (streak7th) return '🌸'
  if (abstained === true) return '⭕'
  if (abstained === false || hasEntries) return '❌'
  return ''
}

export default function BehaviorPage() {
  const [addictions, setAddictions] = useState<Addiction[]>([])
  const [selAddicId, setSelAddicId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month')
  const [viewDate, setViewDate] = useState(todayStr())
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1)
  const [calendar, setCalendar] = useState<Record<string, CalendarDay>>({})
  const [currentStreak, setCurrentStreak] = useState(0)
  const [dayEntries, setDayEntries] = useState<AlcoholEntry[]>([])
  const [dayRecord, setDayRecord] = useState<{ abstained: boolean } | null>(null)
  const [customOptions, setCustomOptions] = useState<Record<string, string[]>>({})
  const [loadingCal, setLoadingCal] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalStep, setModalStep] = useState(0)
  const [form, setForm] = useState({
    startTime: '', endTime: '',
    location: '', companions: '', mood: '',
    drinkTypes: [] as string[], overallAmount: '',
    notes: '',
  })
  const [otherInput, setOtherInput] = useState({ location: '', companions: '', mood: '', drinkType: '' })
  const [editEntryId, setEditEntryId] = useState<string | null>(null)
  const [endTimeInput, setEndTimeInput] = useState('')
  const [showEndTimeModal, setShowEndTimeModal] = useState(false)
  const [celebration, setCelebration] = useState<null | '7days' | '30days' | '365days'>(null)
  const [saving, setSaving] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 症状カテゴリー取得
  useEffect(() => {
    apiFetch('/patient/info').then(r => r.json()).then(d => {
      const addics: Addiction[] = (d.patient?.patient_addictions ?? []).map(
        (pa: { addiction_id: number; addictions: { name: string } }) => ({
          id: pa.addiction_id,
          name: pa.addictions?.name ?? '',
        })
      )
      setAddictions(addics)
      if (addics.length > 0) setSelAddicId(addics[0].id)
    })
  }, [])

  const loadCalendar = useCallback(() => {
    if (!selAddicId) return
    setLoadingCal(true)
    apiFetch(`/patient/behavior/calendar?addiction_id=${selAddicId}&year=${viewYear}&month=${viewMonth}`)
      .then(r => r.json())
      .then(d => {
        setCalendar(d.calendar ?? {})
        setCurrentStreak(d.current_streak ?? 0)
      })
      .finally(() => setLoadingCal(false))
  }, [selAddicId, viewYear, viewMonth])

  useEffect(() => { loadCalendar() }, [loadCalendar])

  const loadDayData = useCallback(() => {
    if (!selAddicId) return
    apiFetch(`/patient/behavior/daily?addiction_id=${selAddicId}&date=${viewDate}`)
      .then(r => r.json())
      .then(d => {
        setDayRecord(d.daily)
        setDayEntries(d.entries ?? [])
      })
  }, [selAddicId, viewDate])

  useEffect(() => {
    if (viewMode === 'day') loadDayData()
  }, [viewMode, loadDayData])

  useEffect(() => {
    if (!selAddicId) return
    apiFetch(`/patient/behavior/custom-options?addiction_id=${selAddicId}`)
      .then(r => r.json())
      .then(d => setCustomOptions(d.options ?? {}))
  }, [selAddicId])

  const selAddiction = addictions.find(a => a.id === selAddicId)
  const isAlcoMode = selAddiction ? isAlcohol(selAddiction.name) : false

  function openModal() {
    setForm({ startTime: todayStr() === viewDate ? new Date().toTimeString().slice(0, 5) : '19:00', endTime: '', location: '', companions: '', mood: '', drinkTypes: [], overallAmount: '', notes: '' })
    setOtherInput({ location: '', companions: '', mood: '', drinkType: '' })
    setModalStep(0)
    setShowModal(true)
  }

  function closeModal() { setShowModal(false) }

  function toggleDrinkType(t: string) {
    setForm(f => ({
      ...f,
      drinkTypes: f.drinkTypes.includes(t) ? f.drinkTypes.filter(d => d !== t) : [...f.drinkTypes, t]
    }))
  }

  async function saveCustomOption(field: string, value: string) {
    if (!selAddicId || !value.trim()) return
    await apiFetch('/patient/behavior/custom-options', {
      method: 'POST',
      body: JSON.stringify({ addiction_id: selAddicId, field_name: field, value })
    })
    // Refresh custom options
    apiFetch(`/patient/behavior/custom-options?addiction_id=${selAddicId}`)
      .then(r => r.json()).then(d => setCustomOptions(d.options ?? {}))
  }

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
    closeModal()
    loadCalendar()
    if (viewMode === 'day') loadDayData()
    // ミルストーン判定
    if (streak > 0 && streak % 365 === 0) {
      setCelebration('365days')
    } else if (streak > 0 && streak % 30 === 0) {
      setCelebration('30days')
      launchConfetti()
    } else if (streak > 0 && streak % 7 === 0) {
      setCelebration('7days')
    }
    setSaving(false)
  }

  async function handleSaveDrinking() {
    if (!selAddicId || !form.startTime || saving) return
    setSaving(true)
    // 「その他」のカスタム選択肢を登録
    if (otherInput.location && form.location === '__other__') {
      await saveCustomOption('location', otherInput.location)
    }
    if (otherInput.companions && form.companions === '__other__') {
      await saveCustomOption('companions', otherInput.companions)
    }
    if (otherInput.mood && form.mood === '__other__') {
      await saveCustomOption('mood', otherInput.mood)
    }

    const drinks: Drink[] = form.drinkTypes.map(t => ({ type: t, amount: form.overallAmount || '' }))

    await apiFetch('/patient/behavior/entries', {
      method: 'POST',
      body: JSON.stringify({
        addiction_id: selAddicId,
        date: viewDate,
        start_time: form.startTime + ':00',
        end_time: form.endTime ? form.endTime + ':00' : null,
        location: form.location === '__other__' ? otherInput.location : form.location,
        companions: form.companions === '__other__' ? otherInput.companions : form.companions,
        mood: form.mood === '__other__' ? otherInput.mood : form.mood,
        drinks,
        notes: form.notes || null,
      })
    })
    setSaving(false)
    closeModal()
    loadCalendar()
    if (viewMode === 'day') loadDayData()
  }

  async function handleDeleteEntry(id: string) {
    if (!confirm('この記録を削除しますか？')) return
    await apiFetch(`/patient/behavior/entries?id=${id}`, { method: 'DELETE' })
    loadDayData()
    loadCalendar()
  }

  async function handleSaveEndTime() {
    if (!editEntryId || !endTimeInput) return
    await apiFetch('/patient/behavior/entries', {
      method: 'PUT',
      body: JSON.stringify({ id: editEntryId, end_time: endTimeInput + ':00' })
    })
    setShowEndTimeModal(false)
    setEditEntryId(null)
    loadDayData()
  }

  // コンフェッティアニメーション
  function launchConfetti() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.style.display = 'block'
    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width = W
    canvas.height = H
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const c = ctx!
    const el = canvas
    const pieces = Array.from({ length: 120 }, () => ({
      x: Math.random() * W, y: -20,
      vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 3,
      color: ['#15803d', '#fcd34d', '#f97316', '#ec4899', '#3b82f6'][Math.floor(Math.random() * 5)],
      size: 6 + Math.random() * 8, angle: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.2,
    }))
    let frame = 0
    function draw() {
      c.clearRect(0, 0, W, H)
      pieces.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.angle += p.spin; p.vy += 0.05
        c.save(); c.translate(p.x, p.y); c.rotate(p.angle)
        c.fillStyle = p.color
        c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        c.restore()
      })
      frame++
      if (frame < 180) requestAnimationFrame(draw)
      else { c.clearRect(0, 0, W, H); el.style.display = 'none' }
    }
    draw()
  }

  // 月間カレンダーの日付グリッド
  function buildCalendarGrid() {
    const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay()
    const lastDate = new Date(viewYear, viewMonth, 0).getDate()
    const cells: (number | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= lastDate; d++) cells.push(d)
    return cells
  }

  // その日が streak の 7n 日目かどうか計算（簡易版：連続して abstained が続いているか）
  function isStreakMilestoneDay(dateStr: string): boolean {
    // カレンダーデータから逆算して連続日数を確認
    const date = new Date(dateStr)
    if (calendar[dateStr]?.abstained !== true) return false
    let streak = 0
    const d = new Date(date)
    while (true) {
      const key = toDateStr(d)
      if (calendar[key]?.abstained === true) { streak++; d.setDate(d.getDate() - 1) }
      else break
    }
    return streak % 7 === 0
  }

  const DOW = ['日', '月', '火', '水', '木', '金', '土']
  const grid = buildCalendarGrid()
  const todayS = todayStr()

  const locOptions = [...DEFAULT_LOCATIONS, ...(customOptions.location ?? [])]
  const compOptions = [...DEFAULT_COMPANIONS, ...(customOptions.companions ?? [])]
  const moodOptions = [...DEFAULT_MOODS, ...(customOptions.mood ?? [])]
  const drinkOptions = [...DEFAULT_DRINK_TYPES, ...(customOptions.drink_type ?? [])]

  if (addictions.length === 0) {
    return (
      <div className={styles.empty}>
        <p>症状カテゴリーが登録されていません。</p>
        <p>マイページから登録してください。</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* コンフェッティキャンバス */}
      <canvas ref={canvasRef} className={styles.confettiCanvas} style={{ display: 'none' }} />

      {/* 症状カテゴリータブ */}
      <div className={styles.addicTabs}>
        {addictions.map(a => (
          <button
            key={a.id}
            className={`${styles.addicTab} ${selAddicId === a.id ? styles.addicTabActive : ''}`}
            onClick={() => setSelAddicId(a.id)}
          >
            {a.name}
          </button>
        ))}
      </div>

      {/* ストリークバナー */}
      {currentStreak > 0 && (
        <div className={styles.streakBanner}>
          🔥 {selAddiction?.name.replace(/に関する悩み/, '')}をしていない日が
          <strong>{currentStreak}日</strong>続いています！
        </div>
      )}

      {/* 月間 / 日別 切り替え */}
      <div className={styles.viewToggle}>
        <button className={viewMode === 'month' ? styles.toggleActive : styles.toggleBtn} onClick={() => setViewMode('month')}>月間</button>
        <button className={viewMode === 'day' ? styles.toggleActive : styles.toggleBtn} onClick={() => setViewMode('day')}>今日の記録</button>
      </div>

      {/* 月間ビュー */}
      {viewMode === 'month' && (
        <div className={styles.monthView}>
          <div className={styles.monthNav}>
            <button className={styles.navBtn} onClick={() => {
              if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
              else setViewMonth(m => m - 1)
            }}>‹</button>
            <span className={styles.monthTitle}>{viewYear}年{viewMonth}月</span>
            <button className={styles.navBtn} onClick={() => {
              if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
              else setViewMonth(m => m + 1)
            }}>›</button>
          </div>

          <div className={styles.calGrid}>
            {DOW.map((d, i) => (
              <div key={d} className={`${styles.dow} ${i === 0 ? styles.sun : i === 6 ? styles.sat : ''}`}>{d}</div>
            ))}
            {grid.map((day, i) => {
              if (!day) return <div key={`e${i}`} />
              const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const rec = calendar[dateStr]
              const isToday = dateStr === todayS
              const isFuture = dateStr > todayS
              const milestone = !isFuture && rec ? isStreakMilestoneDay(dateStr) : false
              const marker = isFuture ? '' : getDayMarker(milestone, rec?.abstained ?? null, rec?.has_entries ?? false)
              return (
                <div
                  key={day}
                  className={`${styles.calDay} ${isToday ? styles.calToday : ''} ${isFuture ? styles.calFuture : ''}`}
                  onClick={() => { setViewDate(dateStr); setViewMode('day') }}
                >
                  {marker && <span className={styles.marker}>{marker}</span>}
                  <span className={styles.dayNum}>{day}</span>
                </div>
              )
            })}
          </div>

          <div className={styles.legend}>
            <span>⭕ 断酒できた日</span>
            <span>🌸 7日達成</span>
            <span>❌ {selAddiction?.name.replace(/に関する悩み/, '')}した日</span>
          </div>

          <div className={styles.fabWrap}>
            <button className={styles.fab} onClick={() => { setViewDate(todayS); openModal() }}>
              <span className={styles.fabPlus}>＋</span> 今日の記録を入力
            </button>
          </div>
        </div>
      )}

      {/* 日別ビュー */}
      {viewMode === 'day' && (
        <div className={styles.dayView}>
          <div className={styles.monthNav}>
            <button className={styles.navBtn} onClick={() => {
              const d = new Date(viewDate); d.setDate(d.getDate() - 1); setViewDate(toDateStr(d))
            }}>‹</button>
            <span className={styles.monthTitle}>
              {new Date(viewDate + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
            </span>
            <button className={styles.navBtn} onClick={() => {
              const d = new Date(viewDate); d.setDate(d.getDate() + 1); setViewDate(toDateStr(d))
            }}>›</button>
          </div>

          {/* 断酒記録済み */}
          {dayRecord?.abstained === true && (
            <div className={styles.abstainedBadge}>
              ⭕ この日は断酒できました！
            </div>
          )}

          {/* 飲酒エントリー一覧 */}
          {isAlcoMode && dayEntries.map(entry => (
            <div key={entry.id} className={styles.entryCard}>
              <div className={styles.entryTop}>
                <span className={styles.entryTime}>
                  {entry.start_time.slice(0, 5)}〜{entry.end_time ? entry.end_time.slice(0, 5) : '？'}
                </span>
                {!entry.end_time && (
                  <button className={styles.endTimeBtn} onClick={() => {
                    setEditEntryId(entry.id); setEndTimeInput(''); setShowEndTimeModal(true)
                  }}>終了時刻を記録</button>
                )}
              </div>
              <div className={styles.chips}>
                {entry.location && <span className={styles.chip}>{entry.location}</span>}
                {entry.companions && <span className={styles.chip}>{entry.companions}</span>}
                {entry.mood && <span className={styles.chip}>{entry.mood}</span>}
              </div>
              {entry.drinks?.length > 0 && (
                <div className={styles.drinks}>
                  {entry.drinks.map((d, i) => <span key={i}>{d.type}{d.amount ? `（${d.amount}）` : ''}{i < entry.drinks.length - 1 ? '・' : ''}</span>)}
                </div>
              )}
              {entry.notes && <p className={styles.entryNotes}>{entry.notes}</p>}
              <button className={styles.deleteBtn} onClick={() => handleDeleteEntry(entry.id)}>削除</button>
            </div>
          ))}

          {!dayRecord && dayEntries.length === 0 && (
            <p className={styles.noRecord}>まだ記録がありません</p>
          )}

          <div className={styles.fabWrap}>
            <button className={styles.fab} onClick={openModal}>
              <span className={styles.fabPlus}>＋</span> 記録を追加
            </button>
          </div>
        </div>
      )}

      {/* 入力モーダル */}
      {showModal && (
        <div className={styles.modalBg} onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>
                {['今日の記録', '飲み始めた時刻', 'どこで飲んだ？', '誰と・気分は？', '何を飲んだ？'][modalStep]}
              </span>
              <button className={styles.closeBtn} onClick={closeModal}>×</button>
            </div>

            {/* ステップインジケーター */}
            {isAlcoMode && (
              <div className={styles.stepDots}>
                {[0, 1, 2, 3, 4].map(i => (
                  <span key={i} className={`${styles.dot} ${i <= modalStep ? styles.dotActive : ''}`} />
                ))}
              </div>
            )}

            {/* Step 0: 飲んだ/飲まなかった */}
            {modalStep === 0 && (
              <div>
                <div className={styles.choiceGrid}>
                  {isAlcoMode ? (
                    <>
                      <button className={styles.choiceBtn} onClick={() => setModalStep(1)}>飲んだ</button>
                      <button className={`${styles.choiceBtn} ${styles.choiceBtnGood}`} onClick={handleSaveAbstained} disabled={saving}>
                        {saving ? '保存中...' : '飲まなかった ⭕'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button className={styles.choiceBtn} onClick={async () => {
                        await apiFetch('/patient/behavior/daily', {
                          method: 'POST',
                          body: JSON.stringify({ addiction_id: selAddicId, date: viewDate, abstained: false })
                        })
                        closeModal(); loadCalendar(); if (viewMode === 'day') loadDayData()
                      }}>あった</button>
                      <button className={`${styles.choiceBtn} ${styles.choiceBtnGood}`} onClick={handleSaveAbstained} disabled={saving}>
                        {saving ? '保存中...' : 'なかった ⭕'}
                      </button>
                    </>
                  )}
                </div>
                {!isAlcoMode && (
                  <div style={{ marginTop: 12 }}>
                    <textarea
                      className={styles.notesInput}
                      placeholder="メモ（状況・気持ちなど）"
                      rows={3}
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 1: 開始時刻 */}
            {modalStep === 1 && (
              <div>
                <p className={styles.fieldLabel}>飲み始めた時刻</p>
                <input
                  type="time"
                  className={styles.timeInput}
                  value={form.startTime}
                  onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                />
                <p className={styles.fieldLabel} style={{ marginTop: 16 }}>終了時刻（後で入力もOK）</p>
                <input
                  type="time"
                  className={styles.timeInput}
                  value={form.endTime}
                  onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                />
                <button className={styles.nextBtn} onClick={() => setModalStep(2)}>次へ</button>
              </div>
            )}

            {/* Step 2: 場所 */}
            {modalStep === 2 && (
              <div>
                <p className={styles.fieldLabel}>どこで？</p>
                <div className={styles.choiceGrid}>
                  {locOptions.map(v => (
                    <button
                      key={v}
                      className={`${styles.choiceBtn} ${form.location === v ? styles.choiceSel : ''}`}
                      onClick={() => setForm(f => ({ ...f, location: v }))}
                    >{v}</button>
                  ))}
                  <button
                    className={`${styles.choiceBtn} ${form.location === '__other__' ? styles.choiceSel : ''}`}
                    onClick={() => setForm(f => ({ ...f, location: '__other__' }))}
                  >その他…</button>
                </div>
                {form.location === '__other__' && (
                  <input
                    className={styles.otherInput}
                    placeholder="場所を入力（次回から選べます）"
                    value={otherInput.location}
                    onChange={e => setOtherInput(o => ({ ...o, location: e.target.value }))}
                  />
                )}
                <button
                  className={styles.nextBtn}
                  disabled={!form.location || (form.location === '__other__' && !otherInput.location)}
                  onClick={() => setModalStep(3)}
                >次へ</button>
              </div>
            )}

            {/* Step 3: 誰と + 気分 */}
            {modalStep === 3 && (
              <div>
                <p className={styles.fieldLabel}>誰と？</p>
                <div className={styles.choiceGrid}>
                  {compOptions.map(v => (
                    <button
                      key={v}
                      className={`${styles.choiceBtn} ${form.companions === v ? styles.choiceSel : ''}`}
                      onClick={() => setForm(f => ({ ...f, companions: v }))}
                    >{v}</button>
                  ))}
                  <button
                    className={`${styles.choiceBtn} ${form.companions === '__other__' ? styles.choiceSel : ''}`}
                    onClick={() => setForm(f => ({ ...f, companions: '__other__' }))}
                  >その他…</button>
                </div>
                {form.companions === '__other__' && (
                  <input
                    className={styles.otherInput}
                    placeholder="一緒にいた人を入力"
                    value={otherInput.companions}
                    onChange={e => setOtherInput(o => ({ ...o, companions: e.target.value }))}
                  />
                )}
                <p className={styles.fieldLabel} style={{ marginTop: 16 }}>気分・きっかけ</p>
                <div className={styles.choiceGrid}>
                  {moodOptions.map(v => (
                    <button
                      key={v}
                      className={`${styles.choiceBtn} ${form.mood === v ? styles.choiceSel : ''}`}
                      onClick={() => setForm(f => ({ ...f, mood: v }))}
                    >{v}</button>
                  ))}
                  <button
                    className={`${styles.choiceBtn} ${form.mood === '__other__' ? styles.choiceSel : ''}`}
                    onClick={() => setForm(f => ({ ...f, mood: '__other__' }))}
                  >その他…</button>
                </div>
                {form.mood === '__other__' && (
                  <input
                    className={styles.otherInput}
                    placeholder="気分・きっかけを入力"
                    value={otherInput.mood}
                    onChange={e => setOtherInput(o => ({ ...o, mood: e.target.value }))}
                  />
                )}
                <button
                  className={styles.nextBtn}
                  disabled={!form.companions || !form.mood || (form.companions === '__other__' && !otherInput.companions) || (form.mood === '__other__' && !otherInput.mood)}
                  onClick={() => setModalStep(4)}
                >次へ</button>
              </div>
            )}

            {/* Step 4: 何を・どれくらい */}
            {modalStep === 4 && (
              <div>
                <p className={styles.fieldLabel}>何を？（複数選択可）</p>
                <div className={styles.choiceGrid}>
                  {drinkOptions.map(v => (
                    <button
                      key={v}
                      className={`${styles.choiceBtn} ${form.drinkTypes.includes(v) ? styles.choiceSel : ''}`}
                      onClick={() => toggleDrinkType(v)}
                    >{v}</button>
                  ))}
                  <button
                    className={`${styles.choiceBtn} ${form.drinkTypes.includes('__other__') ? styles.choiceSel : ''}`}
                    onClick={() => toggleDrinkType('__other__')}
                  >その他…</button>
                </div>
                {form.drinkTypes.includes('__other__') && (
                  <input
                    className={styles.otherInput}
                    placeholder="お酒の種類を入力"
                    value={otherInput.drinkType}
                    onChange={e => setOtherInput(o => ({ ...o, drinkType: e.target.value }))}
                  />
                )}
                <p className={styles.fieldLabel} style={{ marginTop: 16 }}>だいたいどれくらい？</p>
                <div className={styles.choiceGrid}>
                  {OVERALL_AMOUNTS.map(v => (
                    <button
                      key={v}
                      className={`${styles.choiceBtn} ${form.overallAmount === v ? styles.choiceSel : ''}`}
                      onClick={() => setForm(f => ({ ...f, overallAmount: v }))}
                    >{v}</button>
                  ))}
                </div>
                <button
                  className={styles.nextBtn}
                  disabled={form.drinkTypes.length === 0 || saving}
                  onClick={handleSaveDrinking}
                >{saving ? '保存中...' : '記録する'}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 終了時刻モーダル */}
      {showEndTimeModal && (
        <div className={styles.modalBg} onClick={e => { if (e.target === e.currentTarget) setShowEndTimeModal(false) }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>終了時刻を記録</span>
              <button className={styles.closeBtn} onClick={() => setShowEndTimeModal(false)}>×</button>
            </div>
            <p className={styles.fieldLabel}>何時に終わりましたか？</p>
            <input
              type="time"
              className={styles.timeInput}
              value={endTimeInput}
              onChange={e => setEndTimeInput(e.target.value)}
            />
            <button className={styles.nextBtn} disabled={!endTimeInput} onClick={handleSaveEndTime}>保存</button>
          </div>
        </div>
      )}

      {/* お祝い：7日達成 */}
      {celebration === '7days' && (
        <div className={styles.celebBg} onClick={() => setCelebration(null)}>
          <div className={styles.celebCard}>
            <div className={styles.celebIcon}>🌸</div>
            <h2 className={styles.celebTitle}>7日間達成！</h2>
            <p className={styles.celebText}>素晴らしいです！<br />1週間続けることができました。<br />この調子で続けましょう！</p>
            <button className={styles.celebBtn} onClick={() => setCelebration(null)}>ありがとう！</button>
          </div>
        </div>
      )}

      {/* お祝い：30日達成 */}
      {celebration === '30days' && (
        <div className={styles.celebBg} onClick={() => setCelebration(null)}>
          <div className={styles.celebCard}>
            <div className={styles.celebIcon}>🎉</div>
            <h2 className={styles.celebTitle}>1ヶ月達成！</h2>
            <p className={styles.celebText}>本当によく頑張りました！<br />30日間、自分自身と向き合い<br />続けてきた証です。誇りを持って！</p>
            <button className={styles.celebBtn} onClick={() => setCelebration(null)}>やったー！</button>
          </div>
        </div>
      )}

      {/* お祝い：365日達成 */}
      {celebration === '365days' && (
        <div className={styles.yearCelebBg}>
          <div className={styles.yearCelebContent}>
            <div className={styles.yearCelebStars}>✨ ✨ ✨</div>
            <div className={styles.yearCelebIcon}>🏆</div>
            <h1 className={styles.yearCelebTitle}>1年間、おめでとうございます！</h1>
            <p className={styles.yearCelebText}>
              365日間、本当によく頑張りました。<br /><br />
              あなたが歩んできた一歩一歩が、<br />
              今日のあなたを作っています。<br /><br />
              これからも、あなたのことを<br />
              みんなが応援しています。
            </p>
            <div className={styles.yearCelebStars}>🌟 🌟 🌟</div>
            <button className={styles.yearCelebBtn} onClick={() => { setCelebration(null); launchConfetti() }}>
              これからも頑張ります！
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
