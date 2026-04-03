'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useStudySession } from '@/hooks/useStudySession'
import { uploadStudyImages } from '@/lib/supabase/storage'
import { type Subject } from '@/types'
import { useEffect } from 'react'
import BottomNav from '@/components/BottomNav'

const SUBJECTS: { value: Subject; label: string; emoji: string; color: string; bg: string }[] = [
  { value: 'arabic',        label: 'اللغة العربية',      emoji: '📖', color: 'from-purple-500 to-purple-600',  bg: 'bg-purple-50 border-purple-300' },
  { value: 'math',          label: 'الرياضيات',           emoji: '🔢', color: 'from-blue-500 to-blue-600',      bg: 'bg-blue-50 border-blue-300' },
  { value: 'science',       label: 'العلوم',              emoji: '🔬', color: 'from-green-500 to-green-600',    bg: 'bg-green-50 border-green-300' },
  { value: 'english',       label: 'اللغة الإنجليزية',   emoji: '💬', color: 'from-yellow-500 to-orange-500',  bg: 'bg-yellow-50 border-yellow-300' },
  { value: 'social_studies',label: 'الدراسات الاجتماعية',emoji: '🌍', color: 'from-orange-500 to-red-500',     bg: 'bg-orange-50 border-orange-300' },
  { value: 'religion',      label: 'التربية الدينية',     emoji: '🌙', color: 'from-teal-500 to-cyan-600',      bg: 'bg-teal-50 border-teal-300' },
]

const HINTS = [
  'إيه كان الموضوع الأساسي؟',
  'إيه اللي فهمته كويس؟',
  'اتعلمت قاعدة أو معادلة جديدة؟',
  'إيه الأمثلة اللي شرحها المدرس؟',
  'في حاجة مش فاهمها تماماً؟',
]

const MAX_IMAGES = 5

