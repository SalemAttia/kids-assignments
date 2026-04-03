'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { SUBJECT_LABELS, type Subject } from '@/types'

const SUBJECTS: { value: Subject; emoji: string; label: string; color: string }[] = [
  { value: 'arabic',         emoji: '📖', label: 'اللغة العربية',       color: 'from-purple-500 to-purple-600' },
  { value: 'math',           emoji: '🔢', label: 'الرياضيات',            color: 'from-blue-500 to-blue-600' },
  { value: 'science',        emoji: '🔬', label: 'العلوم',               color: 'from-green-500 to-green-600' },
  { value: 'english',        emoji: '💬', label: 'اللغة الإنجليزية',    color: 'from-yellow-500 to-orange-500' },
  { value: 'social_studies', emoji: '🌍', label: 'الدراسات الاجتماعية', color: 'from-orange-500 to-red-500' },
  { value: 'religion',       emoji: '🌙', label: 'التربية الدينية',      color: 'from-teal-500 to-cyan-600' },
]

type Step = 'subject' | 'question' | 'result'

const MAX_IMAGES = 5

export default function HelpPage() {
  const router = useRouter()
  const { userId, loaded } = useCurrentUser()

  const [step, setStep] = useState<Step>('subject')
  const [subject, setSubject] = useState<Subject | null>(null)
  const [question, setQuestion] = useState('')
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [imageBase64Array, setImageBase64Array] = useState<string[]>([])
  const [explanation, setExplanation] = useState('')
  const [quickActions, setQuickActions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [listening, setListening] = useState(false)

  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const shouldListenRef = useRef(false)

  useEffect(() => {
    if (loaded && !userId) router.replace('/')
  }, [loaded, userId, router])

  function handleImageFiles(files: File[]) {
    const remaining = MAX_IMAGES - imagePreviews.length
    const toAdd = files.slice(0, remaining)

    const oversized = toAdd.filter(f => f.size > 5 * 1024 * 1024)
    if (oversized.length > 0) { setError('الصورة أكبر من 5 ميجابايت، اختار صورة أصغر'); return }

    toAdd.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target?.result as string
        setImagePreviews(prev => [...prev, base64])
        setImageBase64Array(prev => [...prev, base64])
      }
      reader.readAsDataURL(file)
    })
    setError('')
  }

  function removeImage(index: number) {
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
    setImageBase64Array(prev => prev.filter((_, i) => i !== index))
  }

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
      if (final) setQuestion(prev => prev + (prev ? ' ' : '') + final)
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

  async function askAI(q?: string) {
    const finalQuestion = q || question
    if (!subject || (!finalQuestion.trim() && imageBase64Array.length === 0)) {
      setError('اكتب سؤالك أو اللي مش فاهمه')
      return
    }
    setError('')
    setLoading(true)
    setStep('result')
    setExplanation('')

    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, question: finalQuestion, imageBase64Array, grade: 6 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setExplanation(data.explanation)
      setQuickActions(data.quickActions || [])
    } catch {
      setExplanation('آسف، في مشكلة. حاول تاني!')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setStep('subject')
    setSubject(null)
    setQuestion('')
    setImagePreviews([])
    setImageBase64Array([])
    setExplanation('')
    setError('')
  }

  const selectedSubject = SUBJECTS.find(s => s.value === subject)
  const canAddMore = imagePreviews.length < MAX_IMAGES

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50 p-4" dir="rtl">
      <div className="max-w-md mx-auto pt-2 pb-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => step === 'subject' ? router.push('/hub') : step === 'question' ? setStep('subject') : (() => { setStep('question'); setExplanation('') })()}
            className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-slate-500 text-lg"
          >←</button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">مساعد الذكاء الاصطناعي 🤖</h1>
            <p className="text-xs text-slate-400">اسألني أي حاجة مش فاهمها</p>
          </div>
        </div>

        {/* Step 1 — Pick Subject */}
        {step === 'subject' && (
          <div className="animate-fade-in">
            <div className="text-center mb-6">
              <div className="text-5xl mb-2">🤔</div>
              <h2 className="text-xl font-bold text-slate-800">في أنهي مادة عايز مساعدة؟</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {SUBJECTS.map(s => (
                <button
                  key={s.value}
                  onClick={() => { setSubject(s.value); setStep('question') }}
                  className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-sm hover:scale-105 hover:shadow-md active:scale-95 transition-all"
                >
                  <span className="text-3xl">{s.emoji}</span>
                  <span className="text-xs font-semibold text-slate-700 text-center leading-tight">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Ask Question */}
        {step === 'question' && selectedSubject && (
          <div className="animate-fade-in">

            {/* Subject badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${selectedSubject.color} text-white text-sm font-bold mb-5 shadow`}>
              <span>{selectedSubject.emoji}</span>
              <span>{selectedSubject.label}</span>
            </div>

            <h2 className="text-xl font-bold text-slate-800 mb-1">إيه اللي مش فاهمه؟ 🤷</h2>
            <p className="text-slate-500 text-sm mb-4">اكتب أو اتكلم أو ابعت صور من الكتاب (حتى {MAX_IMAGES} صور)</p>

            {/* Image previews grid */}
            {imagePreviews.length > 0 && (
              <div className="mb-3 grid grid-cols-3 gap-2">
                {imagePreviews.map((preview, i) => (
                  <div key={i} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt={`صورة ${i + 1}`} className="w-full h-20 object-cover rounded-xl shadow-sm" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-1 left-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Text area */}
            <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden mb-3">
              <textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="مثال: مش فاهم إزاي أعرب الجملة الاسمية... أو إيه قانون المساحة؟"
                className="w-full h-32 p-4 text-slate-700 resize-none focus:outline-none text-sm leading-relaxed"
                dir="rtl"
              />
              <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50">
                <div className="flex gap-2">
                  {/* Camera */}
                  {canAddMore && (
                    <button
                      onClick={() => cameraRef.current?.click()}
                      className="p-2 rounded-xl bg-white border border-slate-200 text-lg hover:bg-slate-50 transition-all"
                      title="التقط صورة"
                    >📷</button>
                  )}
                  {/* Gallery */}
                  {canAddMore && (
                    <button
                      onClick={() => galleryRef.current?.click()}
                      className="p-2 rounded-xl bg-white border border-slate-200 text-lg hover:bg-slate-50 transition-all"
                      title="اختر من المعرض"
                    >🖼️</button>
                  )}
                  {imagePreviews.length > 0 && (
                    <span className="text-xs text-blue-600 font-medium self-center">
                      {imagePreviews.length}/{MAX_IMAGES} صور
                    </span>
                  )}
                </div>
                {/* Mic */}
                <button
                  onClick={toggleVoice}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    listening ? 'bg-red-500 text-white animate-pulse' : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
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

            {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}

            {/* Quick Actions */}
            <div className="mb-4">
              <p className="text-xs text-slate-400 mb-2 font-medium">أو اختار سؤال سريع:</p>
              <div className="flex flex-wrap gap-2">
                {(QUICK_ACTIONS[subject!] || []).map((action, i) => (
                  <button
                    key={i}
                    onClick={() => { setQuestion(action); askAI(action) }}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 transition-all"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => askAI()}
              disabled={!question.trim() && imageBase64Array.length === 0}
              className="w-full py-4 bg-gradient-to-r from-violet-500 to-blue-600 disabled:from-slate-300 disabled:to-slate-400 text-white text-lg font-bold rounded-2xl shadow-lg active:scale-95 transition-all"
            >
              🤖 اشرحلي!
            </button>

            {/* Hidden inputs */}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={e => { if (e.target.files?.[0]) handleImageFiles([e.target.files[0]]); e.target.value = '' }}
              className="hidden"
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              multiple
              onChange={e => { if (e.target.files) handleImageFiles(Array.from(e.target.files)); e.target.value = '' }}
              className="hidden"
            />
          </div>
        )}

        {/* Step 3 — Result */}
        {step === 'result' && (
          <div className="animate-fade-in">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${selectedSubject?.color} text-white text-sm font-bold mb-5 shadow`}>
              <span>{selectedSubject?.emoji}</span>
              <span>{selectedSubject?.label}</span>
            </div>

            {/* Question recap */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4">
              <p className="text-xs text-slate-400 mb-1">سؤالك هو</p>
              <p className="text-sm text-slate-700 font-medium">{question}</p>
              {imagePreviews.length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {imagePreviews.map((preview, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={preview} alt={`صورة ${i + 1}`} className="h-16 rounded-xl object-cover shadow-sm" />
                  ))}
                </div>
              )}
            </div>

            {/* Explanation */}
            <div className="bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-100 rounded-2xl p-5 mb-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🤖</span>
                <span className="font-bold text-violet-700 text-sm">شرح المساعد الذكي 🤖</span>
              </div>
              {loading ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="text-4xl animate-bounce">🧠</div>
                  <p className="text-violet-600 font-medium text-sm">بيفكر وبيشرحلك...</p>
                </div>
              ) : (
                <p className="text-slate-700 leading-relaxed text-sm whitespace-pre-wrap">{explanation}</p>
              )}
            </div>

            {/* Quick follow-up actions */}
            {!loading && quickActions.length > 0 && (
              <div className="mb-5">
                <p className="text-xs text-slate-400 mb-2 font-medium">أسئلة تانية ممكن تسألها:</p>
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => { setQuestion(action); askAI(action) }}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:border-violet-300 hover:bg-violet-50 transition-all"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!loading && (
              <div className="space-y-3">
                <button
                  onClick={() => { setStep('question'); setExplanation('') }}
                  className="w-full py-3 bg-white border-2 border-violet-200 text-violet-700 font-bold rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all"
                >
                  🔄 اسأل سؤال تاني
                </button>
                <button
                  onClick={reset}
                  className="w-full py-3 bg-gradient-to-r from-violet-500 to-blue-600 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all"
                >
                  📚 مادة تانية
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  )
}

// Quick actions per subject
const QUICK_ACTIONS: Record<Subject, string[]> = {
  arabic:         ['اشرحلي القاعدة بمثال', 'الفرق بين كلمتين', 'أعرب الجملة دي', 'صحح الغلطة الإملائية'],
  math:           ['احل المسألة دي خطوة خطوة', 'اشرحلي القانون', 'ديني مثال أسهل', 'إيه الفرق بين العمليتين؟'],
  science:        ['اشرح بمثال من الحياة', 'ليه بيحصل ده؟', 'إيه الفرق بين المفهومين؟', 'لخصلي الدرس'],
  english:        ['Explain in simple Arabic', 'Give me examples', 'What does this word mean?', 'Fix my sentence'],
  social_studies: ['فين ده على الخريطة؟', 'ليه حصل ده؟', 'امتى كان ده؟', 'اشرح على شكل قصة'],
  religion:       ['اشرحلي معنى الآية', 'إيه حكم المسألة دي؟', 'ديني مثال', 'لخصلي الدرس'],
  computer:       ['اشرح بمثال عملي', 'إيه الفرق بين المصطلحين؟', 'إزاي التقنية دي بتشتغل؟', 'ديني تمرين'],
  art:            ['اشرحلي التقنية دي', 'إزاي أرسم ده؟', 'إيه الألوان المناسبة؟', 'ديني فكرة مشروع'],
  other:          ['اشرح بطريقة أبسط', 'ديني مثال', 'لخصلي الفكرة', 'إزاي أحفظ ده؟'],
}
