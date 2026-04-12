'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { createClient } from '@/lib/supabase/client'
import type { Question } from '@/types'

export const dynamic = 'force-dynamic'

const PRESCHOOL_SUBJECTS = ['math', 'arabic', 'english'] as const
type PSubject = typeof PRESCHOOL_SUBJECTS[number]

function isPreschoolSubject(s: string | null): s is PSubject {
  return !!s && (PRESCHOOL_SUBJECTS as readonly string[]).includes(s)
}

export default function PreschoolQuizPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-7xl animate-bounce">🧸</div>
        <p className="text-xl text-pink-600 font-bold">بنجهز الأسئلة...</p>
      </div>
    }>
      <PreschoolQuizInner />
    </Suspense>
  )
}

function PreschoolQuizInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userId, loaded } = useCurrentUser()

  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!loaded) return
    if (!userId) { router.replace('/'); return }

    const subject = searchParams.get('subject')
    if (!isPreschoolSubject(subject)) {
      router.replace('/preschool/hub')
      return
    }

    if (startedRef.current) return
    startedRef.current = true

    const start = async () => {
      // Guard: confirm the user is actually preschool
      const { data: user } = await createClient()
        .from('users')
        .select('is_preschool')
        .eq('id', userId)
        .single()
      if (!user) { router.replace('/'); return }
      if (!user.is_preschool) { router.replace('/hub'); return }

      // Create session
      const sessionRes = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subject }),
      })
      const sessionData = await sessionRes.json()
      if (!sessionRes.ok) {
        setError(sessionData.error || 'في مشكلة')
        setLoading(false)
        return
      }
      sessionIdRef.current = sessionData.sessionId

      // Generate questions
      const qRes = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          subject,
          description: '',
          grade: 0,
        }),
      })
      const qData = await qRes.json()
      if (!qRes.ok) {
        setError(qData.error || 'في مشكلة في عمل الأسئلة')
        setLoading(false)
        return
      }

      setQuestions(qData.questions)
      setLoading(false)
    }

    start()
  }, [loaded, userId, router, searchParams])

  const current = questions[currentIndex]

  function handleTap(option: string) {
    if (!current || feedback !== null || submitting) return
    const correct = option === current.correct_answer
    setFeedback(correct ? 'correct' : 'wrong')
    setAnswers(prev => ({ ...prev, [current.id]: option }))

    setTimeout(() => {
      setFeedback(null)
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(i => i + 1)
      } else {
        submit({ ...answers, [current.id]: option })
      }
    }, 900)
  }

  async function submit(finalAnswers: Record<string, string>) {
    const sessionId = sessionIdRef.current
    if (!sessionId) return
    setSubmitting(true)
    try {
      questions.forEach(q => { if (!finalAnswers[q.id]) finalAnswers[q.id] = '' })
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          answers: Object.entries(finalAnswers).map(([questionId, answerText]) => ({ questionId, answerText })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'في مشكلة')

      // Stash report for the report page + a simple local per-question summary
      sessionStorage.setItem('preschoolReport', JSON.stringify({
        pointsEarned: data.pointsEarned,
        feedback: data.report?.feedback ?? '',
        totalQuestions: questions.length,
        correctCount: Object.entries(finalAnswers).filter(
          ([qid, ans]) => questions.find(q => q.id === qid)?.correct_answer === ans
        ).length,
      }))
      router.push('/preschool/report')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'في مشكلة')
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="text-7xl animate-bounce">🧸</div>
      <p className="text-xl text-pink-600 font-bold">بنجهز الأسئلة...</p>
    </div>
  )

  if (error && questions.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
      <div className="text-6xl">😅</div>
      <p className="text-xl text-red-600 font-bold text-center">{error}</p>
      <button
        onClick={() => router.replace('/preschool/hub')}
        className="px-8 py-3 bg-pink-600 text-white rounded-2xl font-bold text-lg"
      >
        ارجع للصفحة الرئيسية
      </button>
    </div>
  )

  if (!current) return null

  return (
    <main className="min-h-screen flex flex-col items-center p-4" dir="rtl">
      {/* Top bar: exit + dots */}
      <div className="w-full max-w-md flex items-center justify-between pt-2 pb-6">
        <button
          onClick={() => router.replace('/preschool/hub')}
          className="text-slate-500 hover:text-red-500 bg-white/70 w-10 h-10 rounded-full shadow-sm text-xl font-bold"
          aria-label="خروج"
        >
          ✕
        </button>
        <div className="flex gap-2">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${i < currentIndex ? 'bg-green-500' : i === currentIndex ? 'bg-pink-500' : 'bg-slate-300'}`}
            />
          ))}
        </div>
        <div className="w-10" />
      </div>

      {/* Question */}
      <div className="w-full max-w-md flex-1 flex flex-col justify-center">
        <div className="bg-white rounded-3xl p-8 shadow-xl mb-6 text-center min-h-40 flex items-center justify-center">
          <p className="text-3xl font-black text-slate-800 leading-relaxed">{current.question_text}</p>
        </div>

        {/* Feedback overlay */}
        {feedback && (
          <div className="text-center mb-4">
            <div className="text-7xl animate-bounce">
              {feedback === 'correct' ? '🎉' : '💪'}
            </div>
            <div className="text-2xl font-black text-pink-600 mt-1">
              {feedback === 'correct' ? 'شاطر!' : 'كمل يا بطل!'}
            </div>
          </div>
        )}

        {/* Two big option buttons */}
        {!feedback && current.options && (
          <div className="flex flex-col gap-4">
            {current.options.slice(0, 2).map((option, i) => (
              <button
                key={option}
                onClick={() => handleTap(option)}
                disabled={submitting}
                className={`w-full min-h-28 rounded-3xl text-4xl font-black text-white shadow-xl active:scale-95 transition-all ${
                  i === 0
                    ? 'bg-gradient-to-br from-blue-400 to-indigo-500'
                    : 'bg-gradient-to-br from-pink-400 to-orange-400'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>

      {submitting && (
        <p className="text-pink-600 font-bold text-lg mt-4">بنحفظ النتيجة...</p>
      )}
    </main>
  )
}
