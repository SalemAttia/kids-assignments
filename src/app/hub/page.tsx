'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import BottomNav from '@/components/BottomNav'

interface DailyStats {
  user: { name: string; points: number; streak: number; grade: number }
  today: { sessionCount: number; subjectCount: number; subjects: { key: string; label: string }[]; totalMinutes: number }
  week: { sessionCount: number; totalMinutes: number; dailyBreakdown: { label: string; minutes: number; sessions: number }[] }
}

type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'
interface PrayerLog { prayer_date: string; fajr: boolean; dhuhr: boolean; asr: boolean; maghrib: boolean; isha: boolean }

const PRAYERS: { key: PrayerKey; label: string; emoji: string }[] = [
  { key: 'fajr',    label: 'الفجر',   emoji: '🌅' },
  { key: 'dhuhr',   label: 'الظهر',   emoji: '☀️' },
  { key: 'asr',     label: 'العصر',   emoji: '🌤️' },
  { key: 'maghrib', label: 'المغرب',  emoji: '🌇' },
  { key: 'isha',    label: 'العشاء',  emoji: '🌙' },
]

function formatMinutes(m: number) {
  if (m === 0) return 'مفيش لسه'
  if (m < 60) return `${m} دقيقة`
  const h = Math.floor(m / 60)
  const mins = m % 60
  return mins > 0 ? `${h} ساعة و${mins} دقيقة` : `${h} ساعة`
}

const GOAL_MINUTES = 60

export default function HubPage() {
  const router = useRouter()
  const { userId, loaded, clearUser } = useCurrentUser()
  const [stats, setStats] = useState<DailyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [prayers, setPrayers] = useState<PrayerLog | null>(null)
  const [prayerSaving, setPrayerSaving] = useState<PrayerKey | null>(null)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (loaded && !userId) { router.replace('/'); return }
    if (userId) {
      fetch(`/api/daily-stats/${userId}`)
        .then(r => r.json())
        .then(d => { setStats(d); setLoading(false) })
        .catch(() => setLoading(false))

      fetch(`/api/prayers/${userId}?date=${today}`)
        .then(r => r.json())
        .then(d => setPrayers(d))
        .catch(() => {})
    }
  }, [loaded, userId, router, today])

  const togglePrayer = useCallback(async (prayer: PrayerKey) => {
    if (!userId || prayerSaving) return
    const current = prayers?.[prayer] ?? false
    const next = !current

    // Optimistic update
    setPrayers(prev => prev ? { ...prev, [prayer]: next } : {
      prayer_date: today, fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false, [prayer]: next,
    })
    setPrayerSaving(prayer)

    try {
      await fetch('/api/prayers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date: today, prayer, done: next }),
      })
    } catch {
      // Revert on failure
      setPrayers(prev => prev ? { ...prev, [prayer]: current } : null)
    } finally {
      setPrayerSaving(null)
    }
  }, [userId, prayers, prayerSaving, today])

  if (!loaded || loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-bounce">📚</div>
        <p className="text-slate-500 font-medium">بيتحمل...</p>
      </div>
    </div>
  )

  const todayStats = stats?.today
  const week = stats?.week
  const user = stats?.user
  const progressPct = Math.min(100, Math.round(((todayStats?.totalMinutes || 0) / GOAL_MINUTES) * 100))
  const goalReached = (todayStats?.totalMinutes || 0) >= GOAL_MINUTES

  const prayersDone = prayers
    ? PRAYERS.filter(p => prayers[p.key]).length
    : 0
  const allPrayersDone = prayersDone === 5

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4" dir="rtl">
      <div className="max-w-md mx-auto pt-4 pb-32">

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

        {/* Prayer Tracker */}
        <div className={`rounded-2xl p-5 shadow-sm mb-4 ${allPrayersDone ? 'bg-gradient-to-r from-teal-500 to-emerald-500' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={`font-bold text-base ${allPrayersDone ? 'text-white' : 'text-slate-700'}`}>
                صلوات اليوم 🤲
              </h2>
              <p className={`text-xs mt-0.5 ${allPrayersDone ? 'text-teal-100' : 'text-slate-400'}`}>
                {allPrayersDone ? 'ما شاء الله! كملت كل الصلوات 🎉' : `${prayersDone} من 5 صلوات`}
              </p>
            </div>
            <div className={`text-2xl font-bold ${allPrayersDone ? 'text-white' : 'text-teal-600'}`}>
              {prayersDone}/5
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {PRAYERS.map(p => {
              const done = prayers?.[p.key] ?? false
              const saving = prayerSaving === p.key
              return (
                <button
                  key={p.key}
                  onClick={() => togglePrayer(p.key)}
                  disabled={saving}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all active:scale-95 ${
                    done
                      ? allPrayersDone
                        ? 'bg-white/20 text-white'
                        : 'bg-teal-500 text-white shadow-md'
                      : allPrayersDone
                        ? 'bg-white/10 text-white/60'
                        : 'bg-slate-50 text-slate-400 border border-slate-100'
                  } ${saving ? 'opacity-50' : ''}`}
                >
                  <span className="text-lg leading-none">{done ? '✅' : p.emoji}</span>
                  <span className="text-[10px] font-bold leading-tight">{p.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Daily Goal */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-700">هدف المذاكرة النهارده</h2>
            <span className="text-sm font-medium text-blue-600">{goalReached ? '🎉 برافو عليك!' : `${progressPct}%`}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 mb-3">
            <div
              className={`h-3 rounded-full transition-all duration-700 ${goalReached ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>وقت المذاكرة: <span className="font-semibold text-slate-600">{formatMinutes(todayStats?.totalMinutes || 0)}</span></span>
            <span>الهدف: {formatMinutes(GOAL_MINUTES)}</span>
          </div>
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <div className="text-2xl mb-1">📖</div>
            <div className="text-xl font-bold text-blue-600">{todayStats?.subjectCount || 0}</div>
            <div className="text-xs text-slate-400">مادة النهارده</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <div className="text-2xl mb-1">✅</div>
            <div className="text-xl font-bold text-green-600">{todayStats?.sessionCount || 0}</div>
            <div className="text-xs text-slate-400">جلسة النهارده</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <div className="text-2xl mb-1">📅</div>
            <div className="text-xl font-bold text-purple-600">{week?.sessionCount || 0}</div>
            <div className="text-xs text-slate-400">جلسة الأسبوع</div>
          </div>
        </div>

        {/* Today's Subjects */}
        {(todayStats?.subjects?.length || 0) > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <p className="text-xs text-slate-400 mb-3 font-medium">ذاكرت النهارده</p>
            <div className="flex flex-wrap gap-2">
              {todayStats!.subjects.map(s => (
                <span key={s.key} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium">
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Weekly bar chart */}
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

        {/* Start Study CTA */}
        <button
          onClick={() => router.push('/study')}
          className="w-full py-5 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          <span>📚</span>
          <span>ابدأ مذاكرة جديدة!</span>
        </button>

      </div>

      <BottomNav />
    </main>
  )
}
