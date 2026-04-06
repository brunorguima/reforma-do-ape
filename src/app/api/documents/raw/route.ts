import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing document id' }, { status: 400 })
  }

  const { data: doc, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  if (!doc.file_path) {
    if (doc.url) {
      return NextResponse.redirect(doc.url)
    }
    return NextResponse.json({ error: 'No file' }, { status: 404 })
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from('documents')
    .download(doc.file_path)

  if (downloadError || !fileData) {
    if (doc.url) {
      return NextResponse.redirect(doc.url)
    }
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }

  const buffer = Buffer.from(await fileData.arrayBuffer())
  const fileName = doc.file_name || doc.file_path
  const contentType = doc.file_type || 'application/octet-stream'

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
