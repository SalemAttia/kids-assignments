'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { User } from '@/types'

export const dynamic = 'force-dynamic'

const AVATARS: Record<number, string> = { 6: '🧒', 9: '👦' }
const BG_COLORS = ['from-blue-400 to-purple-500', 'from-pink-400 to-orange-400']

export default function HomePage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [picking, setPicking] = useState<string | null>(null)
  const { setUserId } = useCurrentUser()
  const router = useRouter()

  useEffect(() => {
    createClient()
      .from('users')
      .select('*')
      .then(({ data }) => {
        if (data) setUsers([...data].sort((a, b) => b.name.localeCompare(a.name, 'ar')))
        setLoading(false)
      })
  }, [])

  function handleSelect(user: User) {
    setPicking(user.id)
    setUserId(user.id)
    router.push('/hub')
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      <div className="text-7xl animate-bounce mb-4">🌟</div>
      <p className="text-blue-600 font-bold text-lg">بيتحمل...</p>
    </div>
  )

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-6" dir="rtl">

      {/* Stars decoration */}
      <div className="absolute top-8 right-8 text-4xl animate-pulse select-none">✨</div>
      <div className="absolute top-16 left-10 text-3xl animate-bounce select-none" style={{ animationDelay: '0.5s' }}>⭐</div>
      <div className="absolute bottom-20 right-12 text-3xl animate-pulse select-none" style={{ animationDelay: '1s' }}>🌟</div>
      <div className="absolute bottom-32 left-8 text-2xl animate-bounce select-none" style={{ animationDelay: '0.3s' }}>✨</div>

      {/* Hero */}
      <div className="text-center mb-10">
        <div className="text-8xl mb-4 drop-shadow-lg">📚</div>
        <h1 className="text-4xl font-black text-blue-800 mb-2 drop-shadow-sm">مساعد المذاكرة</h1>
        <p className="text-xl text-purple-600 font-bold">مين أنت؟ 👋</p>
        <p className="text-slate-500 mt-1 text-sm">اضغط على اسمك عشان تبدأ!</p>
      </div>

      {/* User Cards */}
      <div className="flex flex-col sm:flex-row gap-5 w-full max-w-sm">
        {users.map((user, idx) => (
          <button
            key={user.id}
            onClick={() => handleSelect(user)}
            disabled={picking !== null}
            className={`flex-1 bg-gradient-to-br ${BG_COLORS[idx % BG_COLORS.length]} rounded-3xl p-7 text-center shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 ${picking === user.id ? 'scale-95 opacity-80' : ''}`}
          >
            <div className="text-6xl mb-3 drop-shadow">{AVATARS[user.grade] || '👤'}</div>
            <div className="text-2xl font-black text-white drop-shadow">{user.name}</div>
            <div className="text-white/80 text-sm mt-1">
              الصف {user.grade === 6 ? 'السادسة' : 'التالتة'}
            </div>
            {user.streak > 0 && (
              <div className="mt-3 bg-white/20 rounded-full px-3 py-1 text-sm text-white font-bold inline-block">
                🔥 {user.streak} يوم
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Parent link */}
      <button
        onClick={() => router.push('/parent')}
        className="mt-12 text-xs text-slate-400 hover:text-slate-600 underline"
      >
        لوحة ولي الأمر
      </button>
    </main>
  )
}
