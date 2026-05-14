import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-helpers'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

// GET /api/measurements/[id]/pdf — Generate HTML-based PDF for a measurement
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user: _user, error: authError } = await requireAuth(req)
  if (authError) return authError

  const { id } = await params

  const { data: m, error } = await supabase
    .from('measurements')
    .select(`
      *,
      professional:professionals(id, name, phone, specialty),
      quote:quotes(id, description, amount, status),
      items:measurement_items(*)
    `)
    .eq('id', id)
    .single()

  if (error || !m) {
    return NextResponse.json({ error: 'Medição não encontrada' }, { status: 404 })
  }

  // Get project name
  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', m.project_id)
    .single()

  const items = m.items || []
  const originals = items.filter((i: { type: string }) => i.type === 'original')
  const extras = items.filter((i: { type: string }) => i.type === 'extra')
  const discounts = items.filter((i: { type: string }) => i.type === 'discount')

  const statusLabels: Record<string, string> = {
    rascunho: 'Rascunho',
    enviada: 'Aguardando Aprovação',
    aprovada: 'Aprovada',
    paga: 'Paga',
  }

  const itemRows = items.map((item: {
    type: string
    description: string
    completion_pct: number
    original_amount: number
    amount: number
    photo_url?: string | null
  }, idx: number) => `
    <tr class="${item.type}">
      <td>${idx + 1}</td>
      <td>
        ${item.description}
        ${item.photo_url ? `<br><img src="${item.photo_url}" class="item-photo" alt="Foto"/>` : ''}
      </td>
      <td class="center">${item.type === 'original' ? item.completion_pct + '%' : item.type === 'extra' ? 'Extra' : 'Desconto'}</td>
      <td class="right">${formatCurrency(Number(item.original_amount))}</td>
      <td class="right bold">${item.type === 'discount' ? '-' : ''}${formatCurrency(Number(item.amount))}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Medição #${m.measurement_number} - ${m.professional?.name || 'Profissional'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1a1c1e; padding: 40px; max-width: 800px; margin: 0 auto; }

    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #022448; }
    .header h1 { font-size: 24px; color: #022448; margin-bottom: 4px; }
    .header .subtitle { font-size: 14px; color: #6b7280; }
    .header .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-top: 8px; }
    .badge-rascunho { background: #f3f4f6; color: #6b7280; }
    .badge-enviada { background: #fef3c7; color: #d97706; }
    .badge-aprovada { background: #d1fae5; color: #059669; }
    .badge-paga { background: #dbeafe; color: #2563eb; }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px; }
    .info-box { background: #f9fafb; border-radius: 10px; padding: 14px; }
    .info-box .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 4px; }
    .info-box .value { font-size: 15px; font-weight: 600; color: #1a1c1e; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #022448; color: white; text-align: left; padding: 10px 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }
    td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
    tr.extra td { background: #fffbeb; }
    tr.discount td { background: #fef2f2; }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: 700; }

    .item-photo { width: 60px; height: 60px; object-fit: cover; border-radius: 6px; margin-top: 6px; border: 1px solid #e5e7eb; }

    .totals { background: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .totals .row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px; }
    .totals .row.net { border-top: 2px solid #86efac; padding-top: 10px; margin-top: 10px; font-size: 18px; font-weight: 800; color: #059669; }

    .notes { background: #f9fafb; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
    .notes h3 { font-size: 13px; font-weight: 700; color: #6b7280; margin-bottom: 6px; text-transform: uppercase; }
    .notes p { font-size: 14px; color: #374151; }

    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; }
    .sig-block { text-align: center; width: 45%; }
    .sig-line { border-top: 1px solid #1a1c1e; margin-top: 60px; padding-top: 6px; font-size: 13px; font-weight: 600; }
    .sig-role { font-size: 11px; color: #6b7280; }

    .print-note { text-align: center; font-size: 11px; color: #9ca3af; margin-top: 24px; }

    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Medição #${m.measurement_number}</h1>
      <div class="subtitle">${project?.name || 'Projeto'}</div>
      <span class="badge badge-${m.status}">${statusLabels[m.status] || m.status}</span>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 13px; color: #6b7280;">Data de emissão</div>
      <div style="font-size: 16px; font-weight: 700;">${formatDate(m.created_at)}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="label">Profissional</div>
      <div class="value">${m.professional?.name || '—'}</div>
      <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">${m.professional?.specialty || ''} ${m.professional?.phone ? '· ' + m.professional.phone : ''}</div>
    </div>
    <div class="info-box">
      <div class="label">Referência</div>
      <div class="value">${m.quote?.description || 'Sem orçamento vinculado'}</div>
      ${m.quote ? `<div style="font-size: 12px; color: #6b7280; margin-top: 2px;">Valor contrato: ${formatCurrency(Number(m.quote.amount))}</div>` : ''}
    </div>
    <div class="info-box">
      <div class="label">Período</div>
      <div class="value">${m.submitted_at ? formatDate(m.submitted_at) : formatDate(m.created_at)}</div>
    </div>
    <div class="info-box">
      <div class="label">Status</div>
      <div class="value">${statusLabels[m.status] || m.status}</div>
      ${m.paid_at ? `<div style="font-size: 12px; color: #059669; margin-top: 2px;">Pago em ${formatDate(m.paid_at)}</div>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 40px">#</th>
        <th>Descrição</th>
        <th class="center" style="width: 80px">Progresso</th>
        <th class="right" style="width: 110px">Valor Orig.</th>
        <th class="right" style="width: 110px">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <div class="row">
      <span>Serviços originais (${originals.length} itens)</span>
      <span class="bold">${formatCurrency(Number(m.total_amount))}</span>
    </div>
    ${Number(m.extras_amount) > 0 ? `
    <div class="row" style="color: #d97706;">
      <span>+ Extras (${extras.length} itens)</span>
      <span class="bold">+${formatCurrency(Number(m.extras_amount))}</span>
    </div>` : ''}
    ${Number(m.discounts_amount) > 0 ? `
    <div class="row" style="color: #dc2626;">
      <span>- Descontos (${discounts.length} itens)</span>
      <span class="bold">-${formatCurrency(Number(m.discounts_amount))}</span>
    </div>` : ''}
    <div class="row net">
      <span>Valor Líquido</span>
      <span>${formatCurrency(Number(m.net_amount))}</span>
    </div>
  </div>

  ${m.notes ? `
  <div class="notes">
    <h3>Observações do Profissional</h3>
    <p>${m.notes}</p>
  </div>` : ''}

  ${m.owner_notes ? `
  <div class="notes">
    <h3>Observações do Proprietário</h3>
    <p>${m.owner_notes}</p>
  </div>` : ''}

  <div class="footer">
    <div class="sig-block">
      <div class="sig-line">${m.professional?.name || 'Profissional'}</div>
      <div class="sig-role">${m.professional?.specialty || 'Profissional'}</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">Proprietário</div>
      <div class="sig-role">Aprovação</div>
    </div>
  </div>

  <div class="print-note">
    Documento gerado pelo Reforma do Apê · ${formatDate(new Date().toISOString())}
  </div>

  <div class="no-print" style="text-align: center; margin-top: 20px;">
    <button onclick="window.print()" style="background: #022448; color: white; border: none; padding: 12px 32px; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer;">
      Imprimir / Salvar PDF
    </button>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
