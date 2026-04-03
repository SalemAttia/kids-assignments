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

interface HelpSession {
  id: string
  subject: string
  question: string
  explanation: string
  created_at: string
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

const SUBJECT_EMOJIS: Record<string, string> = {
  arabic: '📖', math: '🔢', science: '🔬', english: '💬',
  social_studies: '🌍', religion: '🌙', computer: '💻', art: '🎨', other: '📚',
}

export default function ProgressPage() {
  const router = useRouter()
  const { userId, loaded } = useCurrentUser()
  const [sessions, setSessions] = useState<Session[]>([])
  const [helpSessions, setHelpSessions] = useState<HelpSession[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [tab, setTab] = useState<'sessions' | 'explanations'>('sessions')
  const [expandedHelp, setExpandedHelp] = useState<string | null>(null)

  useEffect(() => {
    if (loaded && !userId) { router.replace('/'); return }
    if (userId) {
      Promise.all([
        fetch(`/api/reports/${userId}`).then(r => r.json()),
        fetch(`/api/daily-stats/${userId}`).then(r => r.json()),
        fetch(`/api/help-sessions/${userId}`).then(r => r.json()),
      ]).then(([reports, stats, help]) => {
        setSessions(reports.sessions || [])
        setUserName(stats.user?.name || '')
        setHelpSessions(help.sessions || [])
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

        {/* Tabs */}
        <div className="flex bg-white rounded-2xl p-1 shadow-sm mb-4 gap-1">
          <button
            onClick={() => setTab('sessions')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'sessions' ? 'bg-blue-500 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
          >
            📚 جلساتي
          </button>
          <button
            onClick={() => setTab('explanations')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'explanations' ? 'bg-violet-500 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
          >
            🤖 شروحاتي
          </button>
        </div>

        {/* Sessions Tab */}
        {tab === 'sessions' && (
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
                  <button
                    key={s.id}
                    onClick={() => router.push(`/session/${s.id}`)}
                    className="w-full p-4 flex items-center justify-between text-right hover:bg-slate-50 active:bg-slate-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-700 text-sm">{SUBJECT_LABELS[s.subject as Subject] || s.subject}</span>
                        {s.duration_minutes > 0 && (
                          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">⏱ {formatMinutes(s.duration_minutes)}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{new Date(s.created_at).toLocaleDateString('ar-EG', { month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div className="flex items-center gap-2 mr-3">
                      {s.reports?.length > 0
                        ? <ScoreBadge score={s.reports[0].total_score} />
                        : <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-xl">من غير اختبار</span>
                      }
                      <span className="text-slate-300 text-sm">›</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Explanations Tab */}
        {tab === 'explanations' && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-700">شروحات المساعد الذكي</h2>
            </div>
            {helpSessions.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-5xl mb-3">🤖</div>
                <p className="text-slate-400">مفيش شروحات لسه</p>
                <button onClick={() => router.push('/help')} className="mt-4 px-6 py-2 bg-violet-500 text-white rounded-xl font-bold text-sm">اسأل المساعد!</button>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {helpSessions.map(h => (
                  <div key={h.id} className="overflow-hidden">
                    <button
                      onClick={() => setExpandedHelp(expandedHelp === h.id ? null : h.id)}
                      className="w-full p-4 flex items-start justify-between text-right hover:bg-slate-50 active:bg-slate-100 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{SUBJECT_EMOJIS[h.subject] ?? '📚'}</span>
                          <span className="font-semibold text-slate-700 text-sm">{SUBJECT_LABELS[h.subject as Subject] || h.subject}</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-snug line-clamp-2">{h.question || 'سؤال من صور'}</p>
                        <p className="text-xs text-slate-400 mt-1">{new Date(h.created_at).toLocaleDateString('ar-EG', { month: 'long', day: 'numeric' })}</p>
                      </div>
                      <span className="text-slate-300 text-lg mr-2 flex-shrink-0 mt-1">{expandedHelp === h.id ? '▲' : '▼'}</span>
                    </button>
                    {expandedHelp === h.id && (
                      <div className="px-4 pb-4">
                        {h.question && (
                          <div className="bg-slate-50 rounded-xl p-3 mb-3">
                            <p className="text-xs text-slate-400 mb-1">سؤالك هو</p>
                            <p className="text-sm text-slate-700">{h.question}</p>
                          </div>
                        )}
                        <div className="bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-100 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">🤖</span>
                            <span className="font-bold text-violet-700 text-xs">شرح المساعد الذكي</span>
                          </div>
                          <p className="text-slate-700 leading-relaxed text-sm whitespace-pre-wrap">{h.explanation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
