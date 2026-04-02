'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useStudySession } from '@/hooks/useStudySession'
import { createClient } from '@/lib/supabase/client'
import type { Question } from '@/types'

export default function QuizPage() {
  const router = useRouter()
  const { userId, loaded } = useCurrentUser()
  const { getSessionId, getQuestions, setQuestions, setReportId } = useStudySession()

  const [questions, setQuestionsState] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loaded) return
    if (!userId) { router.replace('/'); return }
    const sessionId = getSessionId()
    if (!sessionId) { router.replace('/study'); return }

    const cached = getQuestions()
    if (cached.length > 0) {
      setQuestionsState(cached)
      setLoading(false)
      return
    }

    // Fetch user grade, then generate questions
    const generate = async () => {
      const { data: session } = await createClient()
        .from('study_sessions')
        .select('subject, description, image_url, users(grade)')
        .eq('id', sessionId)
        .single()

      if (!session) { router.replace('/study'); return }

      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          subject: session.subject,
          description: session.description,
          grade: (session.users as unknown as {grade: number}).grade,
          imageUrl: session.image_url || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'فشل توليد الأسئلة'); setLoading(false); return }

      setQuestions(data.questions)
      setQuestionsState(data.questions)
      setLoading(false)
    }

    generate()
  }, [loaded, userId, router, getSessionId, getQuestions, setQuestions])

  function handleAnswer(questionId: string, value: string) {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  async function handleSubmit() {
    const unanswered = questions.filter(q => !answers[q.id])
    if (unanswered.length > 0) {
      setError('يرجى الإجابة على جميع الأسئلة')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const sessionId = getSessionId()
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          answers: Object.entries(answers).map(([questionId, answerText]) => ({ questionId, answerText })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل التقييم')

      setReportId(data.report.id)
      sessionStorage.setItem('reportData', JSON.stringify(data))
      router.push('/report')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="text-5xl animate-bounce">🤔</div>
      <p className="text-xl text-blue-700 font-semibold">جاري إنشاء الأسئلة...</p>
      <p className="text-slate-500">يرجى الانتظار لحظة</p>
    </div>
  )

  if (error && questions.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
      <div className="text-5xl">❌</div>
      <p className="text-xl text-red-600">{error}</p>
      <button onClick={() => router.replace('/study')} className="px-6 py-3 bg-blue-600 text-white rounded-xl">
        العودة للدراسة
      </button>
    </div>
  )

  const current = questions[currentIndex]
  const progress = Math.round(((currentIndex + 1) / questions.length) * 100)

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-xl font-bold text-blue-800">الأسئلة</h1>
            <span className="text-sm text-slate-500">سؤال {currentIndex + 1} من {questions.length}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
          <p className="text-lg font-semibold text-slate-800 mb-6 leading-relaxed">{current.question_text}</p>

          {current.question_type === 'multiple_choice' && current.options ? (
            <div className="space-y-3">
              {current.options.map((option) => (
                <button
                  key={option}
                  onClick={() => handleAnswer(current.id, option)}
                  className={`w-full text-right p-4 rounded-xl border-2 transition-all ${
                    answers[current.id] === option
                      ? 'border-blue-500 bg-blue-50 text-blue-800 font-semibold'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              value={answers[current.id] || ''}
              onChange={(e) => handleAnswer(current.id, e.target.value)}
              placeholder="اكتب إجابتك هنا..."
              className="w-full h-32 p-4 border-2 border-slate-200 rounded-xl resize-none focus:outline-none focus:border-blue-400"
              dir="rtl"
            />
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 mb-4">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {currentIndex > 0 && (
            <button
              onClick={() => setCurrentIndex(i => i - 1)}
              className="flex-1 py-3 border-2 border-slate-300 text-slate-600 rounded-xl font-semibold hover:border-slate-400"
            >
              → السابق
            </button>
          )}
          {currentIndex < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIndex(i => i + 1)}
              disabled={!answers[current.id]}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-200 text-white rounded-xl font-semibold transition-colors"
            >
              ← التالي
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-200 text-white rounded-xl font-bold text-lg transition-colors"
            >
              {submitting ? 'جاري التقييم...' : '✅ تسليم الإجابات'}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
