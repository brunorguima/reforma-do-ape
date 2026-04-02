'use client'
import { useState, useEffect, useCallback } from 'react'
import { DollarSign, TrendingDown, CheckCircle2, Clock, AlertTriangle, Calendar, CreditCard, PieChart, Users, Plus, Pencil, Trash2, Save, X } from 'lucide-react'

interface Contract {
  id: string; professional: string; role: string; original_total: number; negotiated_total: number;
  payment_interval_days: number; start_date: string; first_payment_date: string; status: string; notes: string;
}
interface Payment {
  id: string; professional: string; installment_number: number; amount: number;
  due_date: string; paid_date: string | null; status: string; notes: string;
  quote_id?: string | null; contract_id?: string | null; source?: string;
}
interface BudgetItem {
  id: string; professional: string; category: string; service: string; location: string;
  original_value: number | null; notes: string | null; status: string; sort_order: number;
}
interface Quote {
  id: string; professional_id: string; description: string; amount: number;
  status: string; payment_method?: string; payment_details?: string;
  negotiated_amount?: number; paid_date?: string;
  professional?: { id: string; name: string; specialty?: string };
  service_category?: { id: string; name: string };
  room?: { id: string; name: string };
}

const PAYMENT_METHOD_LABELS: Record<string, { label: string; emoji: string }> = {
  pix: { label: 'PIX', emoji: '⚡' },
  boleto: { label: 'Boleto', emoji: '📄' },
  cartao_credito: { label: 'Cartão Crédito', emoji: '💳' },
  cartao_debito: { label: 'Cartão Débito', emoji: '💳' },
  dinheiro: { label: 'Dinheiro', emoji: '💵' },
  transferencia: { label: 'Transferência', emoji: '🏦' },
  parcelado: { label: 'Parcelado', emoji: '📊' },
}

