export default function PreschoolLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-pink-100 to-purple-100" dir="rtl">
      {children}
    </div>
  )
}
