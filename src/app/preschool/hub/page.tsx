'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export const dynamic = 'force-dynamic'

interface PreschoolUser {
  id: string
  name: string
  is_preschool: boolean
}

const SUBJECTS = [
  { value: 'math',    label: 'أرقام',    emoji: '🔢', gradient: 'from-blue-400 to-indigo-500' },
  { value: 'arabic',  label: 'حروف',     emoji: '📖', gradient: 'from-purple-400 to-pink-500' },
  { value: 'english', label: 'English',  emoji: '🔤', gradient: 'from-yellow-400 to-orange-500' },
] as const

export default function PreschoolHubPage() {
  const { userId, loaded, clearUser } = useCurrentUser()
  const router = useRouter()
  const [user, setUser] = useState<PreschoolUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!loaded) return
    if (!userId) {
      router.replace('/')
      return
    }
    createClient()
      .from('users')
      .select('id, name, is_preschool')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (!data) {
          router.replace('/')
          return
        }
        if (!data.is_preschool) {
          router.replace('/hub')
          return
        }
        setUser(data as PreschoolUser)
        setLoading(false)
      })
  }, [userId, loaded, router])

  function handleChange() {
    clearUser()
    router.push('/')
  }

  if (loading || !user) return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="text-7xl animate-bounce mb-4">🧸</div>
      <p className="text-pink-600 font-bold text-lg">بيتحمل...</p>
    </div>
  )

  return (
    <main className="flex flex-col items-center min-h-screen p-6 pt-10">
      {/* Stars decoration */}
      <div className="absolute top-8 right-8 text-4xl animate-pulse select-none">✨</div>
      <div className="absolute top-16 left-10 text-3xl animate-bounce select-none" style={{ animationDelay: '0.5s' }}>⭐</div>
      <div className="absolute bottom-16 right-12 text-3xl animate-pulse select-none" style={{ animationDelay: '1s' }}>🌟</div>

      {/* Greeting */}
      <div className="text-center mb-8">
        <div className="text-8xl mb-3 drop-shadow-lg">🧸</div>
        <h1 className="text-3xl font-black text-purple-800 mb-1 drop-shadow-sm">أهلاً {user.name}!</h1>
        <p className="text-xl text-pink-600 font-bold">نلعب ونتعلم مع ماما وبابا 💕</p>
      </div>

      {/* Big subject buttons */}
      <div className="flex flex-col gap-5 w-full max-w-sm">
        {SUBJECTS.map(s => (
          <button
            key={s.value}
            onClick={() => router.push(`/preschool/quiz?subject=${s.value}`)}
            className={`bg-gradient-to-br ${s.gradient} rounded-3xl p-8 text-center shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200`}
          >
            <div className="text-7xl mb-2 drop-shadow">{s.emoji}</div>
            <div className="text-3xl font-black text-white drop-shadow">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Change kid */}
      <button
        onClick={handleChange}
        className="mt-10 text-sm text-slate-500 hover:text-slate-700 underline"
      >
        تغيير الطفل
      </button>
    </main>
  )
}
