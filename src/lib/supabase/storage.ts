'use client'
import { createClient } from './client'

export async function uploadStudyImage(file: File, userId: string): Promise<string> {
  const supabase = createClient()
  const timestamp = Date.now()
  const ext = file.name.split('.').pop()
  const path = `${userId}/${timestamp}.${ext}`

  const { error } = await supabase.storage
    .from('study-images')
    .upload(path, file, { upsert: true })

  if (error) throw new Error(`فشل رفع الصورة: ${error.message}`)

  const { data } = supabase.storage.from('study-images').getPublicUrl(path)
  return data.publicUrl
}

export async function uploadStudyImages(files: File[], userId: string): Promise<string[]> {
  return Promise.all(files.map((file, i) => {
    const timestamp = Date.now() + i
    const fileWithTimestamp = new File([file], `${timestamp}.${file.name.split('.').pop()}`, { type: file.type })
    return uploadStudyImage(fileWithTimestamp, userId)
  }))
}