const fmt = (v: number | null | undefined) => {
  if (!v && v !== 0) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

const fmtDate = (d: string) => {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function FinanceiroPanel() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedProf, setExpandedProf] = useState<string | null>(null)
  const [editingPayment, setEditingPayment] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [showAddPayment, setShowAddPayment] = useState<string | null>(null)
  const [newPayment, setNewPayment] = useState({ amount: '', due_date: '', notes: '' })

  const fetchData = useCallback(async () => {
    try {
      const [cRes, pRes, bRes, qRes] = await Promise.all([
        fetch('/api/contracts'), fetch('/api/payments'), fetch('/api/budget-items'), fetch('/api/quotes'),
      ])
      const [cData, pData, bData, qData] = await Promise.all([cRes.json(), pRes.json(), bRes.json(), qRes.json()])
      setContracts(Array.isArray(cData) ? cData : [])
      setPayments(Array.isArray(pData) ? pData : [])
      setBudgetItems(Array.isArray(bData) ? bData : [])
      setQuotes(Array.isArray(qData) ? qData : [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // === HANDLERS ===
  const handleMarkPaid = async (paymentId: string) => {
    await fetch('/api/payments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: paymentId, status: 'pago', paid_date: new Date().toISOString().split('T')[0] }),
    })
    await fetchData()
    // Check if all payments for this professional are paid — auto-mark quote as pago
    await checkAutoCompletePago()
  }

  const handleSaveEdit = async (paymentId: string) => {
    const updates: Record<string, unknown> = {}
    if (editAmount) updates.amount = parseFloat(editAmount)
    if (editDate) updates.due_date = editDate
    if (editNotes !== undefined) updates.notes = editNotes
    await fetch('/api/payments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: paymentId, ...updates }),
    })
    setEditingPayment(null)
    await fetchData()
  }

  const handleDeletePayment = async (paymentId: string) => {
    await fetch('/api/payments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: paymentId }),
    })
    await fetchData()
  }

  const handleAddPayment = async (professional: string, contractId?: string, quoteId?: string) => {
    const profPayments = payments.filter(p => p.professional === professional)
    const maxInstall = profPayments.length > 0 ? Math.max(...profPayments.map(p => p.installment_number)) : 0
    await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        professional,
        installment_number: maxInstall + 1,
        amount: parseFloat(newPayment.amount),
        due_date: newPayment.due_date,
        notes: newPayment.notes || null,
        contract_id: contractId || null,
        quote_id: quoteId || null,
        source: quoteId ? 'quote' : contractId ? 'contract' : 'manual',
      }),
    })
    setShowAddPayment(null)
    setNewPayment({ amount: '', due_date: '', notes: '' })
    await fetchData()
  }

  const checkAutoCompletePago = async () => {
    // For each contratado quote, check if all linked payments are pago
    const contratadoQuotes = quotes.filter(q => q.status === 'contratado')
    for (const q of contratadoQuotes) {
      const profName = q.professional?.name
      if (!profName) continue
      const profPayments = payments.filter(p => p.professional === profName || p.quote_id === q.id)
      if (profPayments.length > 0 && profPayments.every(p => p.status === 'pago')) {
        await fetch(`/api/quotes/${q.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'pago', updated_by: 'sistema' }),
        })
      }
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
        <p style={{ color: '#6b7280' }}>Carregando financeiro...</p>
      </div>
    )
  }

  // === FINANCIAL QUOTES (contratado or pago) ===
  const financialQuotes = quotes.filter(q => ['contratado', 'pago'].includes(q.status))

  // === CONSOLIDATED: merge contracts + financial quotes into unified entries ===
  interface UnifiedContract {
    id: string; professional: string; role: string; source: 'contract' | 'quote';
    originalTotal: number; negotiatedTotal: number; paymentMethod?: string; paymentDetails?: string;
    description?: string; contractId?: string; quoteId?: string;
  }

  const unifiedContracts: UnifiedContract[] = [
    ...contracts.map(c => ({
      id: c.id, professional: c.professional, role: c.role, source: 'contract' as const,
      originalTotal: c.original_total, negotiatedTotal: c.negotiated_total,
      description: c.notes, contractId: c.id,
    })),
    ...financialQuotes.map(q => ({
      id: q.id, professional: q.professional?.name || 'Desconhecido',
      role: q.professional?.specialty || q.service_category?.name || '',
      source: 'quote' as const,
      originalTotal: Number(q.amount), negotiatedTotal: q.negotiated_amount || Number(q.amount),
      paymentMethod: q.payment_method, paymentDetails: q.payment_details,
      description: q.description, quoteId: q.id,
    })),
  ]

  // === TOTALS ===
  const totalOriginal = unifiedContracts.reduce((s, c) => s + c.originalTotal, 0)
  const totalNegociado = unifiedContracts.reduce((s, c) => s + c.negotiatedTotal, 0)
  const totalPago = payments.filter(p => p.status === 'pago').reduce((s, p) => s + p.amount, 0)
  const totalPendente = payments.filter(p => p.status === 'pendente').reduce((s, p) => s + p.amount, 0)
  const economiaTotal = totalOriginal - totalNegociado
  const percentPago = totalNegociado > 0 ? Math.round((totalPago / totalNegociado) * 100) : 0

  // Upcoming payments
  const upcomingPayments = payments.filter(p => p.status === 'pendente').sort((a, b) => a.due_date.localeCompare(b.due_date))
  const nextPayment = upcomingPayments[0]
  const daysUntilNext = nextPayment
    ? Math.ceil((new Date(nextPayment.due_date + 'T12:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  // Per-professional breakdown
  const allProfessionals = [...new Set(unifiedContracts.map(c => c.professional))]
  const profBreakdown = allProfessionals.map(prof => {
    const profContracts = unifiedContracts.filter(c => c.professional === prof)
    const profPayments = payments.filter(p => p.professional === prof)
    const negociado = profContracts.reduce((s, c) => s + c.negotiatedTotal, 0)
    const pago = profPayments.filter(p => p.status === 'pago').reduce((s, p) => s + p.amount, 0)
    const pendente = profPayments.filter(p => p.status === 'pendente').reduce((s, p) => s + p.amount, 0)
    const role = profContracts[0]?.role || ''
    const contractId = profContracts.find(c => c.source === 'contract')?.contractId
    const quoteId = profContracts.find(c => c.source === 'quote')?.quoteId
    return { professional: prof, role, negociado, pago, pendente, payments: profPayments, contractId, quoteId, percent: negociado > 0 ? Math.round((pago / negociado) * 100) : 0 }
  }).sort((a, b) => b.negociado - a.negociado)

  // === GASTOS POR CATEGORIA (using negotiated values with diluted discounts) ===
  // Build category spending from unified contracts, distributing proportionally
  const categorySpending: Record<string, { total: number; count: number }> = {}

  // From budget items, use actual negotiated values
  for (const item of budgetItems) {
    if (!categorySpending[item.category]) categorySpending[item.category] = { total: 0, count: 0 }
    categorySpending[item.category].total += item.original_value || 0
    categorySpending[item.category].count += 1
  }

  // If contracts have discounts, dilute across budget categories proportionally
  for (const contract of contracts) {
    const discount = contract.original_total - contract.negotiated_total
    if (discount > 0) {
      const contractItems = budgetItems.filter(b => b.professional === contract.professional)
      const contractBudgetTotal = contractItems.reduce((s, b) => s + (b.original_value || 0), 0)
      if (contractBudgetTotal > 0) {
        for (const item of contractItems) {
          const proportion = (item.original_value || 0) / contractBudgetTotal
          const itemDiscount = discount * proportion
          if (categorySpending[item.category]) {
            categorySpending[item.category].total -= itemDiscount
          }
        }
      }
    }
  }

  // Add financial quotes to categories
  for (const q of financialQuotes) {
    const catName = q.service_category?.name || q.professional?.specialty || 'Outros'
    if (!categorySpending[catName]) categorySpending[catName] = { total: 0, count: 0 }
    categorySpending[catName].total += q.negotiated_amount || Number(q.amount)
    categorySpending[catName].count += 1
  }

  const categoryTotals = Object.entries(categorySpending)
    .map(([name, data]) => ({ name, total: Math.max(0, data.total), count: data.count }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)
  const maxCategoryTotal = categoryTotals.length > 0 ? categoryTotals[0].total : 1
  const categoryGrandTotal = categoryTotals.reduce((s, c) => s + c.total, 0)

  const PROF_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#10B981', '#EF4444']

  return (
    <div>
      {/* === HEADER: Total Consolidado === */}
      <div style={{
        background: 'linear-gradient(135deg, #1E3A5F, #2563EB)',
        borderRadius: '16px', padding: '20px', marginBottom: '16px', color: 'white',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={20} /> Visão Geral
          </h2>
          {economiaTotal > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '4px 10px' }}>
              <TrendingDown size={14} />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Economia: {fmt(economiaTotal)}</span>
            </div>
          )}
        </div>
        <p style={{ fontSize: '12px', opacity: 0.7, margin: '0 0 14px' }}>
          {unifiedContracts.length} contrato{unifiedContracts.length !== 1 ? 's' : ''} fechado{unifiedContracts.length !== 1 ? 's' : ''}
        </p>

        {/* Progress bar */}
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', height: '10px', overflow: 'hidden', marginBottom: '14px' }}>
          <div style={{
            width: `${percentPago}%`, height: '100%',
            background: 'linear-gradient(90deg, #60A5FA, #93C5FD)', borderRadius: '8px', transition: 'width 0.5s ease',
          }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 800 }}>{fmt(totalPago)}</div>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>Pago ({percentPago}%)</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 800 }}>{fmt(totalPendente)}</div>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>Restante</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 800 }}>{fmt(totalNegociado)}</div>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>Total Fechado</div>
          </div>
        </div>
      </div>

      {/* === NEXT PAYMENT ALERT === */}
      {nextPayment && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '12px', marginBottom: '16px',
          background: daysUntilNext !== null && daysUntilNext <= 3 ? '#FEF2F2' : '#FFFBEB',
          border: `1px solid ${daysUntilNext !== null && daysUntilNext <= 3 ? '#FECACA' : '#FDE68A'}`,
        }}>
          {daysUntilNext !== null && daysUntilNext <= 3 ? <AlertTriangle size={20} color="#DC2626" /> : <Calendar size={20} color="#D97706" />}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
              Próximo: {fmt(nextPayment.amount)} — {nextPayment.professional}
            </p>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: '2px 0 0' }}>
              {fmtDate(nextPayment.due_date)} · {daysUntilNext !== null && daysUntilNext > 0
                ? `Faltam ${daysUntilNext} dias`
                : daysUntilNext === 0 ? 'Vence HOJE!' : `Vencida há ${Math.abs(daysUntilNext!)} dias`}
            </p>
          </div>
        </div>
      )}

      {/* === PER-PROFESSIONAL BREAKDOWN (expandable with payment management) === */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={16} /> Contratos & Pagamentos
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {profBreakdown.map((prof, idx) => {
            const isExpanded = expandedProf === prof.professional
            const profPaymentsSorted = prof.payments.sort((a, b) => a.installment_number - b.installment_number)

            return (
              <div key={prof.professional} style={{
                borderRadius: '12px', background: 'white', border: '1px solid #E5E7EB', overflow: 'hidden',
              }}>
                {/* Header - clickable to expand */}
                <div
                  onClick={() => setExpandedProf(isExpanded ? null : prof.professional)}
                  style={{
                    padding: '14px 16px', cursor: 'pointer',
                    background: isExpanded ? '#F8FAFC' : 'white',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `${PROF_COLORS[idx % PROF_COLORS.length]}15`, color: PROF_COLORS[idx % PROF_COLORS.length],
                        fontWeight: 800, fontSize: '14px',
                      }}>
                        {prof.professional.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: '#1F2937', margin: 0 }}>{prof.professional}</p>
                        <p style={{ fontSize: '11px', color: '#6B7280', margin: 0 }}>{prof.role}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '15px', fontWeight: 800, color: '#1F2937', margin: 0 }}>{fmt(prof.negociado)}</p>
                      <p style={{ fontSize: '11px', color: '#10B981', fontWeight: 600, margin: 0 }}>{prof.percent}% pago</p>
                    </div>
                  </div>
                  <div style={{ background: '#F3F4F6', borderRadius: '6px', height: '6px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${prof.percent}%`, height: '100%',
                      background: PROF_COLORS[idx % PROF_COLORS.length], borderRadius: '6px', transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#6B7280' }}>
                      <CheckCircle2 size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
                      Pago: {fmt(prof.pago)}
                    </span>
                    <span style={{ fontSize: '11px', color: '#6B7280' }}>
                      <Clock size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
                      Pendente: {fmt(prof.pendente)}
                    </span>
                    <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                      {isExpanded ? '▲' : '▼'} {profPaymentsSorted.length} parcela{profPaymentsSorted.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Expanded payment list */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #E5E7EB', padding: '12px 16px' }}>
                    {profPaymentsSorted.map(p => {
                      const isEditing = editingPayment === p.id
                      const isPago = p.status === 'pago'
                      const days = Math.ceil((new Date(p.due_date + 'T12:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

                      return (
                        <div key={p.id} style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '10px 12px', borderRadius: '8px', marginBottom: '6px',
                          background: isPago ? '#F0FDF4' : days <= 3 && !isPago ? '#FEF2F2' : '#F9FAFB',
                          border: `1px solid ${isPago ? '#BBF7D0' : days <= 3 && !isPago ? '#FECACA' : '#F3F4F6'}`,
                        }}>
                          {/* Installment number */}
                          <div style={{
                            width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isPago ? '#10B981' : '#E5E7EB',
                            color: isPago ? 'white' : '#6B7280', fontSize: '11px', fontWeight: 700, flexShrink: 0,
                          }}>
                            {isPago ? '✓' : p.installment_number}
                          </div>

                          {isEditing ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                                  placeholder="Valor" style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }} />
                                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                                  style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }} />
                              </div>
                              <input type="text" value={editNotes} onChange={e => setEditNotes(e.target.value)}
                                placeholder="Observação" style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }} />
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <button onClick={() => handleSaveEdit(p.id)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', background: '#10B981', color: 'white', border: 'none', fontSize: '12px', cursor: 'pointer' }}>
                                  <Save size={12} /> Salvar
                                </button>
                                <button onClick={() => setEditingPayment(null)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', background: '#6B7280', color: 'white', border: 'none', fontSize: '12px', cursor: 'pointer' }}>
                                  <X size={12} /> Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                                  {fmt(p.amount)}
                                  <span style={{ fontWeight: 400, color: '#6B7280', marginLeft: '6px', fontSize: '12px' }}>
                                    {fmtDate(p.due_date)}
                                    {!isPago && days <= 3 && days >= 0 && ' ⚠️'}
                                    {!isPago && days < 0 && ' 🔴'}
                                  </span>
                                </p>
                                {p.notes && <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.notes}</p>}
                              </div>
                              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                {!isPago && (
                                  <button onClick={() => handleMarkPaid(p.id)}
                                    style={{ padding: '4px 8px', borderRadius: '6px', background: '#D1FAE5', color: '#065F46', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                                    Pagar
                                  </button>
                                )}
                                <button onClick={() => { setEditingPayment(p.id); setEditAmount(String(p.amount)); setEditDate(p.due_date); setEditNotes(p.notes || '') }}
                                  style={{ padding: '4px 6px', borderRadius: '6px', background: '#DBEAFE', color: '#1D4ED8', border: 'none', cursor: 'pointer' }}>
                                  <Pencil size={12} />
                                </button>
                                <button onClick={() => handleDeletePayment(p.id)}
                                  style={{ padding: '4px 6px', borderRadius: '6px', background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer' }}>
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}

                    {/* No payments yet */}
                    {profPaymentsSorted.length === 0 && (
                      <p style={{ fontSize: '12px', color: '#9CA3AF', textAlign: 'center', padding: '8px' }}>
                        Nenhuma parcela cadastrada ainda
                      </p>
                    )}

                    {/* Add payment form */}
                    {showAddPayment === prof.professional ? (
                      <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#EFF6FF', border: '1px solid #BFDBFE', marginTop: '6px' }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#1D4ED8', margin: '0 0 8px' }}>Nova Parcela</p>
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                          <input type="number" placeholder="Valor (R$)" value={newPayment.amount}
                            onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })}
                            style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }} />
                          <input type="date" value={newPayment.due_date}
                            onChange={e => setNewPayment({ ...newPayment, due_date: e.target.value })}
                            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }} />
                        </div>
                        <input type="text" placeholder="Observação (opcional)" value={newPayment.notes}
                          onChange={e => setNewPayment({ ...newPayment, notes: e.target.value })}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', marginBottom: '6px', boxSizing: 'border-box' }} />
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleAddPayment(prof.professional, prof.contractId, prof.quoteId)}
                            disabled={!newPayment.amount || !newPayment.due_date}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px',
                              background: newPayment.amount && newPayment.due_date ? '#2563EB' : '#9CA3AF',
                              color: 'white', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                            }}>
                            <Plus size={12} /> Adicionar
                          </button>
                          <button onClick={() => { setShowAddPayment(null); setNewPayment({ amount: '', due_date: '', notes: '' }) }}
                            style={{ padding: '6px 12px', borderRadius: '6px', background: '#F3F4F6', color: '#6B7280', border: 'none', fontSize: '12px', cursor: 'pointer' }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddPayment(prof.professional)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%',
                          padding: '8px', borderRadius: '8px', border: '1px dashed #D1D5DB', background: 'transparent',
                          color: '#6B7280', fontSize: '12px', cursor: 'pointer', marginTop: '4px',
                        }}>
                        <Plus size={14} /> Adicionar Parcela
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {profBreakdown.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#9CA3AF', fontSize: '13px' }}>
              Nenhum contrato fechado ainda
            </div>
          )}
        </div>
      </div>

      {/* === UPCOMING PAYMENTS TIMELINE === */}
      {upcomingPayments.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={16} /> Próximos Pagamentos
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {upcomingPayments.slice(0, 6).map((p, idx) => {
              const days = Math.ceil((new Date(p.due_date + 'T12:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
              const isUrgent = days <= 3
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px',
                  background: isUrgent ? '#FEF2F2' : idx === 0 ? '#FFFBEB' : '#F9FAFB',
                  border: `1px solid ${isUrgent ? '#FECACA' : idx === 0 ? '#FDE68A' : '#F3F4F6'}`,
                }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isUrgent ? '#EF4444' : idx === 0 ? '#F59E0B' : '#E5E7EB',
                    color: isUrgent || idx === 0 ? 'white' : '#9CA3AF', fontSize: '12px', fontWeight: 700, flexShrink: 0,
                  }}>
                    {p.installment_number}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                      {fmt(p.amount)} — {p.professional}
                    </p>
                    <p style={{ fontSize: '11px', color: '#6B7280', margin: '2px 0 0' }}>
                      {fmtDate(p.due_date)} · {days > 0 ? `${days}d` : days === 0 ? 'HOJE' : `${Math.abs(days)}d atrás`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* === GASTOS POR CATEGORIA === */}
      {categoryTotals.length > 0 && (
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieChart size={16} /> Gastos por Categoria
          </h3>
          <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '-8px 0 12px', paddingLeft: '24px' }}>
            Valores finais negociados (descontos diluídos)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {categoryTotals.map(cat => (
              <div key={cat.name} style={{ padding: '12px 14px', borderRadius: '10px', background: 'white', border: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>{cat.name}</span>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#1F2937' }}>{fmt(cat.total)}</span>
                </div>
                <div style={{ background: '#F3F4F6', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${(cat.total / maxCategoryTotal) * 100}%`, height: '100%', background: '#3B82F6', borderRadius: '4px' }} />
                </div>
                <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '4px 0 0' }}>{cat.count} ite{cat.count !== 1 ? 'ns' : 'm'}</p>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '12px', padding: '12px 16px', borderRadius: '10px', background: '#F0F9FF', border: '1px solid #BAE6FD',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0369A1' }}>Total Estimado</span>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#0C4A6E' }}>{fmt(categoryGrandTotal)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
