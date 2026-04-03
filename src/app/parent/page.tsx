'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ParentPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (sessionStorage.getItem('parentAuth') === 'true') {
      router.replace('/parent/dashboard')
    }
  }, [router])

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (username === 'admin' && password === '1234') {
      sessionStorage.setItem('parentAuth', 'true')
      router.push('/parent/dashboard')
    } else {
      setError('اسم المستخدم أو كلمة المرور مش صح')
    }
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
      <div className="bg-white rounded-2xl p-8 shadow-md border border-slate-100 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-blue-800 mb-2">لوحة ولي الأمر</h1>
        <p className="text-slate-500 mb-6">من فضلك سجل دخولك عشان تكمل</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="اسم المستخدم"
            className="w-full p-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-400"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="كلمة المرور"
            className="w-full p-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-400"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
          >
            دخول
          </button>
        </form>
        <button
          onClick={() => router.push('/')}
          className="mt-4 w-full text-center text-sm text-slate-400 hover:text-slate-600"
        >
          ارجع للصفحة الرئيسية
        </button>
      </div>
    </main>
  )
}
