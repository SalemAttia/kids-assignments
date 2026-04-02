'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useStudySession } from '@/hooks/useStudySession'
import { uploadStudyImage } from '@/lib/supabase/storage'
import { SUBJECT_LABELS, type Subject } from '@/types'

const SUBJECTS = Object.entries(SUBJECT_LABELS) as [Subject, string][]

export default function StudyPage() {
  const router = useRouter()
  const { userId, loaded } = useCurrentUser()
  const { setSessionId } = useStudySession()

  const [subject, setSubject] = useState<Subject | null>(null)
  const [description, setDescription] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (loaded && !userId) router.replace('/')
  }, [loaded, userId, router])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('حجم الصورة يجب أن يكون أقل من 5 ميجابايت')
      return
    }
    setImage(file)
    setImagePreview(URL.createObjectURL(file))
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject) { setError('يرجى اختيار المادة'); return }
    if (description.trim().length < 10) { setError('يرجى كتابة وصف أكثر تفصيلاً (10 أحرف على الأقل)'); return }

    setLoading(true)
    setError('')

    try {
      let imageUrl: string | undefined
      if (image && userId) {
        imageUrl = await uploadStudyImage(image, userId)
      }

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subject, description, imageUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'حدث خطأ')

      setSessionId(data.sessionId)
      router.push('/quiz')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center gap-3">
          <button onClick={() => router.push('/')} className="text-slate-400 hover:text-slate-600">
            ← رجوع
          </button>
          <h1 className="text-2xl font-bold text-blue-800">تسجيل جلسة دراسة</h1>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-blue-700 font-medium">📚 الخطوة الأولى: أخبرنا ماذا درست اليوم</p>
          <p className="text-blue-600 text-sm mt-1">بعد ذلك سنولّد لك أسئلة لاختبار فهمك</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Subject Picker */}
          <div>
            <label className="block text-lg font-semibold text-slate-700 mb-3">اختر المادة</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SUBJECTS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSubject(value)}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    subject === value
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-lg font-semibold text-slate-700 mb-2">
              ماذا درست اليوم؟
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب ملخصاً لما درسته... مثال: درست اليوم الجمل الاسمية والفعلية في اللغة العربية، وتعلمت الفرق بين المبتدأ والخبر"
              className="w-full h-40 p-4 border-2 border-slate-200 rounded-xl text-slate-700 resize-none focus:outline-none focus:border-blue-400 bg-white"
              dir="rtl"
            />
            <p className="text-xs text-slate-400 mt-1">{description.length} حرف</p>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-lg font-semibold text-slate-700 mb-2">
              صورة من الكتاب أو الدفتر (اختياري)
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-white">
              {imagePreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="معاينة" className="max-h-48 mx-auto rounded-lg" />
                  <button
                    type="button"
                    onClick={() => { setImage(null); setImagePreview(null) }}
                    className="mt-3 text-sm text-red-500 hover:text-red-700"
                  >
                    إزالة الصورة
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="text-4xl mb-2">📷</div>
                  <p className="text-slate-500">اضغط لاختيار صورة</p>
                  <p className="text-xs text-slate-400 mt-1">الحد الأقصى 5 ميجابايت</p>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xl font-bold rounded-xl transition-colors"
          >
            {loading ? 'جاري الحفظ...' : 'حفظ وانتقل للأسئلة ←'}
          </button>
        </form>
      </div>
    </main>
  )
}
