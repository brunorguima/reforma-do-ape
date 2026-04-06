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

  // For link-only documents, redirect
  if (!doc.file_path) {
    if (doc.url) {
      return NextResponse.redirect(doc.url)
    }
    return NextResponse.json({ error: 'No file' }, { status: 404 })
  }

  const fileName = doc.file_name || doc.title || 'Documento'
  const rawUrl = `/api/documents/raw?id=${id}`
  const isImage = (doc.file_type || '').startsWith('image/')

  // Return an HTML page with navigation header + embedded document
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${fileName} — Reforma App</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1F2937; }
    .header {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px;
      background: linear-gradient(135deg, #1E3A5F, #2563EB);
      color: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .back-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 16px;
      background: rgba(255,255,255,0.2);
      color: white; border: none; border-radius: 8px;
      font-size: 14px; font-weight: 600;
      cursor: pointer; text-decoration: none;
      transition: background 0.2s;
      white-space: nowrap;
    }
    .back-btn:hover { background: rgba(255,255,255,0.3); }
    .file-name {
      flex: 1; font-size: 14px; font-weight: 600;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .download-btn {
      display: flex; align-items: center; gap: 4px;
      padding: 8px 12px;
      background: rgba(255,255,255,0.15);
      color: white; border: none; border-radius: 8px;
      font-size: 13px; font-weight: 500;
      cursor: pointer; text-decoration: none;
      white-space: nowrap;
    }
    .download-btn:hover { background: rgba(255,255,255,0.25); }
    .content {
      position: fixed; top: 56px; left: 0; right: 0; bottom: 0;
      display: flex; align-items: center; justify-content: center;
      overflow: auto;
      background: #111827;
    }
    iframe { width: 100%; height: 100%; border: none; }
    img.preview {
      max-width: 100%; max-height: 100%;
      object-fit: contain;
    }
  </style>
</head>
<body>
  <div class="header">
    <a href="/" class="back-btn">
      ← Voltar
    </a>
    <span class="file-name">${fileName}</span>
    <a href="${rawUrl}" download="${fileName}" class="download-btn">
      ⬇ Baixar
    </a>
  </div>
  <div class="content">
    ${isImage
      ? `<img src="${rawUrl}" alt="${fileName}" class="preview" />`
      : `<iframe src="${rawUrl}" title="${fileName}"></iframe>`
    }
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  })
}
