import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'مساعد الدراسة',
  description: 'تطبيق متابعة الدراسة اليومية للأبناء',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="font-sans bg-slate-50 min-h-screen" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
