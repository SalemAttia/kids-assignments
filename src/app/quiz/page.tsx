'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useStudySession } from '@/hooks/useStudySession'
import { createClient } from '@/lib/supabase/client'
import type { Question } from '@/types'
import BottomNav from '@/components/BottomNav'

const ENCOURAGEMENTS = [
  'برافو! كمل! 💪',
  'ممتاز! استمر! 🌟',
  'أنت بطل! 🏆',
  'رائع! كمل! 🎉',
  'شاطر! الجاي! 🚀',
]

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
  const [showExitSheet, setShowExitSheet] = useState(false)
  const [justAnswered, setJustAnswered] = useState(false)

  useEffect(() => {
    if (!loaded) return
    if (!userId) { router.replace('/'); return }
    const sessionId = getSessionId()
    if (!sessionId) { router.replace('/study'); return }

    const cached = getQuestions(sessionId)
    if (cached.length > 0) {
      setQuestionsState(cached)
      setLoading(false)
      return
    }

    const generate = async () => {
      const { data: session } = await createClient()
        .from('study_sessions')
        .select('subject, description, image_url, users(grade)')
        .eq('id', sessionId)
        .single()

      if (!session) { router.replace('/study'); return }

      // Parse image_url — may be a JSON array or a single URL
      let imageUrls: string[] | undefined
      if (session.image_url) {
        try {
          const parsed = JSON.parse(session.image_url)
          imageUrls = Array.isArray(parsed) ? parsed : [session.image_url]
        } catch {
          imageUrls = [session.image_url]
        }
      }

      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          subject: session.subject,
          description: session.description,
          grade: (session.users as unknown as {grade: number}).grade,
          imageUrls,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'في مشكلة في عمل الأسئلة'); setLoading(false); return }

      setQuestions(data.questions, sessionId)
      setQuestionsState(data.questions)
      setLoading(false)
    }

    generate()
  }, [loaded, userId, router, getSessionId, getQuestions, setQuestions])

  function handleAnswer(questionId: string, value: string) {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
    setJustAnswered(true)
    setTimeout(() => setJustAnswered(false), 600)
  }

  function handleNext() {
    setCurrentIndex(i => i + 1)
  }

  function handleSkip() {
    handleAnswer(current.id, 'مش عارف')
    if (currentIndex < questions.length - 1) setCurrentIndex(i => i + 1)
  }

  async function handleSubmit() {
    const finalAnswers = { ...answers }
    questions.forEach(q => { if (!finalAnswers[q.id]) finalAnswers[q.id] = 'مش عارف' })
    setAnswers(finalAnswers)
    setSubmitting(true)
    setError('')

    try {
      const sessionId = getSessionId()
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          answers: Object.entries(finalAnswers).map(([questionId, answerText]) => ({ questionId, answerText })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'في مشكلة في التقييم')

      setReportId(data.report.id)
      sessionStorage.setItem('reportData', JSON.stringify(data))
      router.push('/report')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'في مشكلة')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="text-6xl animate-bounce">🤔</div>
      <p className="text-xl text-blue-700 font-bold">بيتم عمل الأسئلة...</p>
      <p className="text-slate-400 text-sm">استنى شوية!</p>
    </div>
  )

  if (error && questions.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="text-6xl">😅</div>
      <p className="text-xl text-red-600 font-bold text-center">{error}</p>
      <button onClick={() => router.replace('/study')} className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold text-lg">
        ارجع وحاول تاني
      </button>
    </div>
  )

  const current = questions[currentIndex]
  const progress = Math.round(((currentIndex + 1) / questions.length) * 100)
  const encouragement = ENCOURAGEMENTS[currentIndex % ENCOURAGEMENTS.length]
  const isAnswered = !!answers[current.id]

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4" dir="rtl">
      <div className="max-w-2xl mx-auto pb-28">

        {/* Header */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-blue-700">{currentIndex + 1}</span>
              <span className="text-slate-400 text-sm font-medium">/ {questions.length}</span>
            </div>
            <div className="text-sm font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
              {progress}% ✨
            </div>
            <button
              onClick={() => setShowExitSheet(true)}
              className="text-xs text-slate-400 hover:text-red-400 bg-white px-3 py-1.5 rounded-xl shadow-sm transition-colors"
            >
              ✕ خروج
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Encouragement */}
        {justAnswered && (
          <div className="text-center text-green-600 font-bold text-lg mb-3 animate-bounce">
            {encouragement}
          </div>
        )}

        {/* Question Card */}
        <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-100 mb-5">
          <p className="text-lg font-bold text-slate-800 mb-6 leading-relaxed">{current.question_text}</p>

          {current.question_type === 'multiple_choice' && current.options ? (
            <div className="space-y-3">
              {current.options.map((option) => (
                <button
                  key={option}
                  onClick={() => handleAnswer(current.id, option)}
                  className={`w-full text-right p-4 rounded-2xl border-2 font-semibold transition-all active:scale-98 ${
                    answers[current.id] === option
                      ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-md'
                      : 'border-slate-100 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50/50'
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
              placeholder="اكتب إجابتك هنا... 📝"
              className="w-full h-32 p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 resize-none focus:outline-none focus:border-blue-400 focus:bg-white text-slate-700 transition-all"
              dir="rtl"
            />
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 mb-4 text-center">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {currentIndex > 0 && (
            <button
              onClick={() => setCurrentIndex(i => i - 1)}
              className="px-5 py-3.5 border-2 border-slate-200 bg-white text-slate-600 rounded-2xl font-bold hover:border-slate-300 transition-all"
            >
              → رجوع
            </button>
          )}

          {!isAnswered && (
            <button
              onClick={handleSkip}
              className="flex-1 py-3.5 border-2 border-orange-200 bg-orange-50 text-orange-600 rounded-2xl font-bold hover:bg-orange-100 transition-all"
            >
              🤷 مش عارف
            </button>
          )}

          {currentIndex < questions.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!isAnswered}
              className="flex-1 py-3.5 bg-gradient-to-r from-blue-500 to-purple-600 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-2xl font-bold text-lg shadow-md transition-all active:scale-95"
            >
              الجاي ←
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-3.5 bg-gradient-to-r from-green-500 to-teal-500 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-2xl font-black text-lg shadow-md transition-all active:scale-95"
            >
              {submitting ? '⏳ بيتم التقييم...' : '✅ سلم الإجابات!'}
            </button>
          )}
        </div>
      </div>

      {/* Exit Confirmation Sheet */}
      {showExitSheet && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setShowExitSheet(false)}>
          <div
            className="w-full bg-white rounded-t-3xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🤔</div>
              <h2 className="text-xl font-black text-slate-800">عايز تخرج؟</h2>
              <p className="text-slate-500 text-sm mt-1">
                إجاباتك مش هتتحفظ لو خرجت دلوقتي
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/hub')}
                className="w-full py-4 bg-red-500 text-white font-bold rounded-2xl text-lg active:scale-95 transition-all"
              >
                🚪 أيوه، خروج
              </button>
              <button
                onClick={() => setShowExitSheet(false)}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-2xl text-lg active:scale-95 transition-all"
              >
                📚 لا، كمل معايا!
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  )
}
