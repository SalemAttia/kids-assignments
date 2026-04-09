'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SUBJECT_LABELS, QUIZ_DIFFICULTY_LABELS } from '@/types'
import type { User, Subject, QuizDifficulty } from '@/types'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts'

interface SessionWithReport {
  id: string
  subject: string
  description: string
  created_at: string
  reports: Array<{ total_score: number }>
}

interface WeeklyStats {
  sessionCount: number
  totalMinutes: number
  avgScore: number
  maxScore: number
  minScore: number
  subjectBreakdown: Array<{ subject: string; label: string; count: number }>
  weekStart: string
  weekEnd: string
}

interface WeeklySummaryData {
  summary: string
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
}

type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'
interface PrayerLog { prayer_date: string; fajr: boolean; dhuhr: boolean; asr: boolean; maghrib: boolean; isha: boolean }

interface AdherenceDay {
  dayOfWeek: number
  date: string
  isToday: boolean
  isPast: boolean
  isFuture: boolean
  scheduled: string[]
  studied: string[]
  missed: string[]
  extras: string[]
}

interface AdherenceData {
  weekStart: string
  weekEnd: string
  today: number
  hasSchedule: boolean
  days: AdherenceDay[]
}

function gradeLabel(grade: number) {
  const names: Record<number, string> = {
    1: 'الأول ابتدائي',   2: 'الثاني ابتدائي',  3: 'الثالث ابتدائي',
    4: 'الرابع ابتدائي',  5: 'الخامس ابتدائي',  6: 'السادسة ابتدائي',
    7: 'الأول إعدادي',    8: 'الثاني إعدادي',   9: 'الثالث إعدادي',
  }
  return names[grade] ?? `الصف ${grade}`
}

const PRAYER_KEYS: PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
const PRAYER_LABELS: Record<PrayerKey, string> = {
  fajr: 'فجر', dhuhr: 'ظهر', asr: 'عصر', maghrib: 'مغرب', isha: 'عشاء',
}
const DAY_LABELS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

interface AnswerReview {
  question_text: string
  student_answer: string
  correct_answer: string
  is_correct: boolean
  explanation: string
}

interface SessionDetailReport {
  id: string
  total_score: number
  feedback: string
  mistakes: unknown[]
  suggestions: string[]
  all_answers_review: AnswerReview[] | null
  created_at: string
}

interface SessionDetail {
  id: string
  subject: string
  description: string
  image_url?: string | null
  duration_minutes: number
  created_at: string
  reports: SessionDetailReport[]
}

function formatMinutes(m: number) {
  if (!m || m === 0) return null
  if (m < 60) return `${m} د`
  return `${Math.floor(m / 60)}س ${m % 60 > 0 ? `${m % 60}د` : ''}`
}

const SUBJECT_EMOJIS: Record<string, string> = {
  arabic: '📖', math: '🔢', science: '🔬', english: '💬',
  social_studies: '🌍', religion: '🌙', computer: '💻', art: '🎨', other: '📚',
}

const SCORE_GRADIENT: Record<string, string> = {
  excellent: 'from-yellow-400 via-orange-400 to-pink-500',
  good: 'from-blue-400 to-purple-500',
  low: 'from-red-400 to-rose-500',
}

function getPastDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    return d.toISOString().split('T')[0]
  })
}

