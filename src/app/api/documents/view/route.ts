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
  const isPdf = (doc.file_type || '') === 'application/pdf'

  // Return an HTML page with floating back button + full-page document
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName} — Reforma App</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #111827;
      overflow: hidden;
    }

    /* Floating toolbar - small, stays out of the way */
    .toolbar {
      position: fixed; top: 12px; left: 12px; right: 12px; z-index: 1000;
      display: flex; align-items: center; gap: 8px;
      pointer-events: none;
    }
    .toolbar > * { pointer-events: auto; }

    .btn {
      display: flex; align-items: center; gap: 5px;
      padding: 10px 16px;
      background: rgba(30, 58, 95, 0.95);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: white; border: none; border-radius: 12px;
      font-size: 14px; font-weight: 600;
      cursor: pointer; text-decoration: none;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      transition: transform 0.15s, background 0.2s;
      white-space: nowrap;
    }
    .btn:active { transform: scale(0.95); }
    .btn:hover { background: rgba(37, 99, 235, 0.95); }

    .btn-back { font-size: 15px; }

    .file-label {
      flex: 1;
      padding: 8px 14px;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-radius: 10px;
      color: rgba(255,255,255,0.8);
      font-size: 12px; font-weight: 500;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      min-width: 0;
    }

    .btn-download {
      font-size: 13px;
      padding: 10px 14px;
    }

    /* Full-page content */
    .content {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
    }

    /* PDF: use embed for native viewer with zoom */
    embed, object {
      width: 100%; height: 100%;
    }

    /* Image: zoomable */
    .img-container {
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      overflow: auto;
      touch-action: pinch-zoom pan-x pan-y;
    }
    .img-container img {
      max-width: 100%;
      max-height: 100vh;
      object-fit: contain;
    }

    /* PDF fallback for mobile that can't render embed */
    .pdf-fallback {
      display: none;
      flex-direction: column; align-items: center; justify-content: center;
      height: 100%; gap: 16px; color: white; text-align: center; padding: 40px;
    }
    .pdf-fallback .icon { font-size: 64px; }
    .pdf-fallback p { font-size: 15px; color: rgba(255,255,255,0.7); max-width: 300px; line-height: 1.5; }
    .pdf-fallback .open-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 14px 28px;
      background: #2563EB; color: white; border: none; border-radius: 12px;
      font-size: 16px; font-weight: 700;
      cursor: pointer; text-decoration: none;
    }
  </style>
</head>
<body>
  <!-- Floating toolbar -->
  <div class="toolbar">
    <button class="btn btn-back" onclick="goBack()" title="Voltar ao app">
      ← Voltar
    </button>
    <div class="file-label">${fileName}</div>
    <a href="${rawUrl}" download="${fileName}" class="btn btn-download" title="Baixar arquivo">
      ⬇
    </a>
  </div>

  <!-- Full-page content behind toolbar -->
  <div class="content" id="viewer">
    ${isImage ? `
    <div class="img-container">
      <img src="${rawUrl}" alt="${fileName}" />
    </div>
    ` : `
    <embed src="${rawUrl}" type="application/pdf" id="pdf-embed" />
    <div class="pdf-fallback" id="pdf-fallback">
      <div class="icon">📄</div>
      <h2>${fileName}</h2>
      <p>Seu navegador não suporta visualização de PDF embutida. Clique abaixo para abrir o arquivo.</p>
      <a href="${rawUrl}" target="_blank" class="open-btn">📄 Abrir PDF</a>
    </div>
    `}
  </div>

  <script>
    function goBack() {
      // Try to close this tab (works if opened via target=_blank)
      if (window.opener || window.history.length <= 1) {
        window.close();
        // window.close() might not work in all browsers, fallback after a small delay
        setTimeout(function() { window.location.href = '/'; }, 300);
      } else {
        window.history.back();
      }
    }

    ${isPdf ? `
    // On mobile, embed often fails — show fallback with buttons instead
    var embed = document.getElementById('pdf-embed');
    var fallback = document.getElementById('pdf-fallback');
    if (embed && fallback) {
      var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        embed.style.display = 'none';
        fallback.style.display = 'flex';
      } else {
        // On desktop, check if embed loaded after a moment
        setTimeout(function() {
          try {
            if (embed.offsetHeight < 50) {
              embed.style.display = 'none';
              fallback.style.display = 'flex';
            }
          } catch(e) {}
        }, 2000);
      }
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
