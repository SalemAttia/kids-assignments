'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useStudySession } from '@/hooks/useStudySession'
import type { Report } from '@/types'

interface ReportData {
  report: Report
  pointsEarned: number
  newStreak: number
}

export default function ReportPage() {
  const router = useRouter()
  const { userId } = useCurrentUser()
  const { clearSession } = useStudySession()
  const [data, setData] = useState<ReportData | null>(null)

  useEffect(() => {
    if (!userId) { router.replace('/'); return }
    const raw = sessionStorage.getItem('reportData')
    if (!raw) { router.replace('/study'); return }
    setData(JSON.parse(raw))
  }, [userId, router])

  function handleNewSession() {
    clearSession()
    sessionStorage.removeItem('reportData')
    router.push('/study')
  }

  if (!data) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-slate-500">جاري التحميل...</p>
    </div>
  )

  const { report, pointsEarned, newStreak } = data
  const score = report.total_score
  const scoreColor = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'
  const scoreBg = score >= 80 ? 'bg-green-50 border-green-200' : score >= 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-blue-800 mb-2">نتيجة الاختبار</h1>

        {/* Score */}
        <div className={`border-2 rounded-2xl p-8 text-center ${scoreBg}`}>
          <div className={`text-7xl font-bold ${scoreColor} mb-2`}>{score}</div>
          <div className="text-slate-600 text-lg">من 100</div>
          <div className="text-3xl mt-3">
            {score >= 80 ? '🌟' : score >= 60 ? '👍' : '💪'}
          </div>
        </div>

        {/* Points & Streak */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-100 text-center">
            <div className="text-2xl font-bold text-blue-600">+{pointsEarned}</div>
            <div className="text-slate-500 text-sm mt-1">نقطة مكتسبة</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-100 text-center">
            <div className="text-2xl font-bold text-orange-500">🔥 {newStreak}</div>
            <div className="text-slate-500 text-sm mt-1">يوم متتالي</div>
          </div>
        </div>

        {/* Feedback */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <h2 className="text-lg font-bold text-slate-700 mb-3">تعليق المعلم</h2>
          <p className="text-slate-600 leading-relaxed">{report.feedback}</p>
        </div>

        {/* Mistakes */}
        {report.mistakes && report.mistakes.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-slate-100">
            <h2 className="text-lg font-bold text-slate-700 mb-4">مراجعة الأخطاء</h2>
            <div className="space-y-4">
              {report.mistakes.map((mistake, i) => (
                <div key={i} className="bg-red-50 rounded-xl p-4 border border-red-100">
                  <p className="font-medium text-slate-700 mb-2">{mistake.question_text}</p>
                  <p className="text-sm text-red-600 mb-1">إجابتك: {mistake.given_answer}</p>
                  <p className="text-sm text-green-600 mb-2">الإجابة الصحيحة: {mistake.correct_answer}</p>
                  <p className="text-sm text-slate-600 bg-white rounded-lg p-2">{mistake.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {report.suggestions && report.suggestions.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-slate-100">
            <h2 className="text-lg font-bold text-slate-700 mb-3">اقتراحات للتحسين</h2>
            <ul className="space-y-2">
              {report.suggestions.map((s, i) => (
                <li key={i} className="flex gap-2 text-slate-600">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <button
            onClick={handleNewSession}
            className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-colors"
          >
            جلسة دراسة جديدة
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-4 border-2 border-slate-300 text-slate-600 rounded-xl font-semibold hover:border-slate-400 transition-colors"
          >
            الرئيسية
          </button>
        </div>
      </div>
    </main>
  )
}
