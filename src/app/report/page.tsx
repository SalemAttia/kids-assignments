'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useStudySession } from '@/hooks/useStudySession'
import type { Report } from '@/types'

interface AnswerReview {
  question_text: string
  student_answer: string
  correct_answer: string
  is_correct: boolean
  explanation: string
}

interface ReportData {
  report: Report
  allAnswersReview: AnswerReview[]
  pointsEarned: number
  newStreak: number
}

export default function ReportPage() {
  const router = useRouter()
  const { userId, loaded } = useCurrentUser()
  const { clearSession } = useStudySession()
  const [data, setData] = useState<ReportData | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (!loaded) return
    if (!userId) { router.replace('/'); return }
    const raw = sessionStorage.getItem('reportData')
    if (!raw) { router.replace('/study'); return }
    setData(JSON.parse(raw))
  }, [loaded, userId, router])

  function handleNewSession() {
    clearSession()
    sessionStorage.removeItem('reportData')
    router.push('/study')
  }

  function handleGoHome() {
    clearSession()
    sessionStorage.removeItem('reportData')
    router.push('/hub')
  }

  if (!data) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <p className="text-slate-500">بيتحمل...</p>
    </div>
  )

  const { report, allAnswersReview = [], pointsEarned, newStreak } = data
  const score = report.total_score
  const scoreEmoji = score >= 80 ? '🌟' : score >= 60 ? '👍' : '💪'
  const scoreColor = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'
  const scoreBg = score >= 80 ? 'from-green-400 to-emerald-500' : score >= 60 ? 'from-yellow-400 to-orange-500' : 'from-red-400 to-rose-500'
  const scoreMsg = score >= 80 ? 'ممتاز! أنت نجم!' : score >= 60 ? 'كويس! كمل!' : 'حاول تاني!'

  const correctCount = allAnswersReview.filter(a => a.is_correct).length
  const totalCount = allAnswersReview.length

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4" dir="rtl">
      <div className="max-w-lg mx-auto pt-2 pb-10 space-y-4">

        {/* Score Hero */}
        <div className={`bg-gradient-to-br ${scoreBg} rounded-3xl p-8 text-center text-white shadow-xl`}>
          <div className="text-6xl mb-3">{scoreEmoji}</div>
          <div className="text-7xl font-black mb-1">{score}</div>
          <div className="text-white/80 text-lg mb-2">من 100</div>
          <div className="text-xl font-bold">{scoreMsg}</div>
          <div className="mt-3 text-sm text-white/70">{correctCount} صح من {totalCount} سؤال</div>
        </div>

        {/* Points & Streak */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <div className="text-3xl mb-1">⭐</div>
            <div className="text-2xl font-bold text-yellow-500">+{pointsEarned}</div>
            <div className="text-xs text-slate-400 mt-1">نقطة اتكسبت</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <div className="text-3xl mb-1">🔥</div>
            <div className="text-2xl font-bold text-orange-500">{newStreak}</div>
            <div className="text-xs text-slate-400 mt-1">يوم متتالي</div>
          </div>
        </div>

        {/* Feedback */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><span>💬</span> رأي المدرس</h2>
          <p className="text-slate-600 leading-relaxed text-sm">{report.feedback}</p>
        </div>

        {/* All Answers Review */}
        {allAnswersReview.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setShowAll(v => !v)}
              className="w-full flex items-center justify-between p-5 text-right hover:bg-slate-50 transition-colors"
            >
              <span className="font-bold text-slate-700 flex items-center gap-2">
                <span>📋</span> مراجعة كل الإجابات
              </span>
              <span className="text-slate-400 text-sm">{showAll ? '▲ إخفاء' : '▼ عرض'}</span>
            </button>

            {showAll && (
              <div className="divide-y divide-slate-50 border-t border-slate-100">
                {allAnswersReview.map((a, i) => (
                  <div key={i} className={`p-4 ${a.is_correct ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-lg flex-shrink-0">{a.is_correct ? '✅' : '❌'}</span>
                      <p className="text-sm font-semibold text-slate-700 leading-snug">{a.question_text}</p>
                    </div>
                    <div className="mr-7 space-y-1">
                      <p className={`text-sm ${a.is_correct ? 'text-green-700' : 'text-red-600'}`}>
                        إجابتك: <span className="font-medium">{a.student_answer || '—'}</span>
                      </p>
                      {!a.is_correct && (
                        <p className="text-sm text-green-700">
                          الصح: <span className="font-medium">{a.correct_answer}</span>
                        </p>
                      )}
                      {a.explanation && (
                        <p className="text-xs text-slate-500 bg-white rounded-lg p-2 mt-1">{a.explanation}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Suggestions */}
        {report.suggestions && report.suggestions.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><span>💡</span> نصايح عشان تبقى أحسن</h2>
            <ul className="space-y-2">
              {report.suggestions.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-600">
                  <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleNewSession}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-all"
          >
            📚 جلسة مذاكرة جديدة
          </button>
          <button
            onClick={handleGoHome}
            className="w-full py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-bold shadow-sm active:scale-95 transition-all"
          >
            🏠 ارجع للصفحة الرئيسية
          </button>
        </div>
      </div>
    </main>
  )
}