export default function ParentDashboard() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [sessions, setSessions] = useState<Record<string, SessionWithReport[]>>({})
  const [weeklyStats, setWeeklyStats] = useState<Record<string, WeeklyStats>>({})
  const [weeklySummaries, setWeeklySummaries] = useState<Record<string, WeeklySummaryData | null>>({})
  const [loadingSummary, setLoadingSummary] = useState<Record<string, boolean>>({})
  const [prayerLogs, setPrayerLogs] = useState<Record<string, PrayerLog[]>>({})
  const [adherence, setAdherence] = useState<Record<string, AdherenceData>>({})
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [savingDifficulty, setSavingDifficulty] = useState<Record<string, boolean>>({})

  async function updateDifficulty(userId: string, difficulty: QuizDifficulty) {
    setSavingDifficulty(prev => ({ ...prev, [userId]: true }))
    // Optimistic update
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, quiz_difficulty: difficulty } : u))
    try {
      const res = await fetch(`/api/users/${userId}/difficulty`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty }),
      })
      if (!res.ok) {
        // Revert on failure — refetch users
        const { data } = await createClient().from('users').select('*')
        if (data) setUsers(data)
      }
    } catch {
      const { data } = await createClient().from('users').select('*')
      if (data) setUsers(data)
    }
    setSavingDifficulty(prev => ({ ...prev, [userId]: false }))
  }

  async function openSessionModal(sessionId: string) {
    setModalLoading(true)
    setSelectedSession(null)
    try {
      const res = await fetch(`/api/session/${sessionId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedSession(data.session)
      }
    } catch { /* ignore */ }
    setModalLoading(false)
  }

  function closeModal() {
    setSelectedSession(null)
    setModalLoading(false)
    setLightboxUrl(null)
    setShowDeleteConfirm(false)
    setDeleting(false)
  }

  async function handleDeleteSession(sessionId: string) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/session/${sessionId}`, { method: 'DELETE' })
      if (res.ok) {
        closeModal()
        // Refresh sessions list
        loadData()
      }
    } catch { /* ignore */ }
    setDeleting(false)
  }

  useEffect(() => {
    if (sessionStorage.getItem('parentAuth') !== 'true') {
      router.replace('/parent')
      return
    }
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function loadData() {
    const { data: usersData } = await createClient().from('users').select('*')
    if (!usersData) { setLoading(false); return }
    setUsers(usersData)

    const sessionsMap: Record<string, SessionWithReport[]> = {}
    const statsMap: Record<string, WeeklyStats> = {}
    const prayerMap: Record<string, PrayerLog[]> = {}
    const adherenceMap: Record<string, AdherenceData> = {}

    await Promise.all(usersData.map(async (user) => {
      const [sessRes, statsRes, prayerRes, adhRes] = await Promise.all([
        fetch(`/api/reports/${user.id}`),
        fetch(`/api/reports/weekly/${user.id}`),
        fetch(`/api/prayers/${user.id}?days=7`),
        fetch(`/api/schedule/adherence/${user.id}`),
      ])
      if (sessRes.ok) {
        const d = await sessRes.json()
        sessionsMap[user.id] = d.sessions || []
      }
      if (statsRes.ok) {
        statsMap[user.id] = await statsRes.json()
      }
      if (prayerRes.ok) {
        const d = await prayerRes.json()
        prayerMap[user.id] = d.logs || []
      }
      if (adhRes.ok) {
        adherenceMap[user.id] = await adhRes.json()
      }
    }))

    setSessions(sessionsMap)
    setWeeklyStats(statsMap)
    setPrayerLogs(prayerMap)
    setAdherence(adherenceMap)
    setLoading(false)
  }

  const generateSummary = useCallback(async (userId: string) => {
    setLoadingSummary(prev => ({ ...prev, [userId]: true }))
    const res = await fetch('/api/weekly-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (res.ok) {
      const data = await res.json()
      setWeeklySummaries(prev => ({ ...prev, [userId]: data }))
    }
    setLoadingSummary(prev => ({ ...prev, [userId]: false }))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-xl text-slate-500">بيتحمل...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-blue-800">لوحة متابعة المذاكرة</h1>
          <button
            onClick={() => { sessionStorage.removeItem('parentAuth'); router.push('/') }}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            اخرج
          </button>
        </div>

        {users.map(user => {
          const userSessions = sessions[user.id] || []
          const stats = weeklyStats[user.id]
          const summary = weeklySummaries[user.id]
          const userPrayerLogs = prayerLogs[user.id] || []

          // Build prayer log lookup by date
          const prayerByDate: Record<string, PrayerLog> = {}
          userPrayerLogs.forEach(log => { prayerByDate[log.prayer_date] = log })

          const past7 = getPastDays(7)
          const today = new Date().toISOString().split('T')[0]
          const todayLog = prayerByDate[today]
          const todayPrayerCount = todayLog
            ? PRAYER_KEYS.filter(k => todayLog[k]).length
            : 0
          const weeklyPrayerTotal = past7.reduce((acc, date) => {
            const log = prayerByDate[date]
            return acc + (log ? PRAYER_KEYS.filter(k => log[k]).length : 0)
          }, 0)

          const chartData = [...userSessions]
            .reverse()
            .slice(0, 14)
            .filter(s => s.reports?.length > 0)
            .map(s => ({
              date: new Date(s.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
              درجة: s.reports[0].total_score,
              subject: SUBJECT_LABELS[s.subject as Subject] || s.subject,
            }))

          const subjectData = stats?.subjectBreakdown?.map(sb => ({
            name: sb.label,
            عدد: sb.count,
          })) || []

          return (
            <div key={user.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-4xl">{user.grade <= 6 ? '🧒' : '👦'}</div>
                <div>
                  <h2 className="text-2xl font-bold text-blue-800">{user.name}</h2>
                  <p className="text-slate-500">الصف {gradeLabel(user.grade)} · {user.points} نقطة · 🔥 {user.streak} يوم</p>
                </div>
              </div>

              {/* Quiz Difficulty Control */}
              <div className="mb-6 bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-indigo-800">🎯 مستوى صعوبة الأسئلة</h3>
                    <p className="text-xs text-indigo-500 mt-0.5">اختار مستوى الأسئلة اللي هتيجي في الاختبار</p>
                  </div>
                  <div className="flex gap-2" role="group" aria-label="Quiz difficulty">
                    {(['easy', 'medium', 'hard'] as QuizDifficulty[]).map(level => {
                      const selected = user.quiz_difficulty === level
                      return (
                        <button
                          key={level}
                          onClick={() => updateDifficulty(user.id, level)}
                          disabled={savingDifficulty[user.id]}
                          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
                            selected
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-100'
                          }`}
                        >
                          {QUIZ_DIFFICULTY_LABELS[level]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Prayer Tracker Section */}
              <div className="mb-6 bg-teal-50 rounded-2xl p-5 border border-teal-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-teal-800">🤲 متابعة الصلوات</h3>
                  <div className="flex gap-3 text-sm">
                    <span className="bg-teal-100 text-teal-700 font-bold px-3 py-1 rounded-lg">
                      اليوم: {todayPrayerCount}/5
                    </span>
                    <span className="bg-emerald-100 text-emerald-700 font-bold px-3 py-1 rounded-lg">
                      الأسبوع: {weeklyPrayerTotal}/35
                    </span>
                  </div>
                </div>

                {/* 7-day prayer grid */}
                <div className="overflow-x-auto">
                  <table className="w-full text-center text-xs border-separate border-spacing-1">
                    <thead>
                      <tr>
                        <th className="text-slate-400 font-medium w-12 text-right">الصلاة</th>
                        {past7.map(date => {
                          const d = new Date(date)
                          const isToday = date === today
                          return (
                            <th key={date} className={`font-medium w-10 ${isToday ? 'text-teal-700' : 'text-slate-400'}`}>
                              <div>{DAY_LABELS[d.getDay()].slice(0, 3)}</div>
                              <div className={`text-[10px] ${isToday ? 'font-bold' : ''}`}>{d.getDate()}</div>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {PRAYER_KEYS.map(prayer => (
                        <tr key={prayer}>
                          <td className="text-right text-slate-600 font-semibold pr-1">{PRAYER_LABELS[prayer]}</td>
                          {past7.map(date => {
                            const log = prayerByDate[date]
                            const done = log?.[prayer] ?? false
                            return (
                              <td key={date}>
                                <div className={`w-7 h-7 rounded-full mx-auto flex items-center justify-center text-sm ${
                                  done ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-300'
                                }`}>
                                  {done ? '✓' : '·'}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Today's prayer summary */}
                {todayLog && (
                  <div className="mt-4 flex gap-2 flex-wrap">
                    {PRAYER_KEYS.map(p => (
                      <span
                        key={p}
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          todayLog[p]
                            ? 'bg-teal-500 text-white'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {PRAYER_LABELS[p]} {todayLog[p] ? '✓' : '✗'}
                      </span>
                    ))}
                  </div>
                )}

                {!todayLog && (
                  <p className="text-teal-600 text-sm mt-3 text-center">لم يتم تسجيل أي صلوات اليوم بعد</p>
                )}
              </div>

              {/* Weekly Schedule Adherence */}
              {(() => {
                const adh = adherence[user.id]
                if (!adh) return null
                if (!adh.hasSchedule) {
                  return (
                    <div className="mb-6 bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
                      <h3 className="text-lg font-bold text-indigo-800 mb-2">📅 جدول المذاكرة الأسبوعي</h3>
                      <p className="text-indigo-600 text-sm text-center">لسه مفيش جدول مذاكرة متحدد</p>
                    </div>
                  )
                }

                // Summary counters
                const totalScheduled = adh.days.reduce((a, d) => a + d.scheduled.length, 0)
                const totalDone = adh.days.reduce(
                  (a, d) => a + d.scheduled.filter(s => d.studied.includes(s)).length,
                  0,
                )
                const totalMissed = adh.days.reduce((a, d) => a + d.missed.length, 0)
                const todayDay = adh.days.find(d => d.isToday) || null
                const todayPending = todayDay
                  ? todayDay.scheduled.filter(s => !todayDay.studied.includes(s))
                  : []

                // Subject chip — explicit label, not just emoji
                type ChipStatus = 'done' | 'missed' | 'pending' | 'upcoming' | 'extra'
                const chipClass: Record<ChipStatus, string> = {
                  done:     'bg-emerald-100 text-emerald-800 border-emerald-300',
                  missed:   'bg-red-100 text-red-800 border-red-300 line-through',
                  pending:  'bg-slate-100 text-slate-700 border-slate-300',
                  upcoming: 'bg-white text-slate-400 border-slate-200',
                  extra:    'bg-amber-100 text-amber-800 border-amber-300',
                }
                const chipIcon: Record<ChipStatus, string> = {
                  done: '✓', missed: '✗', pending: '⏳', upcoming: '·', extra: '+',
                }
                const renderChip = (subj: string, status: ChipStatus, keyPrefix = '') => (
                  <span
                    key={`${keyPrefix}${subj}-${status}`}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${chipClass[status]}`}
                  >
                    <span className="text-[11px] font-bold">{chipIcon[status]}</span>
                    <span>{SUBJECT_EMOJIS[subj] ?? '📚'}</span>
                    <span>{SUBJECT_LABELS[subj as Subject] || subj}</span>
                  </span>
                )

                return (
                  <div className="mb-6 bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
                    <h3 className="text-lg font-bold text-indigo-800 mb-4">📅 جدول المذاكرة الأسبوعي</h3>

                    {/* Summary cards */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                        <div className="text-2xl mb-0.5">✅</div>
                        <div className="text-2xl font-black text-emerald-700 leading-none">
                          {totalDone}
                          <span className="text-sm font-bold text-emerald-500">/{totalScheduled}</span>
                        </div>
                        <div className="text-[11px] text-emerald-700 mt-1 font-semibold">اتذاكر</div>
                      </div>
                      <div className={`rounded-xl p-3 text-center border ${totalMissed > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="text-2xl mb-0.5">{totalMissed > 0 ? '❌' : '🎉'}</div>
                        <div className={`text-2xl font-black leading-none ${totalMissed > 0 ? 'text-red-700' : 'text-slate-400'}`}>
                          {totalMissed}
                        </div>
                        <div className={`text-[11px] mt-1 font-semibold ${totalMissed > 0 ? 'text-red-700' : 'text-slate-500'}`}>فات</div>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                        <div className="text-2xl mb-0.5">⏳</div>
                        <div className="text-2xl font-black text-amber-700 leading-none">
                          {todayDay && todayDay.scheduled.length > 0 ? (
                            <>
                              {todayPending.length}
                              <span className="text-sm font-bold text-amber-500">/{todayDay.scheduled.length}</span>
                            </>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </div>
                        <div className="text-[11px] text-amber-700 mt-1 font-semibold">النهاردة لسه</div>
                      </div>
                    </div>

                    {/* Per-day list */}
                    <div className="space-y-2">
                      {adh.days.map(day => {
                        const d = new Date(day.date)
                        const dateLabel = d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })
                        const doneSubjects = day.scheduled.filter(s => day.studied.includes(s))
                        const missedSubjects = day.missed
                        const pendingSubjects = day.isToday
                          ? day.scheduled.filter(s => !day.studied.includes(s))
                          : []

                        // Row background + status badge
                        let rowTone = 'bg-white border-slate-100'
                        let badge: { text: string; className: string } | null = null
                        if (day.isToday) {
                          rowTone = 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200'
                          badge = { text: 'النهاردة', className: 'bg-indigo-500 text-white' }
                        } else if (day.isFuture) {
                          rowTone = 'bg-white/60 border-slate-100'
                          badge = { text: 'قادم', className: 'bg-slate-200 text-slate-600' }
                        } else if (missedSubjects.length > 0) {
                          rowTone = 'bg-red-50 border-red-200'
                          badge = { text: 'فات', className: 'bg-red-500 text-white' }
                        } else if (day.scheduled.length === 0 && day.extras.length === 0) {
                          rowTone = 'bg-slate-50 border-slate-100'
                          badge = { text: 'إجازة', className: 'bg-slate-200 text-slate-500' }
                        } else {
                          rowTone = 'bg-emerald-50 border-emerald-200'
                          badge = { text: 'تم', className: 'bg-emerald-500 text-white' }
                        }

                        return (
                          <div key={day.date} className={`rounded-xl p-3 border ${rowTone}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold text-sm ${day.isToday ? 'text-indigo-900' : 'text-slate-700'}`}>
                                  {DAY_LABELS[day.dayOfWeek]}
                                </span>
                                <span className="text-xs text-slate-400">{dateLabel}</span>
                              </div>
                              {badge && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.className}`}>
                                  {badge.text}
                                </span>
                              )}
                            </div>

                            {day.scheduled.length === 0 && day.extras.length === 0 ? (
                              <p className="text-xs text-slate-400 text-center py-1">مفيش مذاكرة مجدولة</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {day.isFuture
                                  ? day.scheduled.map(s => renderChip(s, 'upcoming'))
                                  : (
                                    <>
                                      {doneSubjects.map(s => renderChip(s, 'done'))}
                                      {missedSubjects.map(s => renderChip(s, 'missed'))}
                                      {pendingSubjects.map(s => renderChip(s, 'pending'))}
                                      {day.extras.map(s => renderChip(s, 'extra', 'ex-'))}
                                    </>
                                  )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Legend */}
                    <div className="mt-4 pt-3 border-t border-indigo-100 flex flex-wrap gap-2 text-[11px] text-slate-600 justify-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-semibold">✓ اتذاكر</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 border border-red-300 text-red-800 font-semibold">✗ فات</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-700 font-semibold">⏳ لسه النهاردة</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-400 font-semibold">· قادم</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 font-semibold">+ إضافي</span>
                    </div>
                  </div>
                )
              })()}

              {/* Weekly Stats */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
                  {[
                    { label: 'جلسات الأسبوع ده', value: stats.sessionCount },
                    { label: 'ساعات المذاكرة', value: stats.totalMinutes >= 60 ? `${Math.floor(stats.totalMinutes/60)}س ${stats.totalMinutes%60}د` : `${stats.totalMinutes} د` },
                    { label: 'متوسط الدرجات', value: `${stats.avgScore}%` },
                    { label: 'أعلى درجة', value: `${stats.maxScore}%` },
                    { label: 'أدنى درجة', value: `${stats.minScore}%` },
                  ].map(item => (
                    <div key={item.label} className="bg-blue-50 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-blue-700">{item.value}</div>
                      <div className="text-xs text-slate-500 mt-1">{item.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Score Chart */}
              {chartData.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-700 mb-3">آخر الدرجات</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="درجة" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Subject Breakdown */}
              {subjectData.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-700 mb-3">المواد اللي اتذاكرت الأسبوع ده</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={subjectData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="عدد" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Weekly AI Summary */}
              <div className="border-t border-slate-100 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-slate-700">الملخص الأسبوعي بالذكاء الاصطناعي</h3>
                  <button
                    onClick={() => generateSummary(user.id)}
                    disabled={loadingSummary[user.id]}
                    className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {loadingSummary[user.id] ? 'بيتم التوليد...' : '🔄 اعمل ملخص'}
                  </button>
                </div>

                {summary ? (
                  <div className="space-y-4">
                    <p className="text-slate-700 leading-relaxed bg-blue-50 rounded-xl p-4">{summary.summary}</p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="bg-green-50 rounded-xl p-4">
                        <h4 className="font-semibold text-green-700 mb-2">✅ نقط القوة</h4>
                        <ul className="space-y-1">{summary.strengths.map((s, i) => <li key={i} className="text-sm text-slate-600">• {s}</li>)}</ul>
                      </div>
                      <div className="bg-orange-50 rounded-xl p-4">
                        <h4 className="font-semibold text-orange-700 mb-2">⚠️ نقط محتاجة تحسين</h4>
                        <ul className="space-y-1">{summary.weaknesses.map((s, i) => <li key={i} className="text-sm text-slate-600">• {s}</li>)}</ul>
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                      <h4 className="font-semibold text-purple-700 mb-2">💡 نصايح وتوصيات</h4>
                      <ul className="space-y-1">{summary.recommendations.map((s, i) => <li key={i} className="text-sm text-slate-600">• {s}</li>)}</ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">اضغط على &quot;اعمل ملخص&quot; عشان تاخد تقرير أسبوعي مفصل</p>
                )}
              </div>

              {/* Recent Sessions */}
              {userSessions.length > 0 && (
                <div className="border-t border-slate-100 pt-6 mt-6">
                  <h3 className="text-lg font-semibold text-slate-700 mb-4">آخر الجلسات (آخر 30 يوم)</h3>
                  <div className="space-y-3">
                    {userSessions.slice(0, 5).map(session => (
                      <button key={session.id} onClick={() => openSessionModal(session.id)} className="w-full flex items-center justify-between bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors cursor-pointer text-right">
                        <div>
                          <span className="font-medium text-slate-700">{SUBJECT_LABELS[session.subject as Subject] || session.subject}</span>
                          <p className="text-xs text-slate-400 mt-0.5">{new Date(session.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                        {session.reports?.length > 0 && (
                          <div className={`text-lg font-bold ${session.reports[0].total_score >= 80 ? 'text-green-600' : session.reports[0].total_score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {session.reports[0].total_score}%
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Session Detail Modal */}
      {(modalLoading || selectedSession) && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={closeModal}>
          <div
            className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            dir="rtl"
            onClick={e => e.stopPropagation()}
          >
            {modalLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-5xl animate-bounce">📋</div>
              </div>
            ) : selectedSession ? (() => {
              const imageUrls: string[] = (() => {
                if (!selectedSession.image_url) return []
                try {
                  const parsed = JSON.parse(selectedSession.image_url)
                  if (Array.isArray(parsed)) return parsed.filter((u: unknown) => typeof u === 'string' && u.length > 0)
                } catch { /* not JSON */ }
                return [selectedSession.image_url]
              })()

              const report = selectedSession.reports?.[0] ?? null
              const score = report?.total_score ?? null
              const isExcellent = score !== null && score >= 80
              const isGood = score !== null && score >= 60
              const gradientKey = isExcellent ? 'excellent' : isGood ? 'good' : 'low'
              const scoreEmoji = isExcellent ? '🌟' : isGood ? '👍' : '💪'
              const allAnswers: AnswerReview[] = report?.all_answers_review ?? []
              const correctCount = allAnswers.filter(a => a.is_correct).length

              return (
                <div className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{SUBJECT_EMOJIS[selectedSession.subject] ?? '📚'}</span>
                      <div>
                        <h2 className="text-lg font-bold text-slate-800">
                          {SUBJECT_LABELS[selectedSession.subject as Subject] ?? selectedSession.subject}
                        </h2>
                        <p className="text-xs text-slate-400">
                          {new Date(selectedSession.created_at).toLocaleDateString('ar-EG', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-500 text-sm transition-colors"
                        title="حذف الجلسة"
                      >
                        🗑
                      </button>
                      <button onClick={closeModal} className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-500 text-sm transition-colors">✕</button>
                    </div>
                  </div>

                  {/* Description + Duration */}
                  {(selectedSession.description || formatMinutes(selectedSession.duration_minutes)) && (
                    <div className="bg-white rounded-xl p-3 shadow-sm flex items-center justify-between">
                      {selectedSession.description && <p className="text-xs text-slate-500 flex-1">{selectedSession.description}</p>}
                      {formatMinutes(selectedSession.duration_minutes) && (
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-xl mr-2">⏱ {formatMinutes(selectedSession.duration_minutes)}</span>
                      )}
                    </div>
                  )}

                  {/* Assignment Images */}
                  {imageUrls.length > 0 && (
                    <div className="bg-white rounded-xl p-3 shadow-sm">
                      <h3 className="font-bold text-slate-700 mb-2 text-sm">🖼️ صور الواجب</h3>
                      <div className={`grid gap-2 ${imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {imageUrls.map((url, i) => (
                          <button key={i} onClick={() => setLightboxUrl(url)} className="relative overflow-hidden rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`صورة ${i + 1}`} className={`w-full object-cover ${imageUrls.length === 1 ? 'max-h-48' : 'h-28'}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Score Card */}
                  {score !== null ? (
                    <>
                      <div className={`bg-gradient-to-br ${SCORE_GRADIENT[gradientKey]} rounded-2xl p-5 text-center text-white shadow-xl`}>
                        <div className="text-4xl mb-1">{scoreEmoji}</div>
                        <div className="text-6xl font-black mb-1">{score}</div>
                        <div className="text-white/80 text-sm mb-1">من 100</div>
                        {allAnswers.length > 0 && (
                          <div className="text-xs text-white/70">{correctCount} صح من {allAnswers.length} سؤال</div>
                        )}
                      </div>

                      {/* Feedback */}
                      {report.feedback && (
                        <div className="bg-white rounded-xl p-4 shadow-sm border-2 border-blue-50">
                          <h3 className="font-black text-slate-700 mb-2 flex items-center gap-2 text-sm">
                            <span>💬</span> رأي المدرس
                          </h3>
                          <p className="text-slate-600 leading-relaxed text-sm">{report.feedback}</p>
                        </div>
                      )}

                      {/* Q&A Review */}
                      {allAnswers.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                            <span className="font-black text-slate-700 flex items-center gap-2 text-sm">
                              <span>📋</span> الأسئلة والإجابات
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isExcellent ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                              {correctCount}/{allAnswers.length}
                            </span>
                          </div>
                          <div className="divide-y divide-slate-50">
                            {allAnswers.map((a, i) => (
                              <div key={i} className={`p-3 ${a.is_correct ? 'bg-green-50' : 'bg-red-50'}`}>
                                <div className="flex items-start gap-2 mb-1">
                                  <span className="text-lg flex-shrink-0">{a.is_correct ? '✅' : '❌'}</span>
                                  <p className="text-sm font-bold text-slate-700 leading-snug">{a.question_text}</p>
                                </div>
                                <div className="mr-7 space-y-1">
                                  <p className={`text-sm ${a.is_correct ? 'text-green-700' : 'text-red-600'}`}>
                                    إجابتك: <span className="font-bold">{a.student_answer || '—'}</span>
                                  </p>
                                  {!a.is_correct && (
                                    <p className="text-sm text-green-700">
                                      الصح: <span className="font-bold">{a.correct_answer}</span>
                                    </p>
                                  )}
                                  {a.explanation && (
                                    <p className="text-xs text-slate-500 bg-white rounded-xl p-2 mt-1 leading-relaxed">{a.explanation}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* No answers available */}
                      {allAnswers.length === 0 && (
                        <div className="bg-white rounded-xl p-4 shadow-sm text-center text-slate-400 text-sm">
                          تفاصيل الإجابات مش متاحة للجلسات القديمة
                        </div>
                      )}

                      {/* Suggestions */}
                      {report.suggestions && report.suggestions.length > 0 && (
                        <div className="bg-white rounded-xl p-4 shadow-sm border-2 border-purple-50">
                          <h3 className="font-black text-slate-700 mb-2 flex items-center gap-2 text-sm">
                            <span>💡</span> نصايح عشان تبقى أحسن
                          </h3>
                          <ul className="space-y-2">
                            {report.suggestions.map((s, i) => (
                              <li key={i} className="flex gap-2 text-sm text-slate-600 bg-purple-50 rounded-xl p-2">
                                <span className="text-purple-400 flex-shrink-0 font-bold">{i + 1}.</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-white rounded-xl p-6 shadow-sm text-center">
                      <div className="text-4xl mb-2">📝</div>
                      <p className="text-slate-500 font-medium">الجلسة دي من غير اختبار</p>
                      <p className="text-slate-400 text-sm mt-1">ما اتعملش اختبار في الجلسة دي</p>
                    </div>
                  )}
                </div>
              )
            })() : null}
          </div>
        </div>
      )}

      {/* Delete Confirmation Overlay */}
      {showDeleteConfirm && selectedSession && (
        <div className="fixed inset-0 z-[55] bg-black/60 flex items-center justify-center p-4" dir="rtl" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <h3 className="text-lg font-bold text-red-700">متأكد إنك عايز تحذف الجلسة دي؟</h3>
              <p className="text-sm text-red-500 mt-2">هيتم حذف كل الأسئلة والإجابات والتقرير - مش هتقدر ترجعهم</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleDeleteSession(selectedSession.id)}
                disabled={deleting}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-bold rounded-xl transition-colors"
              >
                {deleting ? '⏳ بيتم الحذف...' : '🗑 أيوه، احذف'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors"
              >
                لا، ارجع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <button onClick={() => setLightboxUrl(null)} className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/20 text-white text-xl flex items-center justify-center">✕</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxUrl} alt="صورة مكبرة" className="max-w-full max-h-[85vh] rounded-2xl object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </main>
  )
}
