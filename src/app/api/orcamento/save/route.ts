import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'

/**
 * POST /api/orcamento/save
 * Persists a reviewed orçamento: creates quote + quote_items rows
 * and, if document_id is provided, links the uploaded PDF to it.
 *
 * Body:
 * {
 *   professional_id: uuid,
 *   service_category_id?: uuid,
 *   room_id?: uuid,
 *   description: string,
 *   amount: number,
 *   negotiated_amount?: number,
 *   status?: 'recebido' | 'avaliando' | 'aprovado' | 'contratado' | 'pago' | 'recusado',
 *   notes?: string,
 *   payment_method?: string,
 *   payment_details?: string,
 *   scheduled_date?: string,
 *   itens: [{ numero, descricao, quantidade, unidade, valor_unitario, valor_total, categoria, ambiente_sugerido, room_id, observacoes }],
 *   document_id?: uuid,   // if the PDF was already uploaded, link it back
 *   created_by?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      professional_id,
      service_category_id = null,
      room_id = null,
      description,
      amount,
      negotiated_amount = null,
      status = 'recebido',
      notes = null,
      payment_method = null,
      payment_details = null,
      scheduled_date = null,
      itens = [],
      document_id = null,
      created_by = 'bruno',
    } = body ?? {}

    if (!professional_id) {
      return NextResponse.json({ error: 'professional_id é obrigatório' }, { status: 400 })
    }
    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'description é obrigatório' }, { status: 400 })
    }
    if (typeof amount !== 'number' || amount < 0) {
      return NextResponse.json({ error: 'amount inválido' }, { status: 400 })
    }

    // 1. Create the quote header
    const { data: quote, error: quoteErr } = await supabase
      .from('quotes')
      .insert({
        professional_id,
        service_category_id,
        room_id,
        description,
        amount,
        negotiated_amount,
        status,
        notes,
        payment_method,
        payment_details,
        scheduled_date,
        created_by,
        updated_by: created_by,
      })
      .select()
      .single()

    if (quoteErr || !quote) {
      return NextResponse.json(
        { error: quoteErr?.message ?? 'Falha ao criar orçamento' },
        { status: 500 },
      )
    }

    // 2. Bulk insert quote_items (if any)
    let insertedItems: unknown[] = []
    if (Array.isArray(itens) && itens.length > 0) {
      const rows = itens.map((it: Record<string, unknown>, i: number) => ({
        quote_id: quote.id,
        numero: typeof it.numero === 'number' ? it.numero : i + 1,
        descricao: String(it.descricao ?? ''),
        quantidade: Number(it.quantidade ?? 1) || 1,
        unidade: (it.unidade as string | null) ?? null,
        valor_unitario: Number(it.valor_unitario ?? 0) || 0,
        valor_total: Number(it.valor_total ?? 0) || 0,
        categoria: (it.categoria as string | null) ?? null,
        ambiente_sugerido: (it.ambiente_sugerido as string | null) ?? null,
        room_id: (it.room_id as string | null) ?? null,
        observacoes: (it.observacoes as string | null) ?? null,
      }))
      const { data: itemsData, error: itemsErr } = await supabase
        .from('quote_items')
        .insert(rows)
        .select()
      if (itemsErr) {
        // Roll back the quote so we don't leave a ghost header
        await supabase.from('quotes').delete().eq('id', quote.id)
        return NextResponse.json(
          { error: `Falha ao salvar itens: ${itemsErr.message}` },
          { status: 500 },
        )
      }
      insertedItems = itemsData ?? []
    }

    // 3. Link the uploaded PDF (document) back to this quote
    if (document_id) {
      await supabase
        .from('documents')
        .update({ quote_id: quote.id, professional_id, room_id })
        .eq('id', document_id)
    }

    return NextResponse.json({
      quote,
      itens: insertedItems,
      item_count: insertedItems.length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[orcamento/save] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
