import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'

/**
 * GET /api/nfe/imports
 * Lists all imported NF-e records with item counts.
 */
export async function GET() {
  const { data, error } = await supabase
    .from('nfe_imports')
    .select('*')
    .order('data_emissao', { ascending: false, nullsFirst: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

/**
 * POST /api/nfe/imports
 * Body: {
 *   chave, numero, serie, modelo,
 *   emitente_nome, emitente_cnpj, emitente_ie,
 *   destinatario_cnpj_cpf,
 *   data_emissao, natureza_operacao,
 *   valor_total, valor_produtos, valor_frete, valor_desconto,
 *   source: 'pdf'|'xml'|'chave'|'manual',
 *   pdf_url, xml_url,
 *   raw_data, notes,
 *   created_by,
 *   // Items to import as materials:
 *   itens: [{
 *     numero, codigo, descricao, ncm, cfop, unidade,
 *     quantidade, valor_unitario, valor_total,
 *     category,          // user-edited category
 *     purchased_by,      // Bruno | Graziela | Mari
 *     import: boolean,   // skip if false
 *   }]
 * }
 *
 * Creates nfe_imports row + materials rows for each item marked import=true.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.created_by) {
      return NextResponse.json({ error: 'created_by obrigatório' }, { status: 400 })
    }

    // 1) Check for existing import by chave (upsert behavior)
    let nfeImportId: string | null = null
    if (body.chave) {
      const { data: existing } = await supabase
        .from('nfe_imports')
        .select('id')
        .eq('chave', body.chave)
        .maybeSingle()
      if (existing) nfeImportId = existing.id
    }

    const headerPayload = {
      chave: body.chave || null,
      numero: body.numero || null,
      serie: body.serie || null,
      modelo: body.modelo || null,
      emitente_nome: body.emitente_nome || null,
      emitente_cnpj: body.emitente_cnpj || null,
      emitente_ie: body.emitente_ie || null,
      destinatario_cnpj_cpf: body.destinatario_cnpj_cpf || null,
      data_emissao: body.data_emissao || null,
      natureza_operacao: body.natureza_operacao || null,
      valor_total: body.valor_total ?? null,
      valor_produtos: body.valor_produtos ?? null,
      valor_frete: body.valor_frete ?? null,
      valor_desconto: body.valor_desconto ?? null,
      source: body.source || 'manual',
      pdf_url: body.pdf_url || null,
      xml_url: body.xml_url || null,
      raw_data: body.raw_data || null,
      notes: body.notes || null,
      created_by: body.created_by,
      updated_at: new Date().toISOString(),
    }

    let header
    if (nfeImportId) {
      const { data, error } = await supabase
        .from('nfe_imports')
        .update(headerPayload)
        .eq('id', nfeImportId)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      header = data
    } else {
      const { data, error } = await supabase
        .from('nfe_imports')
        .insert(headerPayload)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      header = data
      nfeImportId = data.id
    }

    // 2) Create materials for items marked import
    const itensToImport = Array.isArray(body.itens)
      ? body.itens.filter((i: { import?: boolean }) => i.import !== false)
      : []

    type ItemIn = {
      numero: number
      codigo?: string
      descricao: string
      ncm?: string
      cfop?: string
      unidade?: string
      quantidade: number
      valor_unitario: number
      valor_total: number
      category?: string
      purchased_by?: string
    }

    const purchaseDate = body.data_emissao
      ? String(body.data_emissao).substring(0, 10)
      : new Date().toISOString().split('T')[0]

    const materialRows = (itensToImport as ItemIn[]).map((it) => ({
      name: it.descricao?.substring(0, 200) || 'Item',
      description: it.codigo ? `Código: ${it.codigo}` : null,
      category: it.category || 'outro',
      quantity: Number(it.quantidade) || 1,
      unit_price: Number(it.valor_unitario) || 0,
      total_price: Number(it.valor_total) || 0,
      store: body.emitente_nome || null,
      purchased_by: it.purchased_by || body.created_by || 'Bruno',
      purchase_date: purchaseDate,
      notes: body.numero ? `NF-e ${body.numero}/${body.serie || ''}` : null,
      nfe_import_id: nfeImportId,
      nfe_item_numero: it.numero,
      ncm: it.ncm || null,
      cfop: it.cfop || null,
      codigo_produto: it.codigo || null,
      unidade: it.unidade || null,
    }))

    let createdMaterials: unknown[] = []
    if (materialRows.length > 0) {
      const { data: matData, error: matError } = await supabase
        .from('materials')
        .insert(materialRows)
        .select()
      if (matError) {
        return NextResponse.json(
          { error: `NF-e salva mas falha ao criar materiais: ${matError.message}`, header },
          { status: 500 },
        )
      }
      createdMaterials = matData || []
    }

    return NextResponse.json({
      header,
      materials_created: createdMaterials.length,
      materials: createdMaterials,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[nfe/imports] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
