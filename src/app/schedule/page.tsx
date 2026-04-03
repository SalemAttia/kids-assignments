'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import BottomNav from '@/components/BottomNav'

const DAYS = [
  { index: 6, label: 'السبت',    short: 'سبت'  },
  { index: 0, label: 'الأحد',    short: 'أحد'  },
  { index: 1, label: 'الاثنين',  short: 'اتنين'},
  { index: 2, label: 'الثلاثاء', short: 'تلات' },
  { index: 3, label: 'الأربعاء', short: 'أربع' },
  { index: 4, label: 'الخميس',   short: 'خميس' },
  { index: 5, label: 'الجمعة',   short: 'جمعة' },
]

const SUBJECTS = [
  { value: 'arabic',         label: 'عربي',    emoji: '📖' },
  { value: 'math',           label: 'رياضيات', emoji: '🔢' },
  { value: 'science',        label: 'علوم',    emoji: '🔬' },
  { value: 'english',        label: 'إنجليزي', emoji: '💬' },
  { value: 'social_studies', label: 'اجتماعيات',emoji: '🌍' },
  { value: 'religion',       label: 'دين',     emoji: '🌙' },
]

export default function SchedulePage() {
  const router = useRouter()
  const { userId, loaded } = useCurrentUser()

  // schedule[dayIndex] = Set of subject keys
  const [schedule, setSchedule] = useState<Record<number, Set<string>>>({})
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay())
  const [saving, setSaving] = useState(false)

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

    // Optimistic update
    setSchedule(prev => {
      const updated = { ...prev }
      const daySet = new Set(updated[dayIndex] ?? [])
      if (next) daySet.add(subject)
      else daySet.delete(subject)
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
      // revert
      setSchedule(prev => {
        const updated = { ...prev }
        const daySet = new Set(updated[dayIndex] ?? [])
        if (current) daySet.add(subject)
        else daySet.delete(subject)
        updated[dayIndex] = daySet
        return updated
      })
    } finally {
      setSaving(false)
    }
  }, [userId, schedule, saving])

  const todayIndex = new Date().getDay()
  const selectedDayLabel = DAYS.find(d => d.index === selectedDay)?.label ?? ''
  const selectedSubjects = schedule[selectedDay] ?? new Set()

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4" dir="rtl">
      <div className="max-w-md mx-auto pb-28">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pt-2">
          <div className="flex-1">
            <h1 className="text-2xl font-black text-slate-800">جدول مذاكرتي 📅</h1>
            <p className="text-slate-400 text-sm mt-0.5">اختار كل يوم إيه هتذاكره</p>
          </div>
        </div>

        {/* Day selector — horizontal pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
          {DAYS.map(day => {
            const isToday = day.index === todayIndex
            const isSelected = day.index === selectedDay
            const count = schedule[day.index]?.size ?? 0
            return (
              <button
                key={day.index}
                onClick={() => setSelectedDay(day.index)}
                className={`flex-shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-2xl font-bold transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : isToday
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                      : 'bg-white text-slate-600 border-2 border-slate-100'
                }`}
              >
                <span className="text-sm">{day.short}</span>
                {count > 0 && (
                  <span className={`text-xs font-black rounded-full w-5 h-5 flex items-center justify-center ${
                    isSelected ? 'bg-white/30 text-white' : 'bg-blue-500 text-white'
                  }`}>{count}</span>
                )}
                {count === 0 && <span className="w-5 h-5" />}
              </button>
            )
          })}
        </div>

        {/* Selected day subjects */}
        <div className="bg-white rounded-3xl p-5 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-slate-800 text-lg">{selectedDayLabel}</h2>
            {selectedDay === todayIndex && (
              <span className="text-xs bg-blue-100 text-blue-600 font-bold px-3 py-1 rounded-full">النهارده</span>
            )}
          </div>

          {selectedSubjects.size === 0 && (
            <p className="text-slate-400 text-sm text-center py-4">
              ما فيش مواد متحددة ليوم ده 👇<br />
              <span className="text-xs">اضغط على المادة عشان تضيفها</span>
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {SUBJECTS.map(sub => {
              const active = selectedSubjects.has(sub.value)
              return (
                <button
                  key={sub.value}
                  onClick={() => toggleSubject(selectedDay, sub.value)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 font-bold transition-all active:scale-95 ${
                    active
                      ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-md'
                      : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-blue-200'
                  }`}
                >
                  <span className="text-2xl">{sub.emoji}</span>
                  <div className="text-right flex-1">
                    <div className="text-sm leading-tight">{sub.label}</div>
                    {active && <div className="text-[10px] text-blue-500 font-bold mt-0.5">✓ مضاف</div>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Weekly overview */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <h2 className="font-black text-slate-800 mb-4">الجدول الأسبوعي 📋</h2>
          <div className="space-y-3">
            {DAYS.map(day => {
              const subjects = [...(schedule[day.index] ?? [])]
              const isToday = day.index === todayIndex
              return (
                <div
                  key={day.index}
                  onClick={() => setSelectedDay(day.index)}
                  className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                    isToday ? 'bg-blue-50 border-2 border-blue-200' : 'bg-slate-50 border-2 border-transparent'
                  }`}
                >
                  <span className={`text-sm font-black w-14 flex-shrink-0 ${isToday ? 'text-blue-700' : 'text-slate-500'}`}>
                    {day.short}
                    {isToday && <span className="block text-[9px] text-blue-400">النهارده</span>}
                  </span>
                  {subjects.length === 0 ? (
                    <span className="text-slate-300 text-xs">لا يوجد</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {subjects.map(s => {
                        const sub = SUBJECTS.find(x => x.value === s)
                        return sub ? (
                          <span key={s} className="text-lg" title={sub.label}>{sub.emoji}</span>
                        ) : null
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

      </div>
      <BottomNav />
    </main>
  )
}
