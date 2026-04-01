'use client'
import { useState, useEffect, useCallback } from 'react'
import { DollarSign, TrendingDown, TrendingUp, CheckCircle2, Clock, AlertTriangle, Calendar, CreditCard, PieChart, Users } from 'lucide-react'

interface Contract {
  id: string; professional: string; role: string; original_total: number; negotiated_total: number;
  payment_interval_days: number; start_date: string; first_payment_date: string; status: string; notes: string;
}
interface Payment {
  id: string; professional: string; installment_number: number; amount: number;
  due_date: string; paid_date: string | null; status: string; notes: string;
}
interface BudgetItem {
  id: string; professional: string; category: string; service: string; location: string;
  original_value: number | null; notes: string | null; status: string; sort_order: number;
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
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [cRes, pRes, bRes] = await Promise.all([
        fetch('/api/contracts'), fetch('/api/payments'), fetch('/api/budget-items'),
      ])
      const [cData, pData, bData] = await Promise.all([cRes.json(), pRes.json(), bRes.json()])
      setContracts(Array.isArray(cData) ? cData : [])
      setPayments(Array.isArray(pData) ? pData : [])
      setBudgetItems(Array.isArray(bData) ? bData : [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
        <p style={{ color: '#6b7280' }}>Carregando financeiro...</p>
      </div>
    )
  }

  // === CONSOLIDATED CALCULATIONS ===
  const totalOrcado = contracts.reduce((s, c) => s + c.original_total, 0)
  const totalNegociado = contracts.reduce((s, c) => s + c.negotiated_total, 0)
  const economiaTotal = totalOrcado - totalNegociado
  const totalPago = payments.filter(p => p.status === 'pago').reduce((s, p) => s + p.amount, 0)
  const totalPendente = payments.filter(p => p.status === 'pendente').reduce((s, p) => s + p.amount, 0)
  const percentPago = totalNegociado > 0 ? Math.round((totalPago / totalNegociado) * 100) : 0

  // Upcoming payments (all professionals, sorted by date)
  const upcomingPayments = payments
    .filter(p => p.status === 'pendente')
    .sort((a, b) => a.due_date.localeCompare(b.due_date))

  const nextPayment = upcomingPayments[0]
  const daysUntilNext = nextPayment
    ? Math.ceil((new Date(nextPayment.due_date + 'T12:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  // Per-professional breakdown
  const professionals = [...new Set(contracts.map(c => c.professional))]
  const profBreakdown = professionals.map(prof => {
    const profContracts = contracts.filter(c => c.professional === prof)
    const profPayments = payments.filter(p => p.professional === prof)
    const negociado = profContracts.reduce((s, c) => s + c.negotiated_total, 0)
    const pago = profPayments.filter(p => p.status === 'pago').reduce((s, p) => s + p.amount, 0)
    const pendente = profPayments.filter(p => p.status === 'pendente').reduce((s, p) => s + p.amount, 0)
    return { professional: prof, role: profContracts[0]?.role || '', negociado, pago, pendente, percent: negociado > 0 ? Math.round((pago / negociado) * 100) : 0 }
  })

  // Budget categories (across all professionals)
  const categories = [...new Set(budgetItems.map(b => b.category))]
  const categoryTotals = categories.map(cat => ({
    name: cat,
    total: budgetItems.filter(b => b.category === cat).reduce((s, b) => s + (b.original_value || 0), 0),
    count: budgetItems.filter(b => b.category === cat).length,
  })).sort((a, b) => b.total - a.total)
  const maxCategoryTotal = categoryTotals.length > 0 ? categoryTotals[0].total : 1

  // Status color
  const PROF_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#10B981', '#EF4444']

  return (
    <div>
      {/* === HEADER: Total Consolidado === */}
      <div style={{
        background: 'linear-gradient(135deg, #1E3A5F, #2563EB)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '16px',
        color: 'white',
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
          {contracts.length} contrato{contracts.length !== 1 ? 's' : ''} · Orçado {fmt(totalOrcado)} → Fechado {fmt(totalNegociado)}
        </p>

        {/* Progress bar */}
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', height: '10px', overflow: 'hidden', marginBottom: '14px' }}>
          <div style={{
            width: `${percentPago}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #60A5FA, #93C5FD)',
            borderRadius: '8px',
            transition: 'width 0.5s ease',
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
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 16px',
          borderRadius: '12px',
          marginBottom: '16px',
          background: daysUntilNext !== null && daysUntilNext <= 3 ? '#FEF2F2' : '#FFFBEB',
          border: `1px solid ${daysUntilNext !== null && daysUntilNext <= 3 ? '#FECACA' : '#FDE68A'}`,
        }}>
          {daysUntilNext !== null && daysUntilNext <= 3
            ? <AlertTriangle size={20} color="#DC2626" />
            : <Calendar size={20} color="#D97706" />
          }
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
              Próximo: {fmt(nextPayment.amount)} — {nextPayment.professional}
            </p>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: '2px 0 0' }}>
              {fmtDate(nextPayment.due_date)} · {daysUntilNext !== null && daysUntilNext > 0
                ? `Faltam ${daysUntilNext} dias`
                : daysUntilNext === 0 ? 'Vence HOJE!' : `Vencida há ${Math.abs(daysUntilNext!)} dias`
              }
            </p>
          </div>
        </div>
      )}

      {/* === PER-PROFESSIONAL BREAKDOWN === */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={16} /> Por Profissional
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {profBreakdown.map((prof, idx) => (
            <div key={prof.professional} style={{
              padding: '14px 16px',
              borderRadius: '12px',
              background: 'white',
              border: '1px solid #E5E7EB',
            }}>
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
              {/* Mini progress bar */}
              <div style={{ background: '#F3F4F6', borderRadius: '6px', height: '6px', overflow: 'hidden' }}>
                <div style={{
                  width: `${prof.percent}%`,
                  height: '100%',
                  background: PROF_COLORS[idx % PROF_COLORS.length],
                  borderRadius: '6px',
                  transition: 'width 0.5s ease',
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
              </div>
            </div>
          ))}

          {profBreakdown.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#9CA3AF', fontSize: '13px' }}>
              Nenhum contrato registrado ainda
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '10px',
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

      {/* === BUDGET BY CATEGORY === */}
      {categoryTotals.length > 0 && (
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieChart size={16} /> Orçamento por Categoria
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {categoryTotals.map(cat => (
              <div key={cat.name} style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'white',
                border: '1px solid #E5E7EB',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>{cat.name}</span>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#1F2937' }}>{fmt(cat.total)}</span>
                </div>
                <div style={{ background: '#F3F4F6', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(cat.total / maxCategoryTotal) * 100}%`,
                    height: '100%',
                    background: '#3B82F6',
                    borderRadius: '4px',
                  }} />
                </div>
                <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '4px 0 0' }}>{cat.count} itens</p>
              </div>
            ))}
          </div>

          {/* Total geral do orçamento detalhado */}
          <div style={{
            marginTop: '12px',
            padding: '12px 16px',
            borderRadius: '10px',
            background: '#F0F9FF',
            border: '1px solid #BAE6FD',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0369A1' }}>Total Detalhado</span>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#0C4A6E' }}>
              {fmt(categoryTotals.reduce((s, c) => s + c.total, 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
