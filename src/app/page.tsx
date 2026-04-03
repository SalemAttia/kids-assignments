'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { User } from '@/types'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const { setUserId } = useCurrentUser()
  const router = useRouter()

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data, error } = await createClient()
          .from('users')
          .select('*')

        if (error) console.error('Supabase error:', error.message)
        if (data) setUsers([...data].sort((a, b) => b.name.localeCompare(a.name, 'ar')))
      } finally {
        setLoading(false)
      }
    }

    void loadUsers()
  }, [])

  function handleSelect(user: User) {
    setUserId(user.id)
    router.push('/hub')
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-xl text-slate-500">بيتحمل...</p>
    </div>
  )

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-blue-50 to-white">
      <h1 className="text-4xl font-bold text-blue-800 mb-2">مساعد المذاكرة</h1>
      <p className="text-slate-500 mb-10 text-lg">اختار اسمك عشان تبدأ</p>
      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-md">
        {users.map((user) => (
          <button
            key={user.id}
            onClick={() => handleSelect(user)}
            className="flex-1 bg-white border-2 border-blue-200 rounded-2xl p-8 text-center shadow-md hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer"
          >
            <div className="text-5xl mb-3">{user.grade === 6 ? '🧒' : '👦'}</div>
            <div className="text-2xl font-bold text-blue-800">{user.name}</div>
            <div className="text-slate-500 mt-1">الصف {user.grade === 6 ? 'السادسة ابتدائي' : 'التالتة إعدادي'}</div>
            {user.streak > 0 && (
              <div className="mt-3 text-sm text-orange-500 font-semibold">🔥 {user.streak} يوم متتالي</div>
            )}
          </button>
        ))}
      </div>
      <button
        onClick={() => router.push('/parent')}
        className="mt-12 text-sm text-slate-400 hover:text-slate-600 underline"
      >
        لوحة ولي الأمر
      </button>
    </main>
  )
}
