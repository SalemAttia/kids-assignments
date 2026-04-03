'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SUBJECT_LABELS } from '@/types'
import type { User, Subject } from '@/types'
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

const PRAYER_KEYS: PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
const PRAYER_LABELS: Record<PrayerKey, string> = {
  fajr: 'فجر', dhuhr: 'ظهر', asr: 'عصر', maghrib: 'مغرب', isha: 'عشاء',
}
const DAY_LABELS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

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
  const [loading, setLoading] = useState(true)

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

    await Promise.all(usersData.map(async (user) => {
      const [sessRes, statsRes, prayerRes] = await Promise.all([
        fetch(`/api/reports/${user.id}`),
        fetch(`/api/reports/weekly/${user.id}`),
        fetch(`/api/prayers/${user.id}?days=7`),
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
    }))

    setSessions(sessionsMap)
    setWeeklyStats(statsMap)
    setPrayerLogs(prayerMap)
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
                <div className="text-4xl">{user.grade === 6 ? '🧒' : '👦'}</div>
                <div>
                  <h2 className="text-2xl font-bold text-blue-800">{user.name}</h2>
                  <p className="text-slate-500">الصف {user.grade === 6 ? 'السادسة ابتدائي' : 'التالتة إعدادي'} · {user.points} نقطة · 🔥 {user.streak} يوم</p>
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
                      <div key={session.id} className="flex items-center justify-between bg-slate-50 rounded-xl p-4">
                        <div>
                          <span className="font-medium text-slate-700">{SUBJECT_LABELS[session.subject as Subject] || session.subject}</span>
                          <p className="text-xs text-slate-400 mt-0.5">{new Date(session.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                        {session.reports?.length > 0 && (
                          <div className={`text-lg font-bold ${session.reports[0].total_score >= 80 ? 'text-green-600' : session.reports[0].total_score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {session.reports[0].total_score}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </main>
  )
}
