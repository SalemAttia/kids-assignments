'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { SUBJECT_LABELS } from '@/types'
import type { Subject } from '@/types'
import BottomNav from '@/components/BottomNav'

interface AnswerReview {
  question_text: string
  student_answer: string
  correct_answer: string
  is_correct: boolean
  explanation: string
}

interface Report {
  id: string
  total_score: number
  feedback: string
  mistakes: unknown[]
  suggestions: string[]
  all_answers_review: AnswerReview[] | null
  created_at: string
}

interface SessionDetail {
  id: string
  subject: string
  description: string
  duration_minutes: number
  created_at: string
  reports: Report[]
}

function formatMinutes(m: number) {
  if (!m || m === 0) return null
  if (m < 60) return `${m} د`
  return `${Math.floor(m / 60)}س ${m % 60 > 0 ? `${m % 60}د` : ''}`
}

const SUBJECT_EMOJIS: Record<string, string> = {
  arabic: '📖', math: '🔢', science: '🔬', english: '💬',
  social_studies: '🌍', religion: '🌙', computer: '💻', art: '🎨', other: '📚',
}

const SCORE_GRADIENT: Record<string, string> = {
  excellent: 'from-yellow-400 via-orange-400 to-pink-500',
  good: 'from-blue-400 to-purple-500',
  low: 'from-red-400 to-rose-500',
}

export default function SessionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { userId, loaded } = useCurrentUser()
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const sessionId = params?.id as string

  useEffect(() => {
    if (!loaded) return
    if (!userId) { router.replace('/'); return }
    if (!sessionId) { router.replace('/progress'); return }

    fetch(`/api/session/${sessionId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setNotFound(true); setLoading(false); return }
        setSession(data.session)
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [loaded, userId, sessionId, router])

  if (!loaded || loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="text-5xl animate-bounce">📋</div>
    </div>
  )

  if (notFound || !session) return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4" dir="rtl">
      <div className="max-w-md mx-auto pt-10 text-center">
        <div className="text-6xl mb-4">😕</div>
        <p className="text-slate-500 mb-4">الجلسة دي مش موجودة</p>
        <button onClick={() => router.push('/progress')} className="px-6 py-3 bg-blue-500 text-white rounded-2xl font-bold">رجوع</button>
      </div>
      <BottomNav />
    </main>
  )

  const report = session.reports?.[0] ?? null
  const score = report?.total_score ?? null
  const isExcellent = score !== null && score >= 80
  const isGood = score !== null && score >= 60
  const gradientKey = isExcellent ? 'excellent' : isGood ? 'good' : 'low'
  const scoreEmoji = isExcellent ? '🌟' : isGood ? '👍' : '💪'
  const allAnswers: AnswerReview[] = report?.all_answers_review ?? []
  const correctCount = allAnswers.filter(a => a.is_correct).length

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4" dir="rtl">
      <div className="max-w-md mx-auto pt-2 pb-28 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/progress')}
            className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-slate-500 text-lg"
          >←</button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">تفاصيل الجلسة 📋</h1>
            <p className="text-xs text-slate-400">
              {new Date(session.created_at).toLocaleDateString('ar-EG', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Subject + duration */}
        <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <span className="text-4xl">{SUBJECT_EMOJIS[session.subject] ?? '📚'}</span>
          <div className="flex-1">
            <p className="font-bold text-slate-700 text-lg">{SUBJECT_LABELS[session.subject as Subject] ?? session.subject}</p>
            {session.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{session.description}</p>}
          </div>
          {formatMinutes(session.duration_minutes) && (
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-xl">⏱ {formatMinutes(session.duration_minutes)}</span>
          )}
        </div>

        {/* Score card */}
        {score !== null ? (
          <>
            <div className={`bg-gradient-to-br ${SCORE_GRADIENT[gradientKey]} rounded-3xl p-6 text-center text-white shadow-xl`}>
              <div className="text-5xl mb-2">{scoreEmoji}</div>
              <div className="text-7xl font-black mb-1">{score}</div>
              <div className="text-white/80 text-base mb-2">من 100</div>
              {allAnswers.length > 0 && (
                <div className="text-sm text-white/70">{correctCount} صح من {allAnswers.length} سؤال</div>
              )}
            </div>

            {/* Feedback */}
            {report.feedback && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-blue-50">
                <h2 className="font-black text-slate-700 mb-2 flex items-center gap-2">
                  <span>💬</span> رأي المدرس
                </h2>
                <p className="text-slate-600 leading-relaxed text-sm">{report.feedback}</p>
              </div>
            )}

            {/* Q&A Review */}
            {allAnswers.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-black text-slate-700 flex items-center gap-2">
                    <span>📋</span> الأسئلة والإجابات
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isExcellent ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {correctCount}/{allAnswers.length}
                  </span>
                </div>
                <div className="divide-y divide-slate-50">
                  {allAnswers.map((a, i) => (
                    <div key={i} className={`p-4 ${a.is_correct ? 'bg-green-50' : 'bg-red-50'}`}>
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-xl flex-shrink-0">{a.is_correct ? '✅' : '❌'}</span>
                        <p className="text-sm font-bold text-slate-700 leading-snug">{a.question_text}</p>
                      </div>
                      <div className="mr-8 space-y-1">
                        <p className={`text-sm ${a.is_correct ? 'text-green-700' : 'text-red-600'}`}>
                          إجابتك: <span className="font-bold">{a.student_answer || '—'}</span>
                        </p>
                        {!a.is_correct && (
                          <p className="text-sm text-green-700">
                            الصح: <span className="font-bold">{a.correct_answer}</span>
                          </p>
                        )}
                        {a.explanation && (
                          <p className="text-xs text-slate-500 bg-white rounded-xl p-3 mt-1 leading-relaxed">{a.explanation}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No all_answers_review but report exists */}
            {allAnswers.length === 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm text-center text-slate-400 text-sm">
                تفاصيل الإجابات مش متاحة للجلسات القديمة
              </div>
            )}

            {/* Suggestions */}
            {report.suggestions && report.suggestions.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-purple-50">
                <h2 className="font-black text-slate-700 mb-3 flex items-center gap-2 text-base">
                  <span>💡</span> نصايح عشان تبقى أحسن
                </h2>
                <ul className="space-y-2">
                  {report.suggestions.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-600 bg-purple-50 rounded-xl p-3">
                      <span className="text-purple-400 flex-shrink-0 font-bold">{i + 1}.</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <div className="text-5xl mb-3">📝</div>
            <p className="text-slate-500 font-medium">الجلسة دي من غير اختبار</p>
            <p className="text-slate-400 text-sm mt-1">ما اتعملش اختبار في الجلسة دي</p>
          </div>
        )}

        <button
          onClick={() => router.push('/study')}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg font-bold rounded-2xl shadow-lg active:scale-95 transition-all"
        >
          📚 ابدأ مذاكرة جديدة
        </button>

      </div>
      <BottomNav />
    </main>
  )
}
