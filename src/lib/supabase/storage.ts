import { supabase } from './client'

export async function uploadStudyImage(file: File, userId: string): Promise<string> {
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
