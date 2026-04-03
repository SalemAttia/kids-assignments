'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface DailyStats {
  user: { name: string; points: number; streak: number; grade: number }
  today: { sessionCount: number; subjectCount: number; subjects: { key: string; label: string }[]; totalMinutes: number }
  week: { sessionCount: number; totalMinutes: number; dailyBreakdown: { label: string; minutes: number; sessions: number }[] }
}

function formatMinutes(m: number) {
  if (m === 0) return 'مفيش لسه'
  if (m < 60) return `${m} دقيقة`
  const h = Math.floor(m / 60)
  const mins = m % 60
  return mins > 0 ? `${h} ساعة و${mins} دقيقة` : `${h} ساعة`
}

const GOAL_MINUTES = 60 // daily goal

export default function HubPage() {
  const router = useRouter()
  const { userId, loaded, clearUser } = useCurrentUser()
  const [stats, setStats] = useState<DailyStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (loaded && !userId) { router.replace('/'); return }
    if (userId) {
      fetch(`/api/daily-stats/${userId}`)
        .then(r => r.json())
        .then(d => { setStats(d); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [loaded, userId, router])

  if (!loaded || loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-bounce">📚</div>
        <p className="text-slate-500 font-medium">بيتحمل...</p>
      </div>
    </div>
  )

  const today = stats?.today
  const week = stats?.week
  const user = stats?.user
  const progressPct = Math.min(100, Math.round(((today?.totalMinutes || 0) / GOAL_MINUTES) * 100))
  const goalReached = (today?.totalMinutes || 0) >= GOAL_MINUTES

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4" dir="rtl">
      <div className="max-w-md mx-auto pt-4 pb-24">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-slate-500">أهلاً يا</p>
            <h1 className="text-2xl font-bold text-slate-800">{user?.name} 👋</h1>
          </div>
          <button
            onClick={() => { clearUser(); router.push('/') }}
            className="text-xs text-slate-400 hover:text-slate-600 bg-white rounded-xl px-3 py-2 shadow-sm"
          >
            تغيير
          </button>
        </div>

        {/* Points & Streak */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <div className="text-3xl mb-1">⭐</div>
            <div className="text-xl font-bold text-yellow-500">{user?.points || 0}</div>
            <div className="text-xs text-slate-400 mt-0.5">نقطة</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <div className="text-3xl mb-1">🔥</div>
            <div className="text-xl font-bold text-orange-500">{user?.streak || 0}</div>
            <div className="text-xs text-slate-400 mt-0.5">يوم متتالي</div>
          </div>
        </div>

        {/* Daily Goal */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-700">هدف النهارده</h2>
            <span className="text-sm font-medium text-blue-600">{goalReached ? '🎉 برافو عليك!' : `${progressPct}%`}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 mb-3">
            <div
              className={`h-3 rounded-full transition-all duration-700 ${goalReached ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>وقت المذاكرة: <span className="font-semibold text-slate-600">{formatMinutes(today?.totalMinutes || 0)}</span></span>
            <span>الهدف: {formatMinutes(GOAL_MINUTES)}</span>
          </div>
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <div className="text-2xl mb-1">📖</div>
            <div className="text-xl font-bold text-blue-600">{today?.subjectCount || 0}</div>
            <div className="text-xs text-slate-400">مادة النهارده</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <div className="text-2xl mb-1">✅</div>
            <div className="text-xl font-bold text-green-600">{today?.sessionCount || 0}</div>
            <div className="text-xs text-slate-400">جلسة النهارده</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <div className="text-2xl mb-1">📅</div>
            <div className="text-xl font-bold text-purple-600">{week?.sessionCount || 0}</div>
            <div className="text-xs text-slate-400">جلسة الأسبوع</div>
          </div>
        </div>

        {/* Today's Subjects */}
        {(today?.subjects?.length || 0) > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <p className="text-xs text-slate-400 mb-3 font-medium">ذاكرت النهارده</p>
            <div className="flex flex-wrap gap-2">
              {today!.subjects.map(s => (
                <span key={s.key} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium">
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Weekly bar chart (simple CSS) */}
        {(week?.dailyBreakdown?.length || 0) > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
            <p className="text-xs text-slate-400 mb-3 font-medium">مذاكرة الأسبوع ده (بالدقائق)</p>
            <div className="flex items-end gap-1.5 h-20">
              {week!.dailyBreakdown.map((d, i) => {
                const maxMins = Math.max(...week!.dailyBreakdown.map(x => x.minutes), 1)
                const pct = Math.round((d.minutes / maxMins) * 100)
                const isToday = i === new Date().getDay()
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center" style={{ height: '64px' }}>
                      <div
                        className={`w-full rounded-t-lg transition-all ${isToday ? 'bg-blue-500' : 'bg-slate-200'}`}
                        style={{ height: `${Math.max(pct, d.minutes > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                    <span className={`text-[10px] leading-tight text-center break-words w-full ${isToday ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>{d.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/study')}
            className="w-full py-5 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <span>📚</span>
            <span>ابدأ مذاكرة جديدة</span>
          </button>

          <button
            onClick={() => router.push('/help')}
            className="w-full py-4 bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <span>🤖</span>
            <span>ساعدني في الفهم</span>
          </button>

          <button
            onClick={() => router.push('/progress')}
            className="w-full py-4 bg-white text-slate-700 text-lg font-bold rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 border-2 border-slate-100 flex items-center justify-center gap-3"
          >
            <span>📊</span>
            <span>تقدمي وأدائي</span>
          </button>
        </div>

      </div>
    </main>
  )
}
