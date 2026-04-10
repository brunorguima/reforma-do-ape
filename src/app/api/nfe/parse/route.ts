import { NextRequest, NextResponse } from 'next/server'
import { parseNfeXml, parseNfeDanfePdf, guessCategory, type NfeParsed } from '@/lib/nfe-parser'

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
        const { PDFParse } = await import('pdf-parse')
        const parser = new PDFParse({ data: new Uint8Array(buf) })
        const textResult = await parser.getText()
        await parser.destroy()
        parsed = parseNfeDanfePdf(textResult.text)
      } else {
        return NextResponse.json({ error: 'Formato não suportado. Envie PDF (DANFE) ou XML.' }, { status: 400 })
      }
    } else if (contentType.includes('application/json')) {
      const body = await req.json()
      if (body.xml && typeof body.xml === 'string') {
        parsed = parseNfeXml(body.xml)
      } else if (body.chave && typeof body.chave === 'string') {
        // Chave-only: return skeleton for manual entry (scraping blocked by captcha)
        const chave = body.chave.replace(/\D/g, '')
        if (chave.length !== 44) {
          return NextResponse.json({ error: 'Chave deve ter 44 dígitos' }, { status: 400 })
        }
        parsed = {
          chave,
          modelo: chave.substring(20, 22),
          serie: String(parseInt(chave.substring(22, 25), 10)),
          numero: String(parseInt(chave.substring(25, 34), 10)),
          emitente_cnpj: chave.substring(6, 20),
          itens: [],
          source: 'xml',
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
