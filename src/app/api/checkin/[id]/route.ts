import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()

  // Fetch the check-in first so we can clean up its struggle image from storage
  const { data: checkin } = await supabase
    .from('checkins')
    .select('struggle_image_url')
    .eq('id', id)
    .single()

  if (!checkin) return NextResponse.json({ error: 'Check-in not found' }, { status: 404 })

  const { error } = await supabase
    .from('checkins')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Best-effort storage cleanup for the struggle photo
  if (checkin.struggle_image_url) {
    try {
      const match = checkin.struggle_image_url.match(/study-images\/(.+)$/)
      if (match) {
        await supabase.storage.from('study-images').remove([match[1]])
      }
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ success: true })
}