export default function StudyPage() {
  const router = useRouter()
  const { userId, loaded } = useCurrentUser()
  const { setSessionId } = useStudySession()

  const [step, setStep] = useState(1)
  const [subject, setSubject] = useState<Subject | null>(null)
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [listening, setListening] = useState(false)
  const [hintIndex, setHintIndex] = useState(0)
  const recognitionRef = useRef<any>(null)
  const shouldListenRef = useRef(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    if (loaded && !userId) router.replace('/')
  }, [loaded, userId, router])

  useEffect(() => {
    const t = setInterval(() => setHintIndex(i => (i + 1) % HINTS.length), 3000)
    return () => clearInterval(t)
  }, [])

  function startRecognition() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR || !shouldListenRef.current) return

    const rec = new SR()
    rec.lang = 'ar'
    rec.continuous = false
    rec.interimResults = true

    rec.onresult = (e: any) => {
      let finalText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript
      }
      if (finalText) setDescription(prev => prev + (prev ? ' ' : '') + finalText)
    }

    rec.onend = () => {
      if (shouldListenRef.current) startRecognition()
      else setListening(false)
    }

    rec.onerror = (e: any) => {
      if (e.error === 'no-speech') return
      shouldListenRef.current = false
      setListening(false)
      if (e.error === 'not-allowed') {
        setError('🎤 اسمح للميكروفون من إعدادات المتصفح')
      }
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
      return
    }

    shouldListenRef.current = true
    setListening(true)
    startRecognition()
  }

  function handleImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const remaining = MAX_IMAGES - images.length
    const toAdd = files.slice(0, remaining)

    const oversized = toAdd.filter(f => f.size > 5 * 1024 * 1024)
    if (oversized.length > 0) { setError('حجم كل صورة لازم يكون أقل من 5 ميجابايت'); return }

    setImages(prev => [...prev, ...toAdd])
    setImagePreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))])
    setError('')
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  function removeImage(index: number) {
    setImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    if (!subject) return
    if (description.trim().length < 10) { setError('اكتب أكتر شوية! (10 أحرف على الأقل) ✏️'); return }

    setLoading(true)
    setError('')

    try {
      let imageUrls: string[] | undefined
      if (images.length > 0 && userId) {
        imageUrls = await uploadStudyImages(images, userId)
      }

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subject,
          description,
          imageUrls,
          durationMinutes: Math.round((Date.now() - startTimeRef.current) / 60000),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'في مشكلة')

      setSessionId(data.sessionId)
      router.push('/quiz')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'في مشكلة مش متوقعة')
    } finally {
      setLoading(false)
    }
  }

  const selectedSubject = SUBJECTS.find(s => s.value === subject)
  const canAddMore = images.length < MAX_IMAGES

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4" dir="rtl">
      <div className="max-w-xl mx-auto pb-28">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pt-2">
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/')}
            className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-slate-500 hover:shadow-md transition-all text-lg"
          >
            ←
          </button>
          <div className="flex-1">
            <p className="text-xs text-slate-400 font-medium">الخطوة {step} من 3</p>
            <div className="flex gap-1.5 mt-1">
              {[1, 2, 3].map(n => (
                <div
                  key={n}
                  className={`h-2 rounded-full flex-1 transition-all duration-500 ${
                    n <= step ? 'bg-blue-500' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Step 1 — Pick Subject */}
        {step === 1 && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <div className="text-5xl mb-3">📚</div>
              <h1 className="text-2xl font-bold text-slate-800">إيه اللي ذاكرته النهارده؟</h1>
              <p className="text-slate-500 mt-1">اختار المادة اللي ذاكرتها</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {SUBJECTS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => { setSubject(s.value); setStep(2) }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 bg-white hover:scale-105 hover:shadow-lg active:scale-95 ${
                    subject === s.value ? s.bg + ' shadow-md scale-105' : 'border-slate-100 shadow-sm'
                  }`}
                >
                  <span className="text-3xl">{s.emoji}</span>
                  <span className="text-xs font-semibold text-slate-700 text-center leading-tight">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Description */}
        {step === 2 && selectedSubject && (
          <div className="animate-fade-in">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${selectedSubject.color} text-white text-sm font-bold mb-6 shadow`}>
              <span>{selectedSubject.emoji}</span>
              <span>{selectedSubject.label}</span>
            </div>

            <h1 className="text-2xl font-bold text-slate-800 mb-1">قولنا اتعلمت إيه! 🧠</h1>
            <p className="text-slate-500 text-sm mb-5">كل ما كتبت أكتر، الأسئلة بتبقى أدق وأحسن!</p>

            {/* Hint carousel */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4 flex items-center gap-3">
              <span className="text-xl flex-shrink-0">💡</span>
              <p className="text-amber-700 text-sm font-medium transition-all duration-300">{HINTS[hintIndex]}</p>
            </div>

            {/* Textarea + mic */}
            <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-100 overflow-hidden mb-3">
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="اكتب أو اتكلم... مثال: ذاكرت النهارده الجمل الاسمية واتعلمت الفرق بين المبتدأ والخبر"
                className="w-full h-44 p-4 text-slate-700 resize-none focus:outline-none text-sm leading-relaxed"
                dir="rtl"
              />
              <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50">
                <span className="text-xs text-slate-400">{description.length} حرف</span>
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    listening
                      ? 'bg-red-500 text-white shadow-lg animate-pulse'
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow hover:shadow-md'
                  }`}
                >
                  {listening ? '⏹ إيقاف' : '🎤 اتكلم'}
                </button>
              </div>
            </div>

            {listening && (
              <div className="flex items-center gap-2 text-red-500 text-sm font-medium mb-3 justify-center">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping inline-block" />
                بيتم التسجيل... اتكلم دلوقتي!
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-red-600 text-sm text-center mb-3">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (description.trim().length < 10) { setError('اكتب أكتر شوية! (10 أحرف على الأقل) ✏️'); return }
                setError('')
                setStep(3)
              }}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              الجاي ←
            </button>
          </div>
        )}

        {/* Step 3 — Photos + Submit */}
        {step === 3 && (
          <div className="animate-fade-in">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">📷</div>
              <h1 className="text-2xl font-bold text-slate-800">ضيف صور (اختياري)</h1>
              <p className="text-slate-500 text-sm mt-1">
                صور من الكتاب أو الدفتر بتساعدنا نسألك أسئلة أحسن! (حتى {MAX_IMAGES} صور)
              </p>
            </div>

            {/* Hidden inputs — allow multiple files */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImagesChange}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImagesChange}
              className="hidden"
            />

            {/* Image previews grid */}
            {imagePreviews.length > 0 && (
              <div className="mb-4 grid grid-cols-3 gap-2">
                {imagePreviews.map((preview, i) => (
                  <div key={i} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt={`صورة ${i + 1}`}
                      className="w-full h-24 object-cover rounded-xl shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 left-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add more / first upload buttons */}
            {canAddMore && (
              <div className={`grid gap-4 mb-6 ${imagePreviews.length === 0 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border-2 border-slate-100 shadow-sm hover:border-blue-300 hover:shadow-md active:scale-95 transition-all"
                >
                  <span className="text-4xl">📷</span>
                  <span className="text-sm font-bold text-slate-700">التقط صورة</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border-2 border-slate-100 shadow-sm hover:border-purple-300 hover:shadow-md active:scale-95 transition-all"
                >
                  <span className="text-4xl">🖼️</span>
                  <span className="text-sm font-bold text-slate-700">من المعرض</span>
                </button>
              </div>
            )}

            {images.length >= MAX_IMAGES && (
              <p className="text-center text-amber-600 text-sm mb-4 font-medium">
                وصلت للحد الأقصى ({MAX_IMAGES} صور)
              </p>
            )}

            {/* Summary card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
              <p className="text-xs text-slate-400 font-medium mb-2">ملخص جلسة المذاكرة</p>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{selectedSubject?.emoji}</span>
                <span className="font-bold text-slate-700">{selectedSubject?.label}</span>
                {images.length > 0 && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    {images.length} صورة
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{description}</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-red-600 text-sm text-center mb-4">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-teal-500 disabled:from-slate-300 disabled:to-slate-400 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              {loading ? '⏳ بيتم الحفظ...' : '🚀 ابدأ الأسئلة!'}
            </button>

            <p className="text-center text-slate-400 text-xs mt-3">تقدر تعدي إضافة الصور وتبدأ على طول</p>
          </div>
        )}

      </div>

      <BottomNav />
    </main>
  )
}
