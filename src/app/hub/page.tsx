'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import BottomNav from '@/components/BottomNav'

type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'
interface PrayerLog { prayer_date: string; fajr: boolean; dhuhr: boolean; asr: boolean; maghrib: boolean; isha: boolean }

const PRAYERS: { key: PrayerKey; label: string; emoji: string }[] = [
  { key: 'fajr',    label: 'الفجر',  emoji: '🌅' },
  { key: 'dhuhr',   label: 'الظهر',  emoji: '☀️' },
  { key: 'asr',     label: 'العصر',  emoji: '🌤️' },
  { key: 'maghrib', label: 'المغرب', emoji: '🌇' },
  { key: 'isha',    label: 'العشاء', emoji: '🌙' },
]

const SUBJECTS: Record<string, { label: string; emoji: string; color: string }> = {
  arabic:         { label: 'عربي',       emoji: '📖', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  math:           { label: 'رياضيات',    emoji: '🔢', color: 'bg-blue-100 text-blue-800 border-blue-200'       },
  science:        { label: 'علوم',       emoji: '🔬', color: 'bg-green-100 text-green-800 border-green-200'    },
  english:        { label: 'إنجليزي',   emoji: '💬', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  social_studies: { label: 'اجتماعيات', emoji: '🌍', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  religion:       { label: 'دين',       emoji: '🌙', color: 'bg-teal-100 text-teal-800 border-teal-200'       },
}

export default function HubPage() {
  const router = useRouter()
  const { userId, loaded, clearUser } = useCurrentUser()

  const [userName, setUserName] = useState('')
  const [streak, setStreak] = useState(0)
  const [points, setPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [prayers, setPrayers] = useState<PrayerLog | null>(null)
  const [prayerSaving, setPrayerSaving] = useState<PrayerKey | null>(null)
  const [todaySchedule, setTodaySchedule] = useState<string[]>([])
  const [studiedToday, setStudiedToday] = useState<Set<string>>(new Set())

  const today = new Date().toISOString().split('T')[0]
  const todayDayIndex = new Date().getDay()

  useEffect(() => {
    if (loaded && !userId) { router.replace('/'); return }
    if (!userId) return

    Promise.all([
      fetch(`/api/daily-stats/${userId}`).then(r => r.json()),
      fetch(`/api/prayers/${userId}?date=${today}`).then(r => r.json()),
      fetch(`/api/schedule/${userId}`).then(r => r.json()),
    ]).then(([stats, prayerData, scheduleData]) => {
      setUserName(stats.user?.name ?? '')
      setStreak(stats.user?.streak ?? 0)
      setPoints(stats.user?.points ?? 0)
      setPrayers(prayerData)
      // Today's schedule
      const daySubjects: string[] = scheduleData.schedule?.[todayDayIndex] ?? []
      setTodaySchedule(daySubjects)
      // What was already studied today
      const studied = new Set<string>((stats.today?.subjects ?? []).map((s: { key: string }) => s.key))
      setStudiedToday(studied)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [loaded, userId, router, today, todayDayIndex])

  const togglePrayer = useCallback(async (prayer: PrayerKey) => {
    if (!userId || prayerSaving) return
    const current = prayers?.[prayer] ?? false
    const next = !current
    setPrayers(prev => prev
      ? { ...prev, [prayer]: next }
      : { prayer_date: today, fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false, [prayer]: next }
    )
    setPrayerSaving(prayer)
    try {
      await fetch('/api/prayers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date: today, prayer, done: next }),
      })
    } catch {
      setPrayers(prev => prev ? { ...prev, [prayer]: current } : null)
    } finally {
      setPrayerSaving(null)
    }
  }, [userId, prayers, prayerSaving, today])

  if (!loaded || loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="text-center">
        <div className="text-6xl mb-4 animate-bounce">📚</div>
        <p className="text-blue-600 font-bold">بيتحمل...</p>
      </div>
    </div>
  )

  const prayersDone = PRAYERS.filter(p => prayers?.[p.key]).length
  const allPrayersDone = prayersDone === 5
  const scheduleDone = todaySchedule.filter(s => studiedToday.has(s)).length
  const scheduleTotal = todaySchedule.length

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4" dir="rtl">
      <div className="max-w-md mx-auto pt-4 pb-32">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm text-slate-400">أهلاً يا</p>
            <h1 className="text-2xl font-black text-slate-800">{userName} 👋</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white rounded-xl px-3 py-2 shadow-sm text-center">
              <span className="text-lg">⭐</span>
              <span className="text-sm font-black text-yellow-500 ml-1">{points}</span>
            </div>
            <div className="bg-white rounded-xl px-3 py-2 shadow-sm text-center">
              <span className="text-lg">🔥</span>
              <span className="text-sm font-black text-orange-500 ml-1">{streak}</span>
            </div>
            <button
              onClick={() => { clearUser(); router.push('/') }}
              className="text-xs text-slate-400 bg-white rounded-xl px-3 py-2 shadow-sm"
            >
              تغيير
            </button>
          </div>
        </div>

        {/* Today's Schedule — main card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-black text-slate-800 text-lg">مذاكرتك النهارده 📋</h2>
              {scheduleTotal > 0 && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {scheduleDone === scheduleTotal
                    ? '🎉 خلصت كل حاجة النهارده!'
                    : `${scheduleDone} من ${scheduleTotal} مواد اتذاكرت`}
                </p>
              )}
            </div>
            <button
              onClick={() => router.push('/schedule')}
              className="text-xs text-blue-500 font-bold bg-blue-50 px-3 py-1.5 rounded-xl"
            >
              ✏️ عدل
            </button>
          </div>

          {todaySchedule.length === 0 ? (
            <button
              onClick={() => router.push('/schedule')}
              className="w-full py-6 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400 hover:border-blue-300 hover:text-blue-400 transition-all"
            >
              <div className="text-3xl mb-2">📅</div>
              <div className="text-sm font-bold">ما فيش جدول لليوم ده</div>
              <div className="text-xs mt-1">اضغط عشان تضيف مواد</div>
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {todaySchedule.map(subjectKey => {
                const sub = SUBJECTS[subjectKey]
                if (!sub) return null
                const done = studiedToday.has(subjectKey)
                return (
                  <button
                    key={subjectKey}
                    onClick={() => router.push('/study')}
                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all active:scale-95 ${
                      done
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : sub.color
                    }`}
                  >
                    <span className="text-2xl">{done ? '✅' : sub.emoji}</span>
                    <div className="text-right">
                      <div className="text-sm font-bold leading-tight">{sub.label}</div>
                      <div className={`text-[10px] font-bold ${done ? 'text-green-500' : 'text-slate-400'}`}>
                        {done ? 'تم ✓' : 'اضغط للمذاكرة'}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Prayer Tracker */}
        <div className={`rounded-3xl p-5 shadow-sm mb-4 ${allPrayersDone ? 'bg-gradient-to-r from-teal-500 to-emerald-500' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`font-black text-base ${allPrayersDone ? 'text-white' : 'text-slate-700'}`}>
              صلوات اليوم 🤲
            </h2>
            <span className={`font-black text-lg ${allPrayersDone ? 'text-white' : 'text-teal-600'}`}>
              {prayersDone}/5
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {PRAYERS.map(p => {
              const done = prayers?.[p.key] ?? false
              return (
                <button
                  key={p.key}
                  onClick={() => togglePrayer(p.key)}
                  disabled={prayerSaving === p.key}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all active:scale-95 ${
                    done
                      ? allPrayersDone ? 'bg-white/20 text-white' : 'bg-teal-500 text-white shadow-md'
                      : allPrayersDone ? 'bg-white/10 text-white/60' : 'bg-slate-50 text-slate-400 border border-slate-100'
                  }`}
                >
                  <span className="text-lg leading-none">{done ? '✅' : p.emoji}</span>
                  <span className="text-[10px] font-bold leading-tight">{p.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Start Study CTA */}
        <button
          onClick={() => router.push('/study')}
          className="w-full py-5 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xl font-black rounded-3xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <span>📚</span>
          <span>ابدأ مذاكرة دلوقتي!</span>
        </button>

      </div>
      <BottomNav />
    </main>
  )
}
