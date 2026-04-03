'use client'
import { useRouter, usePathname } from 'next/navigation'

const TABS = [
  { href: '/hub',      emoji: '🏠', label: 'الرئيسية' },
  { href: '/study',    emoji: '📚', label: 'اذاكر'    },
  { href: '/help',     emoji: '🤖', label: 'مساعد'    },
  { href: '/progress', emoji: '📊', label: 'تقدمي'    },
]

export default function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-100 shadow-lg z-50 safe-area-pb" dir="rtl">
      <div className="max-w-md mx-auto flex">
        {TABS.map(tab => {
          const active = pathname === tab.href
          return (
            <button
              key={tab.href}
              onClick={() => router.push(tab.href)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all active:scale-90 ${
                active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className={`text-2xl leading-none transition-transform ${active ? 'scale-110' : ''}`}>
                {tab.emoji}
              </span>
              <span className={`text-[10px] font-bold leading-none ${active ? 'text-blue-600' : 'text-slate-400'}`}>
                {tab.label}
              </span>
              {active && (
                <span className="absolute bottom-0 h-0.5 w-8 bg-blue-500 rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
