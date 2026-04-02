import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string | null
    const description = formData.get('description') as string | null
    const type = formData.get('type') as string | null
    const created_by = formData.get('created_by') as string | null

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${timestamp}_${sanitized}`

    // Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer())
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)

    const publicUrl = urlData.publicUrl

    // Save document record in DB
    const { data, error } = await supabase
      .from('documents')
      .insert({
        title: title.trim(),
        description: description || null,
        doc_type: type || 'outro',
        url: publicUrl,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        created_by: created_by || 'bruno',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
