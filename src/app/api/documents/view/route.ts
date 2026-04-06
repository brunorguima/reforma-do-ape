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
    if (doc.url) return NextResponse.redirect(doc.url)
    return NextResponse.json({ error: 'No file' }, { status: 404 })
  }

  const fileName = doc.file_name || doc.title || 'Documento'
  const rawUrl = `/api/documents/raw?id=${id}`
  const isImage = (doc.file_type || '').startsWith('image/')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; background: #0F172A; overflow: hidden; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

    /* Top bar - always visible */
    .topbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      display: flex; align-items: center; gap: 8px;
      padding: 10px 12px;
      background: #1E293B;
      border-bottom: 1px solid #334155;
    }
    .btn {
      padding: 10px 18px;
      background: #2563EB; color: white;
      border: none; border-radius: 10px;
      font-size: 15px; font-weight: 700;
      cursor: pointer; text-decoration: none;
      display: inline-flex; align-items: center; gap: 6px;
      -webkit-tap-highlight-color: transparent;
    }
    .btn:active { opacity: 0.8; transform: scale(0.97); }
    .btn-secondary {
      background: #334155;
      font-size: 14px; font-weight: 600;
      padding: 10px 14px;
    }
    .fname {
      flex: 1; color: #CBD5E1; font-size: 13px; font-weight: 500;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      padding: 0 4px;
    }

    /* Content area */
    .viewer {
      position: fixed; top: 53px; left: 0; right: 0; bottom: 0;
      overflow: auto; -webkit-overflow-scrolling: touch;
    }

    /* Desktop: embedded PDF */
    .viewer embed { width: 100%; height: 100%; display: block; }

    /* Image viewer: scrollable + zoomable */
    .img-wrap {
      min-height: 100%; display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    .img-wrap img { max-width: 100%; height: auto; border-radius: 4px; }

    /* Mobile fallback card */
    .mobile-card {
      display: none;
      flex-direction: column; align-items: center; justify-content: center;
      height: 100%; padding: 40px 24px; text-align: center; gap: 20px;
    }
    .mobile-card .icon { font-size: 72px; }
    .mobile-card h2 { color: white; font-size: 18px; word-break: break-word; }
    .mobile-card p { color: #94A3B8; font-size: 14px; line-height: 1.6; max-width: 280px; }
    .mobile-card .open-btn {
      padding: 16px 32px;
      background: #2563EB; color: white; border: none; border-radius: 14px;
      font-size: 17px; font-weight: 700; cursor: pointer;
      text-decoration: none;
      display: inline-flex; align-items: center; gap: 8px;
    }
    .mobile-card .open-btn:active { opacity: 0.8; }
    .mobile-card .hint { color: #64748B; font-size: 12px; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="topbar">
    <button class="btn" onclick="goBack()">← Voltar</button>
    <span class="fname">${fileName}</span>
    <a href="${rawUrl}" download="${fileName}" class="btn btn-secondary">⬇</a>
  </div>

  <div class="viewer" id="viewer">
    ${isImage ? `
    <div class="img-wrap">
      <img src="${rawUrl}" alt="${fileName}" />
    </div>
    ` : `
    <embed src="${rawUrl}" type="application/pdf" id="pdf-embed" />
    <div class="mobile-card" id="mobile-card">
      <div class="icon">📄</div>
      <h2>${fileName}</h2>
      <p>Toque no botão abaixo para visualizar o documento. Depois use o botão ← Voltar para retornar ao app.</p>
      <a href="${rawUrl}" target="_blank" class="open-btn">📄 Abrir PDF</a>
      <span class="hint">Abre em nova aba — feche-a para voltar aqui</span>
    </div>
    `}
  </div>

  <script>
    function goBack() {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
    }

    ${!isImage ? `
    // Mobile can't render <embed> for PDFs — show fallback card
    var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      var embed = document.getElementById('pdf-embed');
      var card = document.getElementById('mobile-card');
      if (embed) embed.style.display = 'none';
      if (card) card.style.display = 'flex';
    }
    ` : ''}
  </script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  })
}
