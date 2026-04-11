import { NextRequest, NextResponse } from 'next/server'
import { parseOrcamentoPdfWithGemini } from '@/lib/gemini-orcamento'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/orcamento/parse
 * Accepts multipart/form-data with field "file" (PDF).
 * Returns structured orçamento extracted by Gemini 2.5 Flash.
 *
 * Env var required: GEMINI_API_KEY
 * (Grátis em https://aistudio.google.com/apikey)
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Envie multipart/form-data com o campo "file"' },
        { status: 400 },
      )
    }

    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })

    const name = file.name.toLowerCase()
    if (!name.endsWith('.pdf') && !file.type.includes('pdf')) {
      return NextResponse.json(
        { error: 'Formato não suportado. Envie um PDF de orçamento.' },
        { status: 400 },
      )
    }

    // Gemini free tier accepts PDFs up to 20MB as inline data
    const MAX_SIZE = 20 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'PDF muito grande (máx 20MB). Comprima ou envie só as páginas do orçamento.' },
        { status: 400 },
      )
    }

    const buf = Buffer.from(await file.arrayBuffer())

    try {
      const parsed = await parseOrcamentoPdfWithGemini(buf)
      return NextResponse.json({
        ...parsed,
        file_name: file.name,
        file_size: file.size,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido no Gemini'
      console.error('[orcamento/parse] Gemini error:', msg)
      return NextResponse.json(
        { error: `Falha ao parsear com Gemini: ${msg}` },
        { status: 500 },
      )
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[orcamento/parse] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
