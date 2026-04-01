'use client'
import { useState, useEffect, useCallback } from 'react'
import { DollarSign, Calendar, CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronUp, TrendingDown, FileText, CreditCard } from 'lucide-react'

interface Contract {
  id: string; professional: string; role: string; original_total: number; negotiated_total: number;
  payment_interval_days: number; start_date: string; first_payment_date: string; status: string; notes: string;
}
interface BudgetItem {
  id: string; professional: string; category: string; service: string; location: string;
  original_value: number | null; notes: string | null; status: string; sort_order: number;
}
interface Payment {
  id: string; professional: string; installment_number: number; amount: number;
  due_date: string; paid_date: string | null; status: string; notes: string;
}

const fmt = (v: number | null) => {
  if (!v) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

const fmtDate = (d: string) => {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function FinanceiroPanel() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [cRes, bRes, pRes] = await Promise.all([
        fetch('/api/contracts'), fetch('/api/budget-items'), fetch('/api/payments'),
      ])
      const [cData, bData, pData] = await Promise.all([cRes.json(), bRes.json(), pRes.json()])
      setContracts(Array.isArray(cData) ? cData : [])
      setBudgetItems(Array.isArray(bData) ? bData : [])
      setPayments(Array.isArray(pData) ? pData : [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleMarkPaid = async (payment: Payment) => {
    setMarkingPaid(payment.id)
    try {
      await fetch('/api/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: payment.id, status: 'pago', paid_date: new Date().toISOString().split('T')[0] }),
      })
      await fetchData()
    } catch (err) { console.error(err) }
    finally { setMarkingPaid(null) }
  }

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat); else next.add(cat)
      return next
    })
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
        <p style={{ color: '#6b7280' }}>Carregando financeiro...</p>
      </div>
    )
  }

  const contract = contracts[0]
  const totalPago = payments.filter(p => p.status === 'pago').reduce((s, p) => s + p.amount, 0)
  const totalPendente = payments.filter(p => p.status === 'pendente').reduce((s, p) => s + p.amount, 0)
  const economia = contract ? contract.original_total - contract.negotiated_total : 0
  const percentPago = contract ? Math.round((totalPago / contract.negotiated_total) * 100) : 0

  // Group budget items by category
  const categories = [...new Set(budgetItems.map(b => b.category))]
  const categoryTotals = categories.map(cat => ({
    name: cat,
    items: budgetItems.filter(b => b.category === cat),
    total: budgetItems.filter(b => b.category === cat).reduce((s, b) => s + (b.original_value || 0), 0),
  }))

  // Next payment
  const nextPayment = payments.find(p => p.status === 'pendente')

  // Days until next payment
  const daysUntilNext = nextPayment
    ? Math.ceil((new Date(nextPayment.due_date + 'T12:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div>
      {/* Financial Summary Header */}
      {contract && (
        <div style={{
          background: 'linear-gradient(135deg, #065F46, #047857)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '16px',
          color: 'white',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Pedreiro — Mão de Obra</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '4px 10px' }}>
              <TrendingDown size={14} />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Economia: {fmt(economia)}</span>
            </div>
          </div>
          <p style={{ fontSize: '12px', opacity: 0.7, margin: '0 0 14px' }}>
            Orçado {fmt(contract.original_total)} → Fechado {fmt(contract.negotiated_total)}
          </p>

          {/* Progress bar */}
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', height: '10px', overflow: 'hidden', marginBottom: '14px' }}>
            <div style={{
              width: `${percentPago}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #34D399, #6EE7B7)',
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
              <div style={{ fontSize: '18px', fontWeight: 800 }}>
                {contract.start_date ? fmtDate(contract.start_date) : '—'}
              </div>
              <div style={{ fontSize: '11px', opacity: 0.7 }}>Início da obra</div>
            </div>
          </div>
        </div>
      )}

      {/* Next Payment Alert */}
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
              Próxima parcela: {fmt(nextPayment.amount)} em {fmtDate(nextPayment.due_date)}
            </p>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: '2px 0 0' }}>
              {daysUntilNext !== null && daysUntilNext > 0
                ? `Faltam ${daysUntilNext} dias`
                : daysUntilNext === 0 ? 'Vence HOJE!' : `Vencida há ${Math.abs(daysUntilNext!)} dias`
              } · Parcela {nextPayment.installment_number}/5
            </p>
          </div>
          <button
            onClick={() => handleMarkPaid(nextPayment)}
            disabled={markingPaid === nextPayment.id}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              background: '#10B981',
              color: 'white',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: markingPaid === nextPayment.id ? 0.5 : 1,
            }}
          >
            <CheckCircle2 size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            Paguei
          </button>
        </div>
      )}

      {/* Payment Timeline */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CreditCard size={16} /> Cronograma de Parcelas
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {payments.map(p => {
            const isPaid = p.status === 'pago'
            const isNext = !isPaid && p.id === nextPayment?.id
            return (
              <div key={p.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '10px',
                background: isPaid ? '#F0FDF4' : isNext ? '#FFFBEB' : '#F9FAFB',
                border: `1px solid ${isPaid ? '#BBF7D0' : isNext ? '#FDE68A' : '#F3F4F6'}`,
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isPaid ? '#10B981' : isNext ? '#F59E0B' : '#E5E7EB',
                  color: isPaid || isNext ? 'white' : '#9CA3AF', fontSize: '13px', fontWeight: 700, flexShrink: 0,
                }}>
                  {isPaid ? <CheckCircle2 size={16} /> : p.installment_number}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', margin: 0 }}>{fmt(p.amount)}</p>
                  <p style={{ fontSize: '11px', color: '#6B7280', margin: '2px 0 0' }}>
                    {fmtDate(p.due_date)} · {p.notes}
                  </p>
                </div>
                {isPaid && (
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#10B981', background: '#DCFCE7', padding: '2px 8px', borderRadius: '6px' }}>
                    Pago {p.paid_date ? fmtDate(p.paid_date) : ''}
                  </span>
                )}
                {isNext && (
                  <Clock size={16} color="#D97706" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Budget Breakdown */}
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={16} /> Detalhamento do Orçamento
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {categoryTotals.map(cat => {
            const isExpanded = expandedCategories.has(cat.name)
            return (
              <div key={cat.name} style={{ borderRadius: '10px', border: '1px solid #E5E7EB', overflow: 'hidden', background: 'white' }}>
                <button
                  onClick={() => toggleCategory(cat.name)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', border: 'none', cursor: 'pointer', background: '#F9FAFB',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#374151' }}>{cat.name}</span>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>({cat.items.length} itens)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#047857' }}>{fmt(cat.total)}</span>
                    {isExpanded ? <ChevronUp size={16} color="#9CA3AF" /> : <ChevronDown size={16} color="#9CA3AF" />}
                  </div>
                </button>
                {isExpanded && (
                  <div style={{ padding: '8px' }}>
                    {cat.items.map(item => (
                      <div key={item.id} style={{
                        padding: '10px 12px', borderRadius: '8px', marginBottom: '4px',
                        background: '#FAFAFA', border: '1px solid #F3F4F6',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937', margin: 0 }}>{item.service}</p>
                            <p style={{ fontSize: '11px', color: '#6B7280', margin: '2px 0 0' }}>{item.location}</p>
                            {item.notes && (
                              <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '2px 0 0', fontStyle: 'italic' }}>{item.notes}</p>
                            )}
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '13px', color: item.original_value ? '#1F2937' : '#9CA3AF', flexShrink: 0, marginLeft: '8px' }}>
                            {item.original_value ? fmt(item.original_value) : item.notes || '—'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
