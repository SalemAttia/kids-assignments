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

// Pure CSS confetti dots for high scores
function Confetti() {
  const dots = Array.from({ length: 18 }, (_, i) => ({
    left: `${(i * 17 + 5) % 95}%`,
    color: ['bg-yellow-400','bg-pink-400','bg-blue-400','bg-green-400','bg-purple-400','bg-orange-400'][i % 6],
    delay: `${(i * 0.15) % 1.5}s`,
    size: i % 3 === 0 ? 'w-3 h-3' : 'w-2 h-2',
  }))
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      {dots.map((d, i) => (
        <div
          key={i}
          className={`absolute rounded-full ${d.color} ${d.size} animate-bounce opacity-70`}
          style={{ left: d.left, top: '-10px', animationDelay: d.delay, animationDuration: `${1.2 + (i % 4) * 0.3}s` }}
        />
      ))}
    </div>
  )
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 gap-4">
      <div className="text-6xl animate-bounce">⏳</div>
      <p className="text-slate-500 font-bold">بيتحمل...</p>
    </div>
  )

  const { report, allAnswersReview = [], pointsEarned, newStreak } = data
  const score = report.total_score
  const isExcellent = score >= 80
  const isGood = score >= 60

  const scoreEmoji = isExcellent ? '🌟' : isGood ? '👍' : '💪'
  const scoreColor = isExcellent ? 'text-green-600' : isGood ? 'text-yellow-600' : 'text-red-600'
  const scoreBg = isExcellent ? 'from-yellow-400 via-orange-400 to-pink-500' : isGood ? 'from-blue-400 to-purple-500' : 'from-red-400 to-rose-500'
  const scoreMsg = isExcellent ? '🎉 ممتاز! أنت نجم النهارده!' : isGood ? '👏 كويس جداً! كمل!' : '💪 حاول تاني وهتبقى أحسن!'

  const correctCount = allAnswersReview.filter(a => a.is_correct).length
  const totalCount = allAnswersReview.length

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4 relative" dir="rtl">
      {isExcellent && <Confetti />}

      <div className="max-w-lg mx-auto pt-2 pb-10 space-y-4 relative z-10">

        {/* Score Hero */}
        <div className={`bg-gradient-to-br ${scoreBg} rounded-3xl p-8 text-center text-white shadow-2xl`}>
          <div className="text-7xl mb-3 drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.5))' }}>
            {scoreEmoji}
          </div>
          <div className="text-8xl font-black mb-1 drop-shadow">{score}</div>
          <div className="text-white/80 text-lg mb-3">من 100</div>
          <div className="text-xl font-black bg-white/20 rounded-2xl px-4 py-2 inline-block">{scoreMsg}</div>
          <div className="mt-3 text-sm text-white/70">{correctCount} صح من {totalCount} سؤال</div>
        </div>

        {/* Points & Streak */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-5 shadow-sm text-center border-2 border-yellow-100">
            <div className="text-4xl mb-2">⭐</div>
            <div className="text-3xl font-black text-yellow-500">+{pointsEarned}</div>
            <div className="text-xs text-slate-400 mt-1 font-medium">نقطة اتكسبت</div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm text-center border-2 border-orange-100">
            <div className="text-4xl mb-2">🔥</div>
            <div className="text-3xl font-black text-orange-500">{newStreak}</div>
            <div className="text-xs text-slate-400 mt-1 font-medium">يوم متتالي</div>
          </div>
        </div>

        {/* Feedback */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-blue-50">
          <h2 className="font-black text-slate-700 mb-2 flex items-center gap-2 text-lg">
            <span>💬</span> رأي المدرس
          </h2>
          <p className="text-slate-600 leading-relaxed">{report.feedback}</p>
        </div>

        {/* All Answers Review */}
        {allAnswersReview.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setShowAll(v => !v)}
              className="w-full flex items-center justify-between p-5 text-right hover:bg-slate-50 transition-colors"
            >
              <span className="font-black text-slate-700 flex items-center gap-2 text-base">
                <span>📋</span> مراجعة كل الإجابات
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isExcellent ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {correctCount}/{totalCount}
                </span>
              </span>
              <span className="text-slate-400 text-lg">{showAll ? '▲' : '▼'}</span>
            </button>

            {showAll && (
              <div className="divide-y divide-slate-50 border-t border-slate-100">
                {allAnswersReview.map((a, i) => (
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
            )}
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

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleNewSession}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-black text-xl shadow-lg active:scale-95 transition-all"
          >
            📚 اذاكر تاني!
          </button>
          <button
            onClick={handleGoHome}
            className="w-full py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-bold text-lg shadow-sm active:scale-95 transition-all"
          >
            🏠 الصفحة الرئيسية
          </button>
        </div>
      </div>
    </main>
  )
}
