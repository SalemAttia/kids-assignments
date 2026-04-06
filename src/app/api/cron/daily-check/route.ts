import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'

const PRAYER_NAMES: Record<string, string> = {
  fajr: 'الفجر',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
    )

    const today = new Date().toISOString().split('T')[0]

    // Fetch all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name')

    if (usersError) throw usersError
    if (!users || users.length === 0) {
      return NextResponse.json({ message: 'No users found' })
    }

    // Fetch prayer logs for today
    const { data: prayerLogs } = await supabase
      .from('prayer_logs')
      .select('*')
      .eq('prayer_date', today)

    // Fetch study sessions for today with their reports
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('id, user_id, subject, created_at')
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)

    const sessionIds = (sessions || []).map((s) => s.id)
    let reports: { session_id: string; total_score: number }[] = []
    if (sessionIds.length > 0) {
      const { data: reportsData } = await supabase
        .from('reports')
        .select('session_id, total_score')
        .in('session_id', sessionIds)
      reports = reportsData || []
    }

    // Build per-user summary
    const lines: string[] = []
    lines.push(`📋 تقرير يومي - ${today}`)
    lines.push('')

    for (const user of users) {
      lines.push(`👤 ${user.name}:`)

      // Prayer status
      const prayer = prayerLogs?.find((p) => p.user_id === user.id)
      if (!prayer) {
        lines.push('  🕌 الصلاة: لم يسجل أي صلاة اليوم ❌')
      } else {
        const missed = Object.entries(PRAYER_NAMES)
          .filter(([key]) => !prayer[key])
          .map(([, name]) => name)

        if (missed.length === 0) {
          lines.push('  🕌 الصلاة: أكمل جميع الصلوات ✅')
        } else {
          lines.push(`  🕌 الصلاة: لم يصلِّ ${missed.join('، ')} ❌`)
        }
      }

      // Study session status
      const userSessions = (sessions || []).filter(
        (s) => s.user_id === user.id
      )
      if (userSessions.length === 0) {
        lines.push('  📚 الدراسة: لم يسجل أي جلسة دراسية اليوم ❌')
      } else {
        const userReports = reports.filter((r) =>
          userSessions.some((s) => s.id === r.session_id)
        )
        const totalScore = userReports.reduce(
          (sum, r) => sum + r.total_score,
          0
        )
        const avgScore =
          userReports.length > 0
            ? Math.round(totalScore / userReports.length)
            : null

        lines.push(
          `  📚 الدراسة: ${userSessions.length} جلسة${avgScore !== null ? ` - متوسط الدرجة: ${avgScore}` : ''}`
        )
      }

      lines.push('')
    }

    const message = lines.join('\n')

    // Send WhatsApp via Twilio
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    )

    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM!,
      to: process.env.PARENT_WHATSAPP_NUMBER!,
      body: message,
    })

    return NextResponse.json({ ok: true, message })
  } catch (err: unknown) {
    console.error('Daily check error:', err)
    return NextResponse.json(
      { error: 'فشل إرسال التقرير اليومي' },
      { status: 500 }
    )
  }
}
