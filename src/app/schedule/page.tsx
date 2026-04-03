'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import BottomNav from '@/components/BottomNav'

const DAYS = [
  { index: 6, label: 'السبت',    short: 'سبت'   },
  { index: 0, label: 'الأحد',    short: 'أحد'   },
  { index: 1, label: 'الاثنين',  short: 'اتنين' },
  { index: 2, label: 'الثلاثاء', short: 'تلات'  },
  { index: 3, label: 'الأربعاء', short: 'أربع'  },
  { index: 4, label: 'الخميس',   short: 'خميس'  },
  { index: 5, label: 'الجمعة',   short: 'جمعة'  },
]

const SUBJECTS = [
  { value: 'arabic',         label: 'اللغة العربية', emoji: '📖' },
  { value: 'math',           label: 'الرياضيات',     emoji: '🔢' },
  { value: 'science',        label: 'العلوم',         emoji: '🔬' },
  { value: 'english',        label: 'الإنجليزي',     emoji: '💬' },
  { value: 'social_studies', label: 'الاجتماعيات',   emoji: '🌍' },
  { value: 'religion',       label: 'التربية الدينية',emoji: '🌙' },
]

export default function SchedulePage() {
  const router = useRouter()
  const { userId, loaded } = useCurrentUser()

  const [schedule, setSchedule] = useState<Record<number, Set<string>>>({})
  const [openDay, setOpenDay] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const todayIndex = new Date().getDay()

  useEffect(() => {
    if (loaded && !userId) { router.replace('/'); return }
    if (userId) {
      fetch(`/api/schedule/${userId}`)
        .then(r => r.json())
        .then(d => {
          if (d.schedule) {
            const parsed: Record<number, Set<string>> = {}
            Object.entries(d.schedule).forEach(([day, subjects]) => {
              parsed[Number(day)] = new Set(subjects as string[])
            })
            setSchedule(parsed)
          }
        })
    }
  }, [loaded, userId, router])

  const toggleSubject = useCallback(async (dayIndex: number, subject: string) => {
    if (!userId || saving) return
    const current = schedule[dayIndex]?.has(subject) ?? false
    const next = !current

    setSchedule(prev => {
      const updated = { ...prev }
      const daySet = new Set(updated[dayIndex] ?? [])
      next ? daySet.add(subject) : daySet.delete(subject)
      updated[dayIndex] = daySet
      return updated
    })

    setSaving(true)
    try {
      await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, dayOfWeek: dayIndex, subject, active: next }),
      })
    } catch {
      setSchedule(prev => {
        const updated = { ...prev }
        const daySet = new Set(updated[dayIndex] ?? [])
        current ? daySet.add(subject) : daySet.delete(subject)
        updated[dayIndex] = daySet
        return updated
      })
    } finally {
      setSaving(false)
    }
  }, [userId, schedule, saving])

  const openDayData = openDay !== null ? DAYS.find(d => d.index === openDay) : null
  const openDaySubjects = openDay !== null ? (schedule[openDay] ?? new Set()) : new Set()

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4" dir="rtl">
      <div className="max-w-md mx-auto pb-28 pt-2">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-800">جدول مذاكرتي 📅</h1>
          <p className="text-slate-400 text-sm mt-1">اضغط على أي يوم عشان تحدد مواده</p>
        </div>

        {/* Days list */}
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
          {DAYS.map((day, i) => {
            const subjects = [...(schedule[day.index] ?? [])]
            const isToday = day.index === todayIndex
            const isLast = i === DAYS.length - 1

            return (
              <button
                key={day.index}
                onClick={() => setOpenDay(day.index)}
                className={`w-full flex items-center justify-between px-5 py-4 text-right transition-all active:bg-blue-50 hover:bg-slate-50 ${
                  isToday ? 'bg-blue-50' : ''
                } ${!isLast ? 'border-b border-slate-100' : ''}`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {subjects.length === 0 ? (
                    <span className="text-slate-300 text-sm">لا يوجد</span>
                  ) : (
                    <div className="flex gap-1.5">
                      {subjects.map(s => {
                        const sub = SUBJECTS.find(x => x.value === s)
                        return sub ? <span key={s} className="text-xl">{sub.emoji}</span> : null
                      })}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isToday && (
                    <span className="text-[10px] bg-blue-500 text-white font-bold px-2 py-0.5 rounded-full">
                      النهارده
                    </span>
                  )}
                  <span className={`font-black text-base ${isToday ? 'text-blue-700' : 'text-slate-700'}`}>
                    {day.label}
                  </span>
                  <span className="text-slate-300 text-sm">›</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Subject picker modal */}
      {openDay !== null && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end"
          onClick={() => setOpenDay(null)}
        >
          <div
            className="w-full bg-white rounded-t-3xl p-6 pb-24 shadow-2xl"
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-black text-slate-800">{openDayData?.label}</h2>
                <p className="text-slate-400 text-sm">اختار المواد اللي هتذاكرها</p>
              </div>
              <button
                onClick={() => setOpenDay(null)}
                className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Subject toggles */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {SUBJECTS.map(sub => {
                const active = openDaySubjects.has(sub.value)
                return (
                  <button
                    key={sub.value}
                    onClick={() => toggleSubject(openDay, sub.value)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 font-bold transition-all active:scale-95 ${
                      active
                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                        : 'border-slate-100 bg-slate-50 text-slate-500'
                    }`}
                  >
                    <span className="text-2xl">{sub.emoji}</span>
                    <div className="text-right">
                      <div className="text-sm leading-tight">{sub.label}</div>
                      {active && <div className="text-[10px] text-blue-500 font-bold">✓ مختار</div>}
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setOpenDay(null)}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black text-lg rounded-2xl active:scale-95 transition-all"
            >
              حفظ ✓
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  )
}
