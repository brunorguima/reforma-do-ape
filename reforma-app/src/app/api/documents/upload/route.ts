import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string | null
    const description = formData.get('description') as string | null
    const type = formData.get('type') as string | null
    const created_by = formData.get('created_by') as string | null
    const professional_id = (formData.get('professional_id') as string | null) || null
    const room_id = (formData.get('room_id') as string | null) || null
    const quote_id = (formData.get('quote_id') as string | null) || null
    const tagsRaw = (formData.get('tags') as string | null) || null
    const parsedDataRaw = (formData.get('parsed_data') as string | null) || null
    const allowDuplicateRaw = (formData.get('allow_duplicate') as string | null) || null
    const project_id = (formData.get('project_id') as string | null) || null
    const allowDuplicate = allowDuplicateRaw === 'true' || allowDuplicateRaw === '1'

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Read bytes once (used for hash + upload)
    const buffer = Buffer.from(await file.arrayBuffer())
    const fileHash = createHash('sha256').update(buffer).digest('hex')

    // Duplicate detection: if an existing doc has the same sha256, short-circuit
    if (!allowDuplicate) {
      const { data: existing } = await supabase
        .from('documents')
        .select('id, title, doc_type, url, file_name, created_at')
        .eq('file_hash', fileHash)
        .limit(1)
        .maybeSingle()
      if (existing) {
        return NextResponse.json(
          {
            duplicate: true,
            existing,
            message: `Este PDF já foi enviado (${existing.title}). Envie com allow_duplicate=true se quiser subir de novo.`,
          },
          { status: 409 },
        )
      }
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${timestamp}_${sanitized}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)
    const publicUrl = urlData.publicUrl

    let tags: string[] | null = null
    if (tagsRaw) {
      try {
        const parsed = JSON.parse(tagsRaw)
        if (Array.isArray(parsed)) tags = parsed.map(String)
      } catch {
        tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
      }
    }

    let parsedData: unknown = null
    if (parsedDataRaw) {
      try {
        parsedData = JSON.parse(parsedDataRaw)
      } catch {
        // ignore — keep null
      }
    }

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
        file_hash: fileHash,
        professional_id,
        room_id,
        quote_id,
        tags,
        parsed_data: parsedData,
        created_by: created_by || 'bruno',
        project_id,
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
