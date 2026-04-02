'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
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

export default function ParentDashboard() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [sessions, setSessions] = useState<Record<string, SessionWithReport[]>>({})
  const [weeklyStats, setWeeklyStats] = useState<Record<string, WeeklyStats>>({})
  const [weeklySummaries, setWeeklySummaries] = useState<Record<string, WeeklySummaryData | null>>({})
  const [loadingSummary, setLoadingSummary] = useState<Record<string, boolean>>({})
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
    const { data: usersData } = await supabase.from('users').select('*')
    if (!usersData) { setLoading(false); return }
    setUsers(usersData)

    const sessionsMap: Record<string, SessionWithReport[]> = {}
    const statsMap: Record<string, WeeklyStats> = {}

    await Promise.all(usersData.map(async (user) => {
      const [sessRes, statsRes] = await Promise.all([
        fetch(`/api/reports/${user.id}`),
        fetch(`/api/reports/weekly/${user.id}`),
      ])
      if (sessRes.ok) {
        const d = await sessRes.json()
        sessionsMap[user.id] = d.sessions || []
      }
      if (statsRes.ok) {
        statsMap[user.id] = await statsRes.json()
      }
    }))

    setSessions(sessionsMap)
    setWeeklyStats(statsMap)
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
      <p className="text-xl text-slate-500">جاري التحميل...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-blue-800">لوحة متابعة الدراسة</h1>
          <button
            onClick={() => { sessionStorage.removeItem('parentAuth'); router.push('/') }}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            تسجيل الخروج
          </button>
        </div>

        {users.map(user => {
          const userSessions = sessions[user.id] || []
          const stats = weeklyStats[user.id]
          const summary = weeklySummaries[user.id]

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
                  <p className="text-slate-500">الصف {user.grade === 6 ? 'السادس الابتدائي' : 'الثالث الإعدادي'} · {user.points} نقطة · 🔥 {user.streak} يوم</p>
                </div>
              </div>

              {/* Weekly Stats */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'جلسات هذا الأسبوع', value: stats.sessionCount },
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
                  <h3 className="text-lg font-semibold text-slate-700 mb-3">الدرجات الأخيرة</h3>
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
                  <h3 className="text-lg font-semibold text-slate-700 mb-3">المواد المدروسة هذا الأسبوع</h3>
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
                    {loadingSummary[user.id] ? 'جاري التوليد...' : '🔄 توليد ملخص'}
                  </button>
                </div>

                {summary ? (
                  <div className="space-y-4">
                    <p className="text-slate-700 leading-relaxed bg-blue-50 rounded-xl p-4">{summary.summary}</p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="bg-green-50 rounded-xl p-4">
                        <h4 className="font-semibold text-green-700 mb-2">✅ نقاط القوة</h4>
                        <ul className="space-y-1">{summary.strengths.map((s, i) => <li key={i} className="text-sm text-slate-600">• {s}</li>)}</ul>
                      </div>
                      <div className="bg-orange-50 rounded-xl p-4">
                        <h4 className="font-semibold text-orange-700 mb-2">⚠️ نقاط تحتاج تحسين</h4>
                        <ul className="space-y-1">{summary.weaknesses.map((s, i) => <li key={i} className="text-sm text-slate-600">• {s}</li>)}</ul>
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                      <h4 className="font-semibold text-purple-700 mb-2">💡 توصيات</h4>
                      <ul className="space-y-1">{summary.recommendations.map((s, i) => <li key={i} className="text-sm text-slate-600">• {s}</li>)}</ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">اضغط على &quot;توليد ملخص&quot; للحصول على تقرير أسبوعي مفصل</p>
                )}
              </div>

              {/* Recent Sessions */}
              {userSessions.length > 0 && (
                <div className="border-t border-slate-100 pt-6 mt-6">
                  <h3 className="text-lg font-semibold text-slate-700 mb-4">آخر الجلسات (30 يوم)</h3>
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
