import { NextRequest, NextResponse } from 'next/server'
import { parseNfeXml, parseNfeDanfePdf, parseFromChave, guessCategory, type NfeParsed } from '@/lib/nfe-parser'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/nfe/parse
 * Accepts multipart/form-data with field "file" (PDF DANFE or NF-e XML)
 * OR JSON { xml: "<...>" } / { chave: "44 digits" }
 * Returns parsed NF-e structure with category suggestions per item.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''

    let parsed: NfeParsed | null = null

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const file = form.get('file') as File | null
      if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })

      const name = file.name.toLowerCase()
      const buf = Buffer.from(await file.arrayBuffer())

      if (name.endsWith('.xml') || file.type.includes('xml')) {
        const xmlText = buf.toString('utf-8')
        parsed = parseNfeXml(xmlText)
      } else if (name.endsWith('.pdf') || file.type.includes('pdf')) {
        // unpdf is a serverless-friendly wrapper around pdfjs-dist that avoids
        // the DOMMatrix/browser-API issue in Node.js environments
        const { extractText, getDocumentProxy } = await import('unpdf')
        try {
          const pdf = await getDocumentProxy(new Uint8Array(buf))
          const { text } = await extractText(pdf, { mergePages: true })
          const pdfText = Array.isArray(text) ? text.join('\n') : text
          parsed = parseNfeDanfePdf(pdfText)
        } catch (pdfErr) {
          const msg = pdfErr instanceof Error ? pdfErr.message : 'PDF ilegível'
          return NextResponse.json(
            { error: `Não foi possível ler o PDF: ${msg}. Tente colar a chave de acesso manualmente.` },
            { status: 400 },
          )
        }
      } else {
        return NextResponse.json({ error: 'Formato não suportado. Envie PDF (DANFE) ou XML.' }, { status: 400 })
      }
    } else if (contentType.includes('application/json')) {
      const body = await req.json()
      if (body.xml && typeof body.xml === 'string') {
        parsed = parseNfeXml(body.xml)
      } else if (body.chave && typeof body.chave === 'string') {
        try {
          parsed = parseFromChave(body.chave)
        } catch (e) {
          return NextResponse.json({ error: e instanceof Error ? e.message : 'Chave inválida' }, { status: 400 })
        }
      } else {
        return NextResponse.json({ error: 'Envie xml ou chave' }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: 'Content-Type inválido' }, { status: 400 })
    }

    if (!parsed) return NextResponse.json({ error: 'Falha ao parsear' }, { status: 500 })

    // Add category suggestion per item
    const itensComCategoria = parsed.itens.map((it) => ({
      ...it,
      categoria_sugerida: guessCategory(it.descricao, it.ncm),
    }))

    return NextResponse.json({
      ...parsed,
      itens: itensComCategoria,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[nfe/parse] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
