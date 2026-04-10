'use client'
import { useState, useEffect, useCallback } from 'react'
import type { UserID } from '@/lib/constants'
import { DollarSign, TrendingDown, CheckCircle2, Clock, AlertTriangle, Calendar, CreditCard, PieChart, Users, Plus, Pencil, Trash2, Save, X, ChevronDown, ChevronUp, History, ShoppingCart, FileText } from 'lucide-react'
import NFeImportModal from './NFeImportModal'
import PaymentMethodsModal from './PaymentMethodsModal'

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
interface AuditEntry {
  id: string; action: string; entity_type: string; entity_id: string;
  entity_description: string; old_values: Record<string, unknown>; performed_by: string; performed_at: string;
}
interface Material {
  id: string; name: string; description?: string; category: string; quantity: number;
  unit_price: number; total_price: number; store?: string; purchase_url?: string;
  purchased_by: string; purchase_date: string; notes?: string;
}

const MATERIAL_CATEGORIES: Record<string, { label: string; emoji: string }> = {
  eletrica: { label: 'Elétrica', emoji: '⚡' },
  hidraulica: { label: 'Hidráulica', emoji: '🚿' },
  acabamento: { label: 'Acabamento', emoji: '✨' },
  pintura: { label: 'Pintura', emoji: '🎨' },
  alvenaria: { label: 'Alvenaria', emoji: '🧱' },
  piso: { label: 'Piso/Revestimento', emoji: '🏗️' },
  iluminacao: { label: 'Iluminação', emoji: '💡' },
  marcenaria: { label: 'Marcenaria', emoji: '🪚' },
  ferragem: { label: 'Ferragem', emoji: '🔩' },
  limpeza: { label: 'Limpeza', emoji: '🧹' },
  ferramentas: { label: 'Ferramentas', emoji: '🔧' },
  outro: { label: 'Outro', emoji: '📦' },
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
const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
const fmtDateTime = (d: string) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

interface Props {
  currentUser: UserID
}

export default function FinanceiroPanel({ currentUser }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedProf, setExpandedProf] = useState<string | null>(null)
  const [editingPayment, setEditingPayment] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [showAddPayment, setShowAddPayment] = useState<string | null>(null)
  const [newPayment, setNewPayment] = useState({ amount: '', due_date: '', notes: '' })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [showAuditLog, setShowAuditLog] = useState(false)
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showNfeImport, setShowNfeImport] = useState(false)
  const [showPaymentMethods, setShowPaymentMethods] = useState(false)

  const isOwner = currentUser === 'bruno' || currentUser === 'graziela'

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const logAction = async (action: string, entityType: string, entityId: string, description: string, oldValues?: Record<string, unknown>) => {
    try {
      await fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, entity_type: entityType, entity_id: entityId, entity_description: description, old_values: oldValues || null, performed_by: currentUser }),
      })
    } catch (e) { console.error('audit log error', e) }
  }

  const fetchData = useCallback(async () => {
    try {
      const [cRes, pRes, bRes, qRes, mRes] = await Promise.all([
        fetch('/api/contracts'), fetch('/api/payments'), fetch('/api/budget-items'), fetch('/api/quotes'), fetch('/api/materials'),
      ])
      const [cData, pData, bData, qData, mData] = await Promise.all([cRes.json(), pRes.json(), bRes.json(), qRes.json(), mRes.json()])
      setContracts(Array.isArray(cData) ? cData : [])
      setPayments(Array.isArray(pData) ? pData : [])
      setBudgetItems(Array.isArray(bData) ? bData : [])
      setQuotes(Array.isArray(qData) ? qData : [])
      setMaterials(Array.isArray(mData) ? mData : [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const fetchAuditLog = async () => {
    const res = await fetch('/api/audit-log')
    const data = await res.json()
    setAuditLog(Array.isArray(data) ? data : [])
  }

  // === HANDLERS ===
  const handleMarkPaid = async (payment: Payment) => {
    await fetch('/api/payments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: payment.id, status: 'pago', paid_date: new Date().toISOString().split('T')[0] }),
    })
    await logAction('status_change', 'payment', payment.id, `Parcela ${payment.installment_number} de ${payment.professional} marcada como paga (${fmt(payment.amount)})`, { status: 'pendente', amount: payment.amount })
    showToast(`Parcela ${payment.installment_number} marcada como paga!`)
    await fetchData()
  }

  const handleUnmarkPaid = async (payment: Payment) => {
    await fetch('/api/payments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: payment.id, status: 'pendente', paid_date: null }),
    })
    await logAction('status_change', 'payment', payment.id, `Parcela ${payment.installment_number} de ${payment.professional} revertida para pendente`, { status: 'pago' })
    showToast('Parcela revertida para pendente')
    await fetchData()
  }

  const handleSaveEdit = async (payment: Payment) => {
    const updates: Record<string, unknown> = {}
    const oldValues: Record<string, unknown> = {}
    if (editAmount && parseFloat(editAmount) !== payment.amount) {
      updates.amount = parseFloat(editAmount)
      oldValues.amount = payment.amount
    }
    if (editDate && editDate !== payment.due_date) {
      updates.due_date = editDate
      oldValues.due_date = payment.due_date
    }
    if (editNotes !== payment.notes) {
      updates.notes = editNotes
      oldValues.notes = payment.notes
    }
    if (Object.keys(updates).length === 0) {
      setEditingPayment(null)
      return
    }
    await fetch('/api/payments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: payment.id, ...updates }),
    })
    await logAction('edit', 'payment', payment.id, `Parcela ${payment.installment_number} de ${payment.professional} editada`, oldValues)
    showToast('Parcela atualizada!')
    setEditingPayment(null)
    await fetchData()
  }

  const handleDeletePayment = async (payment: Payment) => {
    // Mari can only delete her own items
    if (currentUser === 'mari') {
      // Check if this payment is associated with Mariana
      const isHers = payment.professional.toLowerCase().includes('mariana') || payment.professional.toLowerCase().includes('mari')
      if (!isHers) {
        showToast('Sem permissão para deletar parcelas de outros profissionais', 'error')
        setConfirmDelete(null)
        return
      }
    }
    await fetch('/api/payments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: payment.id }),
    })
    await logAction('delete', 'payment', payment.id, `Parcela ${payment.installment_number} de ${payment.professional} deletada (${fmt(payment.amount)}, vencimento ${payment.due_date})`, { amount: payment.amount, due_date: payment.due_date, notes: payment.notes, installment_number: payment.installment_number, professional: payment.professional })
    showToast('Parcela removida')
    setConfirmDelete(null)
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
    await logAction('create', 'payment', '', `Nova parcela ${maxInstall + 1} para ${professional}: ${fmt(parseFloat(newPayment.amount))}`)
    showToast(`Parcela ${maxInstall + 1} adicionada!`)
    setShowAddPayment(null)
    setNewPayment({ amount: '', due_date: '', notes: '' })
    await fetchData()
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
        <p style={{ color: '#6b7280' }}>Carregando financeiro...</p>
      </div>
    )
  }

  // === CALCULATIONS ===
  const financialQuotes = quotes.filter(q => ['contratado', 'pago'].includes(q.status))

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

  const totalOriginal = unifiedContracts.reduce((s, c) => s + c.originalTotal, 0)
  const totalNegociado = unifiedContracts.reduce((s, c) => s + c.negotiatedTotal, 0)
  const totalPagoServicos = payments.filter(p => p.status === 'pago').reduce((s, p) => s + p.amount, 0)
  const totalPendente = payments.filter(p => p.status === 'pendente').reduce((s, p) => s + p.amount, 0)
  const economiaTotal = totalOriginal - totalNegociado

  // Materials totals
  const materiaisTotal = materials.reduce((s, m) => s + m.total_price, 0)
  const materiaisPorCategoria = materials.reduce<Record<string, { total: number; count: number }>>((acc, m) => {
    const cat = m.category || 'outro'
    if (!acc[cat]) acc[cat] = { total: 0, count: 0 }
    acc[cat].total += m.total_price
    acc[cat].count += 1
    return acc
  }, {})
  const materiaisPorComprador = materials.reduce<Record<string, number>>((acc, m) => {
    acc[m.purchased_by] = (acc[m.purchased_by] || 0) + m.total_price
    return acc
  }, {})

  // Grand totals (services + materials)
  const totalPago = totalPagoServicos + materiaisTotal
  const totalGeral = totalNegociado + materiaisTotal
  const percentPago = totalGeral > 0 ? Math.round((totalPago / totalGeral) * 100) : 0

  const upcomingPayments = payments.filter(p => p.status === 'pendente').sort((a, b) => a.due_date.localeCompare(b.due_date))
  const nextPayment = upcomingPayments[0]
  const daysUntilNext = nextPayment ? Math.ceil((new Date(nextPayment.due_date + 'T12:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null

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

  // Gastos por Categoria
  const categorySpending: Record<string, { total: number; count: number }> = {}
  for (const item of budgetItems) {
    if (!categorySpending[item.category]) categorySpending[item.category] = { total: 0, count: 0 }
    categorySpending[item.category].total += item.original_value || 0
    categorySpending[item.category].count += 1
  }
  for (const contract of contracts) {
    const discount = contract.original_total - contract.negotiated_total
    if (discount > 0) {
      const contractItems = budgetItems.filter(b => b.professional === contract.professional)
      const contractBudgetTotal = contractItems.reduce((s, b) => s + (b.original_value || 0), 0)
      if (contractBudgetTotal > 0) {
        for (const item of contractItems) {
          const proportion = (item.original_value || 0) / contractBudgetTotal
          if (categorySpending[item.category]) categorySpending[item.category].total -= discount * proportion
        }
      }
    }
  }
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
    <div style={{ position: 'relative' }}>
      {/* TOAST */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
          background: toast.type === 'success' ? '#059669' : '#DC2626', color: 'white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', animation: 'fadeIn 0.3s ease',
        }}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* === HEADER === */}
      <div style={{
        background: 'linear-gradient(135deg, #1E3A5F, #2563EB)',
        borderRadius: '16px', padding: '20px', marginBottom: '16px', color: 'white',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={20} />
            <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>Visão Geral</h2>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {economiaTotal > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '4px 8px' }}>
                <TrendingDown size={12} />
                <span style={{ fontSize: '11px', fontWeight: 600 }}>Economia: {fmt(economiaTotal)}</span>
              </div>
            )}
            {isOwner && (
              <button onClick={() => { setShowAuditLog(!showAuditLog); if (!showAuditLog) fetchAuditLog() }}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', padding: '4px 8px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center' }}
                title="Ver histórico de alterações">
                <History size={14} />
              </button>
            )}
          </div>
        </div>
        <p style={{ fontSize: '12px', opacity: 0.7, margin: '0 0 12px' }}>
          {unifiedContracts.length} contrato{unifiedContracts.length !== 1 ? 's' : ''} · {materials.length} materia{materials.length !== 1 ? 'is' : 'l'}
        </p>

        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', height: '10px', overflow: 'hidden', marginBottom: '12px' }}>
          <div style={{ width: `${percentPago}%`, height: '100%', background: 'linear-gradient(90deg, #60A5FA, #93C5FD)', borderRadius: '8px', transition: 'width 0.5s ease' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 800 }}>{fmt(totalPago)}</div>
            <div style={{ fontSize: '10px', opacity: 0.7 }}>Total Pago ({percentPago}%)</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 800 }}>{fmt(totalGeral)}</div>
            <div style={{ fontSize: '10px', opacity: 0.7 }}>Total Geral</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 800 }}>{fmt(totalNegociado)}</div>
            <div style={{ fontSize: '10px', opacity: 0.7 }}>Serviços</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 800 }}>{fmt(materiaisTotal)}</div>
            <div style={{ fontSize: '10px', opacity: 0.7 }}>Materiais</div>
          </div>
        </div>
      </div>

      {/* === AUDIT LOG PANEL === */}
      {showAuditLog && (
        <div style={{ marginBottom: '16px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px', maxHeight: '300px', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#374151', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <History size={14} /> Histórico de Alterações
            </h3>
            <button onClick={() => setShowAuditLog(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}><X size={16} /></button>
          </div>
          {auditLog.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#9CA3AF', textAlign: 'center' }}>Nenhuma alteração registrada ainda</p>
          ) : (
            auditLog.slice(0, 20).map(log => (
              <div key={log.id} style={{ padding: '8px 0', borderBottom: '1px solid #E5E7EB', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: log.action === 'delete' ? '#DC2626' : log.action === 'edit' ? '#D97706' : '#059669' }}>
                    {log.action === 'delete' ? '🗑️ Deletou' : log.action === 'edit' ? '✏️ Editou' : log.action === 'create' ? '➕ Criou' : '🔄 Alterou'}
                  </span>
                  <span style={{ color: '#9CA3AF' }}>{fmtDateTime(log.performed_at)}</span>
                </div>
                <p style={{ margin: '2px 0 0', color: '#6B7280' }}>{log.entity_description}</p>
                <p style={{ margin: '2px 0 0', color: '#9CA3AF', fontStyle: 'italic' }}>por {log.performed_by}</p>
              </div>
            ))
          )}
        </div>
      )}

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
                ? `Faltam ${daysUntilNext} dias` : daysUntilNext === 0 ? 'Vence HOJE!' : `Vencida há ${Math.abs(daysUntilNext!)} dias`}
            </p>
          </div>
        </div>
      )}

      {/* === CONTRATOS & PAGAMENTOS === */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={16} /> Contratos & Pagamentos
        </h3>
        <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '0 0 12px', paddingLeft: '24px' }}>
          Toque em um profissional para ver e gerenciar parcelas
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {profBreakdown.map((prof, idx) => {
            const isExpanded = expandedProf === prof.professional
            const profPaymentsSorted = prof.payments.sort((a, b) => a.installment_number - b.installment_number)
            const color = PROF_COLORS[idx % PROF_COLORS.length]

            return (
              <div key={prof.professional} style={{
                borderRadius: '12px', background: 'white', border: `1px solid ${isExpanded ? color + '40' : '#E5E7EB'}`,
                overflow: 'hidden', transition: 'border-color 0.2s ease',
                boxShadow: isExpanded ? `0 2px 8px ${color}15` : 'none',
              }}>
                {/* Header */}
                <div
                  onClick={() => setExpandedProf(isExpanded ? null : prof.professional)}
                  style={{
                    padding: '14px 16px', cursor: 'pointer', userSelect: 'none',
                    background: isExpanded ? `${color}08` : 'white',
                    transition: 'background 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `${color}15`, color, fontWeight: 800, fontSize: '14px',
                      }}>
                        {prof.professional.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: '#1F2937', margin: 0 }}>{prof.professional}</p>
                        <p style={{ fontSize: '11px', color: '#6B7280', margin: 0 }}>{prof.role}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '15px', fontWeight: 800, color: '#1F2937', margin: 0 }}>{fmt(prof.negociado)}</p>
                        <p style={{ fontSize: '11px', color: '#10B981', fontWeight: 600, margin: 0 }}>{prof.percent}% pago</p>
                      </div>
                      {/* Clear expand/collapse indicator */}
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isExpanded ? color : '#F3F4F6', color: isExpanded ? 'white' : '#9CA3AF',
                        transition: 'all 0.2s ease',
                      }}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>
                  <div style={{ background: '#F3F4F6', borderRadius: '6px', height: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${prof.percent}%`, height: '100%', background: color, borderRadius: '6px', transition: 'width 0.5s ease' }} />
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
                    <span style={{ fontSize: '11px', color: color, fontWeight: 600 }}>
                      {profPaymentsSorted.length} parcela{profPaymentsSorted.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Expanded payments */}
                {isExpanded && (
                  <div style={{ borderTop: `2px solid ${color}20`, padding: '12px 16px', background: '#FAFBFC' }}>
                    {profPaymentsSorted.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '16px', background: '#FFF7ED', borderRadius: '8px', border: '1px solid #FED7AA', marginBottom: '8px' }}>
                        <p style={{ fontSize: '13px', color: '#92400E', margin: 0, fontWeight: 600 }}>Nenhuma parcela cadastrada</p>
                        <p style={{ fontSize: '12px', color: '#B45309', margin: '4px 0 0' }}>Adicione parcelas para controlar os pagamentos</p>
                      </div>
                    )}

                    {profPaymentsSorted.map(p => {
                      const isEditing = editingPayment === p.id
                      const isPago = p.status === 'pago'
                      const days = Math.ceil((new Date(p.due_date + 'T12:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                      const isConfirmingDelete = confirmDelete === p.id

                      return (
                        <div key={p.id} style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '10px 12px', borderRadius: '8px', marginBottom: '6px',
                          background: isPago ? '#F0FDF4' : days <= 3 && !isPago ? '#FEF2F2' : 'white',
                          border: `1px solid ${isPago ? '#BBF7D0' : days <= 3 && !isPago ? '#FECACA' : '#E5E7EB'}`,
                        }}>
                          <div style={{
                            width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isPago ? '#10B981' : '#E5E7EB', color: isPago ? 'white' : '#6B7280',
                            fontSize: '11px', fontWeight: 700, flexShrink: 0,
                          }}>
                            {isPago ? '✓' : p.installment_number}
                          </div>

                          {isEditing ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              <label style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor pago (R$)</label>
                              <input
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                value={editAmount}
                                onChange={e => setEditAmount(e.target.value)}
                                placeholder="0,00"
                                autoFocus
                                style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: '2px solid #BFDBFE', fontSize: '22px', fontWeight: 700, color: '#1E3A8A', background: 'white', boxSizing: 'border-box' }}
                              />
                              <label style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data</label>
                              <input
                                type="date"
                                value={editDate}
                                onChange={e => setEditDate(e.target.value)}
                                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #D1D5DB', fontSize: '15px', boxSizing: 'border-box' }}
                              />
                              <input
                                type="text"
                                value={editNotes}
                                onChange={e => setEditNotes(e.target.value)}
                                placeholder="Observação (opcional)"
                                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }}
                              />
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button onClick={() => handleSaveEdit(p)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '10px', background: '#10B981', color: 'white', border: 'none', fontSize: '14px', cursor: 'pointer', fontWeight: 700 }}>
                                  <Save size={14} /> Salvar
                                </button>
                                <button onClick={() => setEditingPayment(null)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '10px', background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', fontSize: '14px', cursor: 'pointer', fontWeight: 600 }}>
                                  <X size={14} /> Cancelar
                                </button>
                              </div>
                            </div>
                          ) : isConfirmingDelete ? (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '13px', color: '#DC2626', fontWeight: 600 }}>Confirmar exclusão?</span>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button onClick={() => handleDeletePayment(p)}
                                  style={{ padding: '4px 10px', borderRadius: '6px', background: '#DC2626', color: 'white', border: 'none', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                                  Sim, deletar
                                </button>
                                <button onClick={() => setConfirmDelete(null)}
                                  style={{ padding: '4px 10px', borderRadius: '6px', background: '#F3F4F6', color: '#6B7280', border: 'none', fontSize: '12px', cursor: 'pointer' }}>
                                  Cancelar
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
                                {isPago ? (
                                  <button onClick={() => handleUnmarkPaid(p)} title="Desfazer pagamento"
                                    style={{ padding: '4px 8px', borderRadius: '6px', background: '#FEF3C7', color: '#92400E', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                                    Desfazer
                                  </button>
                                ) : (
                                  <button onClick={() => handleMarkPaid(p)} title="Marcar como pago"
                                    style={{ padding: '4px 8px', borderRadius: '6px', background: '#D1FAE5', color: '#065F46', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                                    ✓ Pagar
                                  </button>
                                )}
                                <button onClick={() => { setEditingPayment(p.id); setEditAmount(String(p.amount)); setEditDate(p.due_date); setEditNotes(p.notes || '') }}
                                  title="Editar parcela"
                                  style={{ padding: '4px 6px', borderRadius: '6px', background: '#DBEAFE', color: '#1D4ED8', border: 'none', cursor: 'pointer' }}>
                                  <Pencil size={12} />
                                </button>
                                <button onClick={() => setConfirmDelete(p.id)} title="Excluir parcela"
                                  style={{ padding: '4px 6px', borderRadius: '6px', background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer' }}>
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}

                    {/* Add payment */}
                    {showAddPayment === prof.professional ? (
                      <div style={{ padding: '12px', borderRadius: '8px', background: '#EFF6FF', border: '1px solid #BFDBFE', marginTop: '6px' }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#1D4ED8', margin: '0 0 8px' }}>Nova Parcela</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '6px' }}>
                          <input type="number" placeholder="Valor (R$)" value={newPayment.amount}
                            onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }} />
                          <input type="date" value={newPayment.due_date}
                            onChange={e => setNewPayment({ ...newPayment, due_date: e.target.value })}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }} />
                        </div>
                        <input type="text" placeholder="Observação (opcional)" value={newPayment.notes}
                          onChange={e => setNewPayment({ ...newPayment, notes: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', marginBottom: '8px', boxSizing: 'border-box' }} />
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button onClick={() => handleAddPayment(prof.professional, prof.contractId, prof.quoteId)}
                            disabled={!newPayment.amount || !newPayment.due_date}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', borderRadius: '6px',
                              background: newPayment.amount && newPayment.due_date ? '#2563EB' : '#D1D5DB',
                              color: 'white', border: 'none', fontSize: '12px', fontWeight: 600, cursor: newPayment.amount && newPayment.due_date ? 'pointer' : 'default',
                            }}>
                            <Plus size={12} /> Adicionar
                          </button>
                          <button onClick={() => { setShowAddPayment(null); setNewPayment({ amount: '', due_date: '', notes: '' }) }}
                            style={{ padding: '6px 14px', borderRadius: '6px', background: '#F3F4F6', color: '#6B7280', border: 'none', fontSize: '12px', cursor: 'pointer' }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowAddPayment(prof.professional)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%',
                          padding: '10px', borderRadius: '8px', border: `1px dashed ${color}60`, background: `${color}05`,
                          color, fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginTop: '4px',
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
            <div style={{ textAlign: 'center', padding: '30px 20px', color: '#9CA3AF', fontSize: '13px', background: '#F9FAFB', borderRadius: '12px', border: '1px dashed #E5E7EB' }}>
              <p style={{ fontSize: '24px', margin: '0 0 8px' }}>📋</p>
              Nenhum contrato fechado ainda.<br />
              Feche orçamentos na aba Profissionais para vê-los aqui.
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
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieChart size={16} /> Gastos por Categoria
          </h3>
          <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '0 0 12px', paddingLeft: '24px' }}>
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

      {/* === MATERIAIS SECTION === */}
      <div style={{
        marginTop: '20px', borderRadius: '14px', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#166534', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShoppingCart size={16} /> Materiais de Obra
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#4ADE80', marginLeft: '6px' }}>
              {materials.length} ite{materials.length !== 1 ? 'ns' : 'm'}
            </span>
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowPaymentMethods(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '10px',
                background: 'white', color: '#4338CA', border: '1px solid #C7D2FE',
                cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              }}
              title="Gerenciar formas de pagamento (cartões, PIX, boletos)"
            >
              <CreditCard size={14} /> Cartões
            </button>
            <button
              onClick={() => setShowNfeImport(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '10px',
                background: '#059669', color: 'white', border: 'none',
                cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              }}
            >
              <FileText size={14} /> Importar NF-e
            </button>
          </div>
        </div>
      {materials.length === 0 && (
        <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280', fontSize: '13px', background: 'white', borderRadius: '10px', border: '1px dashed #BBF7D0' }}>
          Nenhum material ainda. Clique em &quot;Importar NF-e&quot; para começar.
        </div>
      )}
      {materials.length > 0 && (
        <>
          {/* By Category */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
            {Object.entries(materiaisPorCategoria)
              .sort(([, a], [, b]) => b.total - a.total)
              .map(([cat, data]) => {
                const catInfo = MATERIAL_CATEGORIES[cat] || { label: cat, emoji: '📦' }
                const maxMatCat = Math.max(...Object.values(materiaisPorCategoria).map(d => d.total))
                return (
                  <div key={cat} style={{ padding: '10px 12px', borderRadius: '10px', background: 'white', border: '1px solid #D1FAE5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>{catInfo.emoji} {catInfo.label}</span>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#166534' }}>{fmt(data.total)}</span>
                    </div>
                    <div style={{ background: '#ECFDF5', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${(data.total / maxMatCat) * 100}%`, height: '100%', background: '#059669', borderRadius: '4px' }} />
                    </div>
                    <p style={{ fontSize: '11px', color: '#6B7280', margin: '3px 0 0' }}>{data.count} ite{data.count !== 1 ? 'ns' : 'm'}</p>
                  </div>
                )
              })}
          </div>

          {/* By Buyer */}
          {Object.keys(materiaisPorComprador).length > 1 && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {Object.entries(materiaisPorComprador).map(([buyer, total]) => (
                <div key={buyer} style={{
                  flex: 1, padding: '8px 12px', borderRadius: '8px', background: 'white', border: '1px solid #D1FAE5',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>👤 {buyer}</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#166534' }}>{fmt(total)}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{
            padding: '10px 14px', borderRadius: '10px', background: '#059669', color: 'white',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Total Materiais</span>
            <span style={{ fontSize: '16px', fontWeight: 800 }}>{fmt(materiaisTotal)}</span>
          </div>
        </>
      )}
      </div>

      {/* === RESUMO GERAL === */}
      <div style={{
        marginTop: '20px', borderRadius: '14px', background: 'linear-gradient(135deg, #1E293B, #334155)',
        padding: '16px', color: 'white',
      }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px' }}>📊 Resumo Geral da Reforma</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>Serviços</div>
            <div style={{ fontSize: '15px', fontWeight: 800 }}>{fmt(totalNegociado)}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>Materiais</div>
            <div style={{ fontSize: '15px', fontWeight: 800 }}>{fmt(materiaisTotal)}</div>
          </div>
          <div style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>Total Investido na Reforma</div>
            <div style={{ fontSize: '20px', fontWeight: 800 }}>{fmt(totalGeral)}</div>
            <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>
              {fmt(totalPago)} pago · {fmt(totalGeral - totalPago)} restante
            </div>
          </div>
        </div>
      </div>

      {showNfeImport && (
        <NFeImportModal
          currentUser={currentUser}
          onClose={() => setShowNfeImport(false)}
          onSuccess={async () => {
            setShowNfeImport(false)
            await fetchData()
            showToast('NF-e importada com sucesso!', 'success')
          }}
        />
      )}

      {showPaymentMethods && (
        <PaymentMethodsModal
          currentUser={currentUser}
          onClose={() => setShowPaymentMethods(false)}
        />
      )}
    </div>
  )
}
