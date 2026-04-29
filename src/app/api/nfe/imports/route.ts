import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getProjectId } from '@/lib/project'

export const runtime = 'nodejs'

interface PaymentMethodRow {
  id: string
  name: string
  kind: string
  closing_day: number | null
  due_day: number | null
  consolidate_monthly: boolean
  default_due_offset_days: number | null
}

/**
 * Calculate when a purchase will actually hit the bank account
 * based on the selected payment method.
 *
 * - PIX / Débito / Dinheiro: paid immediately (paid_date = purchase_date)
 * - Crédito: closing day + due day → next fatura
 * - Boleto: purchase_date + default_due_offset_days (default 15)
 * - Consolidate monthly: due_date = last day of purchase_date month
 */
function computePaymentSchedule(
  purchaseDate: Date,
  method: PaymentMethodRow | null,
): { due_date: string; paid_date: string | null; status: string } {
  const purchaseISO = purchaseDate.toISOString().substring(0, 10)
  if (!method) {
    return { due_date: purchaseISO, paid_date: null, status: 'pendente' }
  }

  // Immediate-payment kinds
  if (method.kind === 'pix' || method.kind === 'debito' || method.kind === 'dinheiro') {
    return { due_date: purchaseISO, paid_date: purchaseISO, status: 'pago' }
  }

  // Monthly-consolidated supplier (e.g. "Leroy Merlin — pago único dia X")
  if (method.consolidate_monthly) {
    const consolidateDay = method.due_day || 28
    const consolidated = new Date(purchaseDate)
    consolidated.setDate(consolidateDay)
    // If already past consolidation day, roll to next month
    if (purchaseDate.getDate() > consolidateDay) {
      consolidated.setMonth(consolidated.getMonth() + 1)
    }
    return {
      due_date: consolidated.toISOString().substring(0, 10),
      paid_date: null,
      status: 'pendente',
    }
  }

  // Credit card: find the fatura this purchase belongs to
  if (method.kind === 'credito') {
    const closing = method.closing_day || 28
    const due = method.due_day || 5
    const faturaMonth = new Date(purchaseDate)
    // If purchased after closing day, it belongs to fatura of next month
    if (purchaseDate.getDate() > closing) {
      faturaMonth.setMonth(faturaMonth.getMonth() + 1)
    }
    // Due date = due day of (fatura_month + 1)
    const dueDate = new Date(faturaMonth)
    dueDate.setMonth(dueDate.getMonth() + 1)
    dueDate.setDate(due)
    return {
      due_date: dueDate.toISOString().substring(0, 10),
      paid_date: null,
      status: 'pendente',
    }
  }

  // Boleto / transferência / outros — use default offset
  const offset = method.default_due_offset_days ?? 15
  const due = new Date(purchaseDate)
  due.setDate(due.getDate() + offset)
  return {
    due_date: due.toISOString().substring(0, 10),
    paid_date: null,
    status: 'pendente',
  }
}

/**
 * GET /api/nfe/imports
 * Lists all imported NF-e records with item counts.
 */
export async function GET(req: NextRequest) {
  const projectId = getProjectId(req)
  let query = supabase
    .from('nfe_imports')
    .select('*')
  if (projectId) query = query.eq('project_id', projectId)
  const { data, error } = await query.order('data_emissao', { ascending: false, nullsFirst: false })

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
      payment_forms: body.payment_forms || null,
      payment_method_id: body.payment_method_id || null,
      payment_status: body.payment_method_id ? 'pendente' : 'consolidar',
      created_by: body.created_by,
      updated_at: new Date().toISOString(),
      project_id: body.project_id || null,
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
      project_id: body.project_id || null,
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

    // 3) Create a payment row in the Financeiro ledger based on payment method
    let createdPayment: unknown = null
    const totalImported = materialRows.reduce((s, m) => s + (Number(m.total_price) || 0), 0)
    const shouldCreatePayment = body.create_payment !== false && totalImported > 0 && body.payment_method_id

    if (shouldCreatePayment) {
      // Fetch the chosen payment method to compute schedule
      const { data: methodData } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('id', body.payment_method_id)
        .maybeSingle()

      const method = methodData as PaymentMethodRow | null
      const purchaseDateStr = body.data_emissao
        ? String(body.data_emissao).substring(0, 10)
        : new Date().toISOString().split('T')[0]
      const purchaseDate = new Date(purchaseDateStr + 'T12:00:00')

      // Allow client to override the computed due_date (editable)
      const auto = computePaymentSchedule(purchaseDate, method)
      const due_date = body.payment_due_date || auto.due_date
      const paid_date = body.payment_paid_date ?? auto.paid_date
      const status = body.payment_status_override || auto.status

      const paymentRow = {
        professional: body.emitente_nome || 'Fornecedor NF-e',
        supplier_name: body.emitente_nome || null,
        installment_number: 1,
        amount: totalImported,
        due_date,
        paid_date,
        status,
        notes: body.payment_notes
          || (body.numero ? `NF-e ${body.numero}/${body.serie || ''}` : 'Importado de NF-e'),
        source: 'nfe',
        nfe_import_id: nfeImportId,
        payment_method_id: body.payment_method_id,
        project_id: body.project_id || null,
      }

      const { data: payData, error: payError } = await supabase
        .from('payments')
        .insert(paymentRow)
        .select()
        .single()

      if (payError) {
        return NextResponse.json(
          {
            error: `NF-e e materiais salvos, mas falha ao criar pagamento: ${payError.message}`,
            header,
            materials_created: createdMaterials.length,
          },
          { status: 500 },
        )
      }
      createdPayment = payData

      // Update nfe_imports payment_status to match created payment
      await supabase
        .from('nfe_imports')
        .update({ payment_status: status === 'pago' ? 'pago' : 'pendente' })
        .eq('id', nfeImportId)
    }

    return NextResponse.json({
      header,
      materials_created: createdMaterials.length,
      materials: createdMaterials,
      payment: createdPayment,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[nfe/imports] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
