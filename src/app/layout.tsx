import type { Metadata } from 'next'
import { Cairo } from 'next/font/google'
import './globals.css'

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
})

export const metadata: Metadata = {
  title: 'مساعد الدراسة',
  description: 'تطبيق متابعة الدراسة اليومية للأبناء',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} font-sans bg-slate-50 min-h-screen`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
