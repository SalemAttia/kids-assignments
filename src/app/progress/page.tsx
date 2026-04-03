'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { SUBJECT_LABELS } from '@/types'
import type { Subject } from '@/types'
import BottomNav from '@/components/BottomNav'

interface Session {
  id: string
  subject: string
  description: string
  duration_minutes: number
  created_at: string
  reports: Array<{ total_score: number }>
}

function formatMinutes(m: number) {
  if (!m || m === 0) return '—'
  if (m < 60) return `${m} د`
  return `${Math.floor(m / 60)}س ${m % 60 > 0 ? `${m % 60}د` : ''}`
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-green-100 text-green-700' : score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
  const emoji = score >= 80 ? '🌟' : score >= 60 ? '👍' : '💪'
  return <span className={`px-3 py-1 rounded-xl text-sm font-bold ${color}`}>{emoji} {score}%</span>
}

export default function ProgressPage() {
  const router = useRouter()
  const { userId, loaded } = useCurrentUser()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    if (loaded && !userId) { router.replace('/'); return }
    if (userId) {
      Promise.all([
        fetch(`/api/reports/${userId}`).then(r => r.json()),
        fetch(`/api/daily-stats/${userId}`).then(r => r.json()),
      ]).then(([reports, stats]) => {
        setSessions(reports.sessions || [])
        setUserName(stats.user?.name || '')
        setLoading(false)
      }).catch(() => setLoading(false))
    }
  }, [loaded, userId, router])

  if (!loaded || loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="text-5xl animate-bounce">📊</div>
    </div>
  )

  const totalMinutes = sessions.reduce((a, s) => a + (s.duration_minutes || 0), 0)
  const scored = sessions.filter(s => s.reports?.length > 0)
  const avgScore = scored.length ? Math.round(scored.reduce((a, s) => a + s.reports[0].total_score, 0) / scored.length) : 0
  const subjectCounts = sessions.reduce((acc, s) => { acc[s.subject] = (acc[s.subject] || 0) + 1; return acc }, {} as Record<string, number>)
  const topSubject = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1])[0]

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4" dir="rtl">
      <div className="max-w-md mx-auto pt-2 pb-28">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/hub')}
            className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-slate-500 text-lg"
          >←</button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">تقدمي وأدائي 📊</h1>
            <p className="text-xs text-slate-400">{userName} — آخر 30 يوم</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <div className="text-3xl mb-1">⏱️</div>
            <div className="text-lg font-bold text-blue-600">{formatMinutes(totalMinutes)}</div>
            <div className="text-xs text-slate-400 mt-0.5">إجمالي وقت المذاكرة</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <div className="text-3xl mb-1">🎯</div>
            <div className="text-lg font-bold text-purple-600">{avgScore}%</div>
            <div className="text-xs text-slate-400 mt-0.5">متوسط الدرجات</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <div className="text-3xl mb-1">📚</div>
            <div className="text-lg font-bold text-green-600">{sessions.length}</div>
            <div className="text-xs text-slate-400 mt-0.5">إجمالي الجلسات</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <div className="text-3xl mb-1">🏆</div>
            <div className="text-lg font-bold text-orange-500">{topSubject ? SUBJECT_LABELS[topSubject[0] as Subject] || topSubject[0] : '—'}</div>
            <div className="text-xs text-slate-400 mt-0.5">المادة اللي ذاكرتها أكتر</div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-700">آخر الجلسات</h2>
          </div>
          {sessions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-slate-400">مفيش جلسات لسه</p>
              <button onClick={() => router.push('/study')} className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-xl font-bold text-sm">ابدأ دلوقتي!</button>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {sessions.map(s => (
                <div key={s.id} className="p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-700 text-sm">{SUBJECT_LABELS[s.subject as Subject] || s.subject}</span>
                      {s.duration_minutes > 0 && (
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">⏱ {formatMinutes(s.duration_minutes)}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{new Date(s.created_at).toLocaleDateString('ar-EG', { month: 'long', day: 'numeric' })}</p>
                  </div>
                  <div className="mr-3">
                    {s.reports?.length > 0
                      ? <ScoreBadge score={s.reports[0].total_score} />
                      : <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-xl">من غير اختبار</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Start New Study */}
        <button
          onClick={() => router.push('/study')}
          className="w-full mt-4 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg font-bold rounded-2xl shadow-lg active:scale-95 transition-all"
        >
          📚 ابدأ مذاكرة جديدة
        </button>

      </div>

      <BottomNav />
    </main>
  )
}
