'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { uploadStudyImage } from '@/lib/supabase/storage'
import BottomNav from '@/components/BottomNav'
import type {
  Subject,
  CheckinMood,
  CheckinEnergy,
  CheckinSleep,
  CheckinSubject,
  CheckinSubjectDifficulty,
  CheckinSubjectEnjoyment,
} from '@/types'

// Reuse the same subject list shape the other pages use
const SUBJECTS: { value: Subject; emoji: string; label: string; color: string }[] = [
  { value: 'arabic',         emoji: '📖', label: 'اللغة العربية',       color: 'from-purple-500 to-purple-600' },
  { value: 'math',           emoji: '🔢', label: 'الرياضيات',            color: 'from-blue-500 to-blue-600' },
  { value: 'science',        emoji: '🔬', label: 'العلوم',               color: 'from-green-500 to-green-600' },
  { value: 'english',        emoji: '💬', label: 'اللغة الإنجليزية',    color: 'from-yellow-500 to-orange-500' },
  { value: 'social_studies', emoji: '🌍', label: 'الدراسات الاجتماعية', color: 'from-orange-500 to-red-500' },
  { value: 'religion',       emoji: '🌙', label: 'التربية الدينية',      color: 'from-teal-500 to-cyan-600' },
]

const MOOD_OPTIONS: { value: CheckinMood; emoji: string; label: string }[] = [
  { value: 'great', emoji: '😄', label: 'رائع' },
  { value: 'good',  emoji: '🙂', label: 'كويس' },
  { value: 'okay',  emoji: '😐', label: 'عادي' },
  { value: 'tired', emoji: '😕', label: 'تعبان' },
  { value: 'sad',   emoji: '😢', label: 'زعلان' },
]

const ENERGY_OPTIONS: { value: CheckinEnergy; emoji: string; label: string }[] = [
  { value: 'high',   emoji: '⚡⚡⚡', label: 'عالية' },
  { value: 'medium', emoji: '⚡⚡',   label: 'متوسطة' },
  { value: 'low',    emoji: '⚡',     label: 'قليلة' },
]

const SLEEP_OPTIONS: { value: CheckinSleep; emoji: string; label: string }[] = [
  { value: 'good', emoji: '😴', label: 'آه كويس' },
  { value: 'okay', emoji: '🙂', label: 'شوية'    },
  { value: 'bad',  emoji: '😫', label: 'لا خالص' },
]

const DIFFICULTY_OPTIONS: { value: CheckinSubjectDifficulty; emoji: string; label: string }[] = [
  { value: 'easy',   emoji: '🟢', label: 'سهلة'   },
  { value: 'medium', emoji: '🟡', label: 'متوسطة' },
  { value: 'hard',   emoji: '🔴', label: 'صعبة'   },
]

const ENJOYMENT_OPTIONS: { value: CheckinSubjectEnjoyment; emoji: string }[] = [
  { value: 'like',    emoji: '👍' },
  { value: 'meh',     emoji: '😐' },
  { value: 'dislike', emoji: '👎' },
]

type Step = 1 | 2 | 3 | 4 | 'done'

