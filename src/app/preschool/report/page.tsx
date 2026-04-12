'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface PreschoolReport {
  pointsEarned: number
  feedback: string
  totalQuestions: number
  correctCount: number
}

export default function PreschoolReportPage() {
  const router = useRouter()
  const [report, setReport] = useState<PreschoolReport | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('preschoolReport')
    if (!raw) {
      router.replace('/preschool/hub')
      return
    }
    try {
      setReport(JSON.parse(raw))
    } catch {
      router.replace('/preschool/hub')
    }
  }, [router])

  if (!report) return null

  const stars = Array.from({ length: report.totalQuestions })

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6" dir="rtl">
      {/* Confetti-ish decoration */}
      <div className="absolute top-10 right-10 text-5xl animate-bounce">🎉</div>
      <div className="absolute top-20 left-10 text-4xl animate-pulse">✨</div>
      <div className="absolute bottom-24 right-12 text-5xl animate-pulse">🌟</div>
      <div className="absolute bottom-16 left-8 text-4xl animate-bounce" style={{ animationDelay: '0.4s' }}>🎊</div>

      <div className="text-center max-w-md w-full">
        <div className="text-9xl mb-4 drop-shadow-lg animate-bounce">🏆</div>
        <h1 className="text-4xl font-black text-purple-800 mb-2">شاطر!</h1>

        {/* Stars row */}
        <div className="flex justify-center gap-2 mb-5">
          {stars.map((_, i) => (
            <span key={i} className="text-5xl drop-shadow">
              {i < report.correctCount ? '⭐' : '☆'}
            </span>
          ))}
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-xl mb-6">
          <p className="text-xl font-bold text-slate-700 mb-3 leading-relaxed">
            {report.feedback || 'أحسنت يا بطل! 💕'}
          </p>
          <div className="text-lg font-bold text-pink-600">
            +{report.pointsEarned} ⭐
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => router.push('/preschool/hub')}
            className="w-full bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-3xl p-6 text-2xl font-black shadow-xl active:scale-95 transition-all"
          >
            🎮 لعبة تانية
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-white text-slate-600 rounded-3xl p-4 text-lg font-bold shadow active:scale-95 transition-all"
          >
            🏠 خروج
          </button>
        </div>
      </div>
    </main>
  )
}
