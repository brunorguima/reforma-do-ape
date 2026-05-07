import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const OFFICE_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'application/msword', // doc
  'application/vnd.ms-excel', // xls
  'application/vnd.ms-powerpoint', // ppt
]

const OFFICE_EXTENSIONS = ['.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt']

function getFileIcon(fileType: string, fileName: string): string {
  if (fileType.startsWith('image/')) return '🖼️'
  if (fileType === 'application/pdf') return '📄'
  const ext = fileName.toLowerCase()
  if (ext.endsWith('.docx') || ext.endsWith('.doc')) return '📝'
  if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) return '📊'
  if (ext.endsWith('.pptx') || ext.endsWith('.ppt')) return '📽️'
  return '📎'
}

function isOfficeFile(fileType: string, fileName: string): boolean {
  if (OFFICE_TYPES.includes(fileType)) return true
  return OFFICE_EXTENSIONS.some(ext => fileName.toLowerCase().endsWith(ext))
}

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
  const fileType = doc.file_type || ''
  const rawUrl = `/api/documents/raw?id=${id}`
  const icon = getFileIcon(fileType, fileName)

  const isImage = fileType.startsWith('image/')
  const isPdf = fileType === 'application/pdf'
  const isOffice = isOfficeFile(fileType, fileName)

  // For Office files, use Google Docs Viewer with the public Supabase URL
  const publicUrl = doc.url || ''
  const googleViewerUrl = isOffice && publicUrl
    ? `https://docs.google.com/gview?url=${encodeURIComponent(publicUrl)}&embedded=true`
    : ''

  // Determine viewer content
  let viewerContent: string
  let viewerScript: string

  if (isImage) {
    viewerContent = `
    <div class="img-wrap">
      <img src="${rawUrl}" alt="${fileName}" />
    </div>`
    viewerScript = ''
  } else if (isOffice && googleViewerUrl) {
    // Google Docs Viewer in iframe — works for docx, xlsx, pptx
    viewerContent = `
    <iframe src="${googleViewerUrl}" id="office-frame" class="office-frame"
      frameborder="0" allowfullscreen></iframe>
    <div class="fallback-card" id="fallback-card">
      <div class="icon">${icon}</div>
      <h2>${fileName}</h2>
      <p>Carregando pré-visualização...</p>
      <div class="loader"></div>
    </div>`
    viewerScript = `
    // Show loader while Google Viewer loads, fallback after timeout
    var frame = document.getElementById('office-frame');
    var fallback = document.getElementById('fallback-card');
    fallback.style.display = 'flex';
    frame.style.opacity = '0';
    frame.onload = function() {
      frame.style.opacity = '1';
      fallback.style.display = 'none';
    };
    // If it doesn't load in 8s, show download option
    setTimeout(function() {
      if (fallback.style.display !== 'none') {
        fallback.innerHTML = '<div class="icon">${icon}</div>' +
          '<h2>${fileName}</h2>' +
          '<p>Não foi possível carregar a pré-visualização. Use os botões abaixo.</p>' +
          '<a href="${rawUrl}" download="${fileName}" class="action-btn">⬇ Baixar Arquivo</a>' +
          '<a href="${googleViewerUrl}" target="_blank" class="action-btn secondary">🔗 Abrir no Google Viewer</a>';
      }
    }, 8000);`
  } else if (isPdf) {
    viewerContent = `
    <embed src="${rawUrl}" type="application/pdf" id="pdf-embed" />
    <div class="fallback-card" id="mobile-card">
      <div class="icon">📄</div>
      <h2>${fileName}</h2>
      <p>Toque no botão abaixo para visualizar. Depois use ← Voltar para retornar ao app.</p>
      <a href="${rawUrl}" target="_blank" class="action-btn">📄 Abrir PDF</a>
      <span class="hint">Abre em nova aba — feche-a para voltar aqui</span>
    </div>`
    viewerScript = `
    var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      var embed = document.getElementById('pdf-embed');
      var card = document.getElementById('mobile-card');
      if (embed) embed.style.display = 'none';
      if (card) card.style.display = 'flex';
    }`
  } else {
    // Unknown format — show download card
    viewerContent = `
    <div class="fallback-card" style="display:flex">
      <div class="icon">${icon}</div>
      <h2>${fileName}</h2>
      <p>Este formato não suporta pré-visualização. Baixe o arquivo para abrir.</p>
      <a href="${rawUrl}" download="${fileName}" class="action-btn">⬇ Baixar Arquivo</a>
    </div>`
    viewerScript = ''
  }

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
      flex-shrink: 0;
    }
    .btn:active { opacity: 0.8; transform: scale(0.97); }
    .btn-secondary { background: #334155; font-size: 14px; font-weight: 600; padding: 10px 14px; }
    .fname {
      flex: 1; color: #CBD5E1; font-size: 13px; font-weight: 500;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      padding: 0 4px;
    }
    .badge {
      padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600;
      background: #334155; color: #94A3B8; text-transform: uppercase; flex-shrink: 0;
    }

    .viewer {
      position: fixed; top: 53px; left: 0; right: 0; bottom: 0;
      overflow: auto; -webkit-overflow-scrolling: touch;
    }

    /* Embedded viewers */
    .viewer embed { width: 100%; height: 100%; display: block; }
    .office-frame { width: 100%; height: 100%; border: none; display: block; transition: opacity 0.3s; }

    /* Image viewer */
    .img-wrap {
      min-height: 100%; display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    .img-wrap img { max-width: 100%; height: auto; border-radius: 4px; }

    /* Fallback / loading card */
    .fallback-card {
      display: none;
      flex-direction: column; align-items: center; justify-content: center;
      height: 100%; padding: 40px 24px; text-align: center; gap: 16px;
    }
    .fallback-card .icon { font-size: 72px; }
    .fallback-card h2 { color: white; font-size: 18px; word-break: break-word; max-width: 320px; }
    .fallback-card p { color: #94A3B8; font-size: 14px; line-height: 1.6; max-width: 300px; }
    .fallback-card .hint { color: #64748B; font-size: 12px; }

    .action-btn {
      padding: 14px 28px;
      background: #2563EB; color: white; border: none; border-radius: 14px;
      font-size: 16px; font-weight: 700; cursor: pointer;
      text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
    }
    .action-btn:active { opacity: 0.8; }
    .action-btn.secondary {
      background: transparent; border: 2px solid #334155;
      font-size: 14px; padding: 10px 20px; color: #94A3B8;
    }

    .loader {
      width: 32px; height: 32px; border: 3px solid #334155;
      border-top-color: #2563EB; border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="topbar">
    <button class="btn" onclick="goBack()">← Voltar</button>
    <span class="fname">${icon} ${fileName}</span>
    <a href="${rawUrl}" download="${fileName}" class="btn btn-secondary">⬇</a>
  </div>

  <div class="viewer">
    ${viewerContent}
  </div>

  <script>
    function goBack() {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
    }
    ${viewerScript}
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