export default function CheckinPage() {
  const router = useRouter()
  const { userId, loaded } = useCurrentUser()

  const [step, setStep] = useState<Step>(1)

  // Section 1 — feelings
  const [mood, setMood] = useState<CheckinMood | null>(null)
  const [energy, setEnergy] = useState<CheckinEnergy | null>(null)
  const [sleep, setSleep] = useState<CheckinSleep | null>(null)

  // Section 2 — subjects studied today
  const [selectedSubjects, setSelectedSubjects] = useState<Set<Subject>>(new Set())
  const [subjectDetails, setSubjectDetails] = useState<Record<string, Partial<CheckinSubject>>>({})

  // Section 3 — struggles
  const [hardestThing, setHardestThing] = useState('')
  const [struggleImageFile, setStruggleImageFile] = useState<File | null>(null)
  const [struggleImagePreview, setStruggleImagePreview] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const shouldListenRef = useRef(false)

  // Section 4 — positive + bothered
  const [bestThing, setBestThing] = useState('')
  const [bothered, setBothered] = useState<boolean | null>(null)
  const [botheredNote, setBotheredNote] = useState('')

  // Submit state
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [alreadyDone, setAlreadyDone] = useState(false)

  useEffect(() => {
    if (loaded && !userId) router.replace('/')
  }, [loaded, userId, router])

  // Check if already did today's check-in
  useEffect(() => {
    if (!userId) return
    fetch(`/api/checkins/today/${userId}`)
      .then(r => r.json())
      .then(data => { if (data.checkin) setAlreadyDone(true) })
      .catch(() => {})
  }, [userId])

  function toggleSubject(s: Subject) {
    setSelectedSubjects(prev => {
      const next = new Set(prev)
      if (next.has(s)) {
        next.delete(s)
        setSubjectDetails(d => {
          const copy = { ...d }
          delete copy[s]
          return copy
        })
      } else {
        next.add(s)
        // seed defaults so the user sees the row but still has to tap
        setSubjectDetails(d => ({ ...d, [s]: {} }))
      }
      return next
    })
  }

  function updateSubjectField<K extends keyof CheckinSubject>(
    s: Subject,
    key: K,
    value: CheckinSubject[K]
  ) {
    setSubjectDetails(prev => ({
      ...prev,
      [s]: { ...(prev[s] || {}), [key]: value },
    }))
  }

  function handleStruggleImage(file: File | undefined) {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('الصورة أكبر من 5 ميجابايت، اختار صورة أصغر')
      return
    }
    setStruggleImageFile(file)
    setStruggleImagePreview(URL.createObjectURL(file))
    setError('')
  }

  function removeStruggleImage() {
    if (struggleImagePreview) URL.revokeObjectURL(struggleImagePreview)
    setStruggleImageFile(null)
    setStruggleImagePreview(null)
  }

  // Voice recognition — same pattern as /help
  function startRecognition() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR || !shouldListenRef.current) return
    const rec = new SR()
    rec.lang = 'ar'
    rec.continuous = false
    rec.interimResults = true
    rec.onresult = (e: any) => {
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript
      }
      if (final) setHardestThing(prev => prev + (prev ? ' ' : '') + final)
    }
    rec.onend = () => { if (shouldListenRef.current) startRecognition(); else setListening(false) }
    rec.onerror = (e: any) => {
      if (e.error === 'no-speech') return
      shouldListenRef.current = false
      setListening(false)
    }
    rec.start()
    recognitionRef.current = rec
  }

  function toggleVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setError('المتصفح ده مش بيدعم التعرف على الصوت'); return }
    if (shouldListenRef.current) {
      shouldListenRef.current = false
      recognitionRef.current?.stop()
      setListening(false)
    } else {
      shouldListenRef.current = true
      setListening(true)
      startRecognition()
    }
  }

  // Validation — each step has a minimum bar so the kid can't just skip through
  function canAdvance(): boolean {
    if (step === 1) return !!(mood && energy && sleep)
    if (step === 2) {
      // Either no subjects studied, or every selected subject has all 3 fields filled
      if (selectedSubjects.size === 0) return true
      return Array.from(selectedSubjects).every(s => {
        const d = subjectDetails[s]
        return d?.difficulty && typeof d.confidence === 'number' && d.enjoyment
      })
    }
    if (step === 3) return true // fully optional
    if (step === 4) {
      // Must tap "bothered or not" so we have a clean signal, text is optional
      return bothered !== null
    }
    return false
  }

  async function handleSubmit() {
    if (!userId) return
    setSubmitting(true)
    setError('')

    try {
      // Upload struggle image from the client, same flow as /study
      let struggleImageUrl: string | null = null
      if (struggleImageFile) {
        struggleImageUrl = await uploadStudyImage(struggleImageFile, userId)
      }

      const subjectsStudied: CheckinSubject[] = Array.from(selectedSubjects).map(s => {
        const d = subjectDetails[s]!
        return {
          subject: s,
          difficulty: d.difficulty!,
          confidence: d.confidence!,
          enjoyment: d.enjoyment!,
        }
      })

      const res = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          mood,
          energy,
          sleep,
          subjectsStudied,
          hardestThing: hardestThing.trim() || null,
          struggleImageUrl,
          bestThing: bestThing.trim() || null,
          bothered: bothered ?? false,
          botheredNote: bothered ? (botheredNote.trim() || null) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'في مشكلة')

      setStep('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'في مشكلة مش متوقعة')
    } finally {
      setSubmitting(false)
    }
  }

  function handleBack() {
    if (step === 1) { router.push('/hub'); return }
    if (step === 2) setStep(1)
    if (step === 3) setStep(2)
    if (step === 4) setStep(3)
  }

  function handleNext() {
    if (step === 1) setStep(2)
    else if (step === 2) setStep(3)
    else if (step === 3) setStep(4)
    else if (step === 4) handleSubmit()
  }

  if (!loaded) return null

  // Already-done short-circuit: show summary and a back button
  if (alreadyDone && step !== 'done') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50 p-4" dir="rtl">
        <div className="max-w-md mx-auto pt-8 pb-28 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">خلّصت تشيك-إن النهاردة!</h1>
          <p className="text-slate-500 mb-6">تعالى بكره عشان تقولي إزيك تاني 💙</p>
          <button
            onClick={() => router.push('/hub')}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg font-bold rounded-2xl shadow-lg active:scale-95 transition-all"
          >
            🏠 الصفحة الرئيسية
          </button>
        </div>
        <BottomNav />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50 p-4" dir="rtl">
      <div className="max-w-md mx-auto pt-2 pb-28">

        {/* Header */}
        {step !== 'done' && (
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-slate-500 text-lg"
            >←</button>
            <div className="flex-1">
              <p className="text-xs text-slate-400 font-medium">الخطوة {step} من 4</p>
              <div className="flex gap-1.5 mt-1">
                {[1, 2, 3, 4].map(n => (
                  <div
                    key={n}
                    className={`h-2 rounded-full flex-1 transition-all duration-500 ${
                      n <= (step as number) ? 'bg-violet-500' : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 1 — Feelings */}
        {step === 1 && (
          <div className="animate-fade-in">
            <div className="text-center mb-6">
              <div className="text-5xl mb-2">💙</div>
              <h1 className="text-2xl font-black text-slate-800">إزيك النهاردة؟</h1>
              <p className="text-slate-500 text-sm mt-1">اختار اللي بتحس بيه دلوقتي</p>
            </div>

            {/* Mood */}
            <div className="bg-white rounded-3xl p-5 shadow-sm mb-4">
              <p className="text-sm font-bold text-slate-600 mb-3">مزاجك دلوقتي؟</p>
              <div className="grid grid-cols-5 gap-2">
                {MOOD_OPTIONS.map(m => {
                  const selected = mood === m.value
                  return (
                    <button
                      key={m.value}
                      onClick={() => setMood(m.value)}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all active:scale-90 ${
                        selected ? 'bg-violet-50 border-violet-400 shadow-md scale-105' : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <span className="text-3xl leading-none">{m.emoji}</span>
                      <span className={`text-[10px] font-bold leading-none ${selected ? 'text-violet-700' : 'text-slate-400'}`}>{m.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Energy */}
            <div className="bg-white rounded-3xl p-5 shadow-sm mb-4">
              <p className="text-sm font-bold text-slate-600 mb-3">طاقتك إزاي؟</p>
              <div className="grid grid-cols-3 gap-2">
                {ENERGY_OPTIONS.map(e => {
                  const selected = energy === e.value
                  return (
                    <button
                      key={e.value}
                      onClick={() => setEnergy(e.value)}
                      className={`flex flex-col items-center gap-2 py-3 rounded-2xl border-2 transition-all active:scale-90 ${
                        selected ? 'bg-yellow-50 border-yellow-400 shadow-md scale-105' : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <span className="text-xl leading-none">{e.emoji}</span>
                      <span className={`text-xs font-bold leading-none ${selected ? 'text-yellow-700' : 'text-slate-500'}`}>{e.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Sleep */}
            <div className="bg-white rounded-3xl p-5 shadow-sm mb-4">
              <p className="text-sm font-bold text-slate-600 mb-3">نمت كويس امبارح؟</p>
              <div className="grid grid-cols-3 gap-2">
                {SLEEP_OPTIONS.map(sp => {
                  const selected = sleep === sp.value
                  return (
                    <button
                      key={sp.value}
                      onClick={() => setSleep(sp.value)}
                      className={`flex flex-col items-center gap-2 py-3 rounded-2xl border-2 transition-all active:scale-90 ${
                        selected ? 'bg-blue-50 border-blue-400 shadow-md scale-105' : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <span className="text-2xl leading-none">{sp.emoji}</span>
                      <span className={`text-xs font-bold leading-none ${selected ? 'text-blue-700' : 'text-slate-500'}`}>{sp.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Subjects */}
        {step === 2 && (
          <div className="animate-fade-in">
            <div className="text-center mb-5">
              <div className="text-5xl mb-2">📚</div>
              <h1 className="text-2xl font-black text-slate-800">أنهي مواد ذاكرتها النهاردة؟</h1>
              <p className="text-slate-500 text-sm mt-1">دوس على كل مادة ذاكرتها (أو كمّل لو ما ذاكرتش حاجة)</p>
            </div>

            {/* Subject grid */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {SUBJECTS.map(s => {
                const selected = selectedSubjects.has(s.value)
                return (
                  <button
                    key={s.value}
                    onClick={() => toggleSubject(s.value)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all active:scale-95 ${
                      selected
                        ? 'bg-gradient-to-br from-violet-100 to-blue-100 border-violet-400 shadow-md'
                        : 'bg-white border-slate-100 shadow-sm'
                    }`}
                  >
                    <span className="text-3xl">{s.emoji}</span>
                    <span className={`text-[11px] font-bold text-center leading-tight ${selected ? 'text-violet-700' : 'text-slate-700'}`}>
                      {s.label}
                    </span>
                    {selected && <span className="text-xs text-violet-500 font-bold">✓</span>}
                  </button>
                )
              })}
            </div>

            {/* Per-subject detail rows */}
            {selectedSubjects.size > 0 && (
              <div className="space-y-3">
                {Array.from(selectedSubjects).map(s => {
                  const subjectInfo = SUBJECTS.find(x => x.value === s)!
                  const details = subjectDetails[s] || {}
                  return (
                    <div key={s} className="bg-white rounded-2xl p-4 shadow-sm border-2 border-slate-100">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${subjectInfo.color} text-white text-xs font-bold mb-3 shadow`}>
                        <span>{subjectInfo.emoji}</span>
                        <span>{subjectInfo.label}</span>
                      </div>

                      {/* Difficulty */}
                      <p className="text-[11px] font-bold text-slate-500 mb-1.5">كانت صعبة قد إيه؟</p>
                      <div className="grid grid-cols-3 gap-1.5 mb-3">
                        {DIFFICULTY_OPTIONS.map(d => {
                          const selected = details.difficulty === d.value
                          return (
                            <button
                              key={d.value}
                              onClick={() => updateSubjectField(s, 'difficulty', d.value)}
                              className={`flex items-center justify-center gap-1 py-2 rounded-xl border-2 text-xs font-bold transition-all active:scale-95 ${
                                selected ? 'bg-slate-50 border-slate-400' : 'bg-white border-slate-100 text-slate-400'
                              }`}
                            >
                              <span>{d.emoji}</span>
                              <span>{d.label}</span>
                            </button>
                          )
                        })}
                      </div>

                      {/* Confidence — star rating 1..5 */}
                      <p className="text-[11px] font-bold text-slate-500 mb-1.5">فاهمها قد إيه؟</p>
                      <div className="flex gap-1.5 mb-3">
                        {[1, 2, 3, 4, 5].map(n => {
                          const active = (details.confidence ?? 0) >= n
                          return (
                            <button
                              key={n}
                              onClick={() => updateSubjectField(s, 'confidence', n)}
                              className="flex-1 py-2 rounded-xl border-2 text-lg active:scale-90 transition-all"
                              style={{
                                backgroundColor: active ? '#fef3c7' : '#f8fafc',
                                borderColor: active ? '#fbbf24' : '#e2e8f0',
                              }}
                            >
                              {active ? '⭐' : '☆'}
                            </button>
                          )
                        })}
                      </div>

                      {/* Enjoyment */}
                      <p className="text-[11px] font-bold text-slate-500 mb-1.5">عجبتك؟</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {ENJOYMENT_OPTIONS.map(e => {
                          const selected = details.enjoyment === e.value
                          return (
                            <button
                              key={e.value}
                              onClick={() => updateSubjectField(s, 'enjoyment', e.value)}
                              className={`py-2 rounded-xl border-2 text-xl transition-all active:scale-95 ${
                                selected ? 'bg-green-50 border-green-400' : 'bg-white border-slate-100 opacity-60'
                              }`}
                            >
                              {e.emoji}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {selectedSubjects.size === 0 && (
              <div className="bg-white/60 border-2 border-dashed border-slate-200 rounded-2xl p-5 text-center text-slate-400 text-sm">
                ما ذاكرتش مادة النهاردة؟ كمّل عادي 👇
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Hardest thing */}
        {step === 3 && (
          <div className="animate-fade-in">
            <div className="text-center mb-5">
              <div className="text-5xl mb-2">🤔</div>
              <h1 className="text-2xl font-black text-slate-800">إيه أصعب حاجة النهاردة؟</h1>
              <p className="text-slate-500 text-sm mt-1">حاجة ما فهمتهاش؟ درس صعب؟ اكتب أو اتكلم أو صوّر</p>
            </div>

            {/* Image preview */}
            {struggleImagePreview && (
              <div className="relative mb-3 w-32 mx-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={struggleImagePreview} alt="صورة" className="w-full h-32 object-cover rounded-2xl shadow-sm" />
                <button
                  onClick={removeStruggleImage}
                  className="absolute top-1 left-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow"
                >✕</button>
              </div>
            )}

            {/* Textarea + mic + camera */}
            <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden mb-3">
              <textarea
                value={hardestThing}
                onChange={e => setHardestThing(e.target.value)}
                placeholder="مثال: ما فهمتش الكسور في الرياضة... أو الإعراب صعب عليّا"
                className="w-full h-28 p-4 text-slate-700 resize-none focus:outline-none text-sm leading-relaxed"
                dir="rtl"
              />
              <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50">
                <div className="flex gap-2">
                  {!struggleImageFile && (
                    <>
                      <button
                        onClick={() => cameraRef.current?.click()}
                        className="p-2 rounded-xl bg-white border border-slate-200 text-lg hover:bg-slate-50 transition-all"
                        title="التقط صورة"
                      >📷</button>
                      <button
                        onClick={() => galleryRef.current?.click()}
                        className="p-2 rounded-xl bg-white border border-slate-200 text-lg hover:bg-slate-50 transition-all"
                        title="اختر من المعرض"
                      >🖼️</button>
                    </>
                  )}
                </div>
                <button
                  onClick={toggleVoice}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    listening ? 'bg-red-500 text-white animate-pulse' : 'bg-gradient-to-r from-violet-500 to-blue-500 text-white'
                  }`}
                >
                  {listening ? '⏹ إيقاف' : '🎤 اتكلم'}
                </button>
              </div>
            </div>

            {listening && (
              <div className="flex items-center gap-2 text-red-500 text-sm font-medium mb-3 justify-center">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping inline-block" />
                بيتم التسجيل...
              </div>
            )}

            <p className="text-center text-xs text-slate-400 mb-3">مش لازم تكتب حاجة لو ما فيش - كمّل عادي</p>

            {/* Hidden file inputs */}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={e => { handleStruggleImage(e.target.files?.[0]); e.target.value = '' }}
              className="hidden"
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              onChange={e => { handleStruggleImage(e.target.files?.[0]); e.target.value = '' }}
              className="hidden"
            />
          </div>
        )}

        {/* Step 4 — Best thing + bothered */}
        {step === 4 && (
          <div className="animate-fade-in">
            <div className="text-center mb-5">
              <div className="text-5xl mb-2">🌟</div>
              <h1 className="text-2xl font-black text-slate-800">آخر حاجة!</h1>
            </div>

            {/* Best thing */}
            <div className="bg-white rounded-3xl p-5 shadow-sm mb-4">
              <p className="text-sm font-bold text-slate-700 mb-2">✨ إيه أحسن حاجة حصلت النهاردة؟</p>
              <input
                type="text"
                value={bestThing}
                onChange={e => setBestThing(e.target.value)}
                placeholder="مثال: لعبت كورة مع صاحبي، أو فهمت درس"
                className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-violet-300"
                dir="rtl"
                maxLength={200}
              />
              <p className="text-[10px] text-slate-400 mt-1 text-left">اختياري</p>
            </div>

            {/* Bothered */}
            <div className="bg-white rounded-3xl p-5 shadow-sm mb-4">
              <p className="text-sm font-bold text-slate-700 mb-3">💭 في حاجة مضايقاك؟</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setBothered(false)}
                  className={`flex items-center justify-center gap-2 py-3 rounded-2xl border-2 transition-all active:scale-95 ${
                    bothered === false ? 'bg-green-50 border-green-400 shadow-md' : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <span className="text-xl">🙂</span>
                  <span className="text-sm font-bold text-slate-700">لا، كله تمام</span>
                </button>
                <button
                  onClick={() => setBothered(true)}
                  className={`flex items-center justify-center gap-2 py-3 rounded-2xl border-2 transition-all active:scale-95 ${
                    bothered === true ? 'bg-amber-50 border-amber-400 shadow-md' : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <span className="text-xl">😕</span>
                  <span className="text-sm font-bold text-slate-700">آه، في حاجة</span>
                </button>
              </div>

              {bothered === true && (
                <div className="mt-3">
                  <textarea
                    value={botheredNote}
                    onChange={e => setBotheredNote(e.target.value)}
                    placeholder="تقدر تقولي عليها... (اختياري)"
                    className="w-full p-3 bg-amber-50 border-2 border-amber-100 rounded-xl text-sm text-slate-700 resize-none h-20 focus:outline-none focus:border-amber-300"
                    dir="rtl"
                    maxLength={500}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Done screen */}
        {step === 'done' && (
          <div className="animate-fade-in text-center pt-8">
            <div className="text-7xl mb-4">💙</div>
            <h1 className="text-3xl font-black text-slate-800 mb-2">شكرًا إنك قلتلي!</h1>
            <p className="text-slate-500 mb-6">كسبت <span className="font-bold text-yellow-600">+10 نقط</span> ⭐</p>
            <button
              onClick={() => router.push('/hub')}
              className="w-full py-4 bg-gradient-to-r from-violet-500 to-blue-600 text-white text-lg font-bold rounded-2xl shadow-lg active:scale-95 transition-all"
            >
              🏠 الصفحة الرئيسية
            </button>
          </div>
        )}

        {/* Error */}
        {error && step !== 'done' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-red-600 text-sm text-center my-3">
            {error}
          </div>
        )}

        {/* Next / submit button */}
        {step !== 'done' && (
          <button
            onClick={handleNext}
            disabled={!canAdvance() || submitting}
            className="w-full py-4 mt-4 bg-gradient-to-r from-violet-500 to-blue-600 disabled:from-slate-300 disabled:to-slate-400 text-white text-lg font-bold rounded-2xl shadow-lg active:scale-95 transition-all"
          >
            {submitting ? '⏳ بيتم الحفظ...' : step === 4 ? '💙 خلصت!' : 'الجاي ←'}
          </button>
        )}

      </div>

      <BottomNav />
    </main>
  )
}
