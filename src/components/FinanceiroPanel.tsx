'use client'
import { useState, useEffect, useCallback } from 'react'
import type { UserID } from '@/lib/constants'
import { apiUrl, withProjectId } from '@/lib/project-client'
import { DollarSign, TrendingDown, CheckCircle2, Clock, AlertTriangle, Calendar, CreditCard, Users, Plus, Pencil, Trash2, Save, X, ChevronDown, ChevronUp, History, ShoppingCart, FileText } from 'lucide-react'
import { PieChart as PieChartIcon } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts'
import { KpiCard, KpiGrid } from '@/components/ui'
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
  payment_type?: string; // pix, cartao_parcelado, boleto, dinheiro, transferencia
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
  eletrica: { label: 'Eletrica', emoji: '⚡' },
  hidraulica: { label: 'Hidraulica', emoji: '🚿' },
  acabamento: { label: 'Acabamento', emoji: '✨' },
  pintura: { label: 'Pintura', emoji: '🎨' },
  alvenaria: { label: 'Alvenaria', emoji: '🧱' },
  piso: { label: 'Piso/Revestimento', emoji: '🏗️' },
  iluminacao: { label: 'Iluminacao', emoji: '💡' },
  marcenaria: { label: 'Marcenaria', emoji: '🪚' },
  ferragem: { label: 'Ferragem', emoji: '🔩' },
  limpeza: { label: 'Limpeza', emoji: '🧹' },
  ferramentas: { label: 'Ferramentas', emoji: '🔧' },
  outro: { label: 'Outro', emoji: '📦' },
}

const PAYMENT_METHOD_LABELS: Record<string, { label: string; emoji: string }> = {
  pix: { label: 'PIX', emoji: '⚡' },
  boleto: { label: 'Boleto', emoji: '📄' },
  cartao_credito: { label: 'Cartao Credito', emoji: '💳' },
  cartao_debito: { label: 'Cartao Debito', emoji: '💳' },
  dinheiro: { label: 'Dinheiro', emoji: '💵' },
  transferencia: { label: 'Transferencia', emoji: '🏦' },
  parcelado: { label: 'Parcelado', emoji: '📊' },
}

const fmt = (v: number | null | undefined) => {
  if (!v && v !== 0) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
const fmtDateTime = (d: string) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

const PIE_COLORS = ['#022448', '#0051d5', '#adc8f5', '#059669', '#d97706', '#dc2626']

interface Props {
  currentUser: UserID
  projectId?: string | null
}

export default function FinanceiroPanel({ currentUser, projectId }: Props) {
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
  const [newPayment, setNewPayment] = useState({ amount: '', due_date: '', notes: '', payment_type: 'pix' })
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
        body: JSON.stringify(withProjectId({ action, entity_type: entityType, entity_id: entityId, entity_description: description, old_values: oldValues || null, performed_by: currentUser }, projectId)),
      })
    } catch (e) { console.error('audit log error', e) }
  }

  const fetchData = useCallback(async () => {
    try {
      const [cRes, pRes, bRes, qRes, mRes] = await Promise.all([
        fetch(apiUrl('/api/contracts', projectId)), fetch(apiUrl('/api/payments', projectId)), fetch(apiUrl('/api/budget-items', projectId)), fetch(apiUrl('/api/quotes', projectId)), fetch(apiUrl('/api/materials', projectId)),
      ])
      const [cData, pData, bData, qData, mData] = await Promise.all([cRes.json(), pRes.json(), bRes.json(), qRes.json(), mRes.json()])
      setContracts(Array.isArray(cData) ? cData : [])
      setPayments(Array.isArray(pData) ? pData : [])
      setBudgetItems(Array.isArray(bData) ? bData : [])
      setQuotes(Array.isArray(qData) ? qData : [])
      setMaterials(Array.isArray(mData) ? mData : [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { fetchData() }, [fetchData])

  const fetchAuditLog = async () => {
    const res = await fetch(apiUrl('/api/audit-log', projectId))
    const data = await res.json()
    setAuditLog(Array.isArray(data) ? data : [])
  }

  // === HANDLERS ===
  const handleMarkPaid = async (payment: Payment) => {
    await fetch('/api/payments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(withProjectId({ id: payment.id, status: 'pago', paid_date: new Date().toISOString().split('T')[0] }, projectId)),
    })
    await logAction('status_change', 'payment', payment.id, `Parcela ${payment.installment_number} de ${payment.professional} marcada como paga (${fmt(payment.amount)})`, { status: 'pendente', amount: payment.amount })
    showToast(`Parcela ${payment.installment_number} marcada como paga!`)
    await fetchData()
  }

  const handleUnmarkPaid = async (payment: Payment) => {
    await fetch('/api/payments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(withProjectId({ id: payment.id, status: 'pendente', paid_date: null }, projectId)),
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
      body: JSON.stringify(withProjectId({ id: payment.id, ...updates }, projectId)),
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
        showToast('Sem permissao para deletar parcelas de outros profissionais', 'error')
        setConfirmDelete(null)
        return
      }
    }
    await fetch('/api/payments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(withProjectId({ id: payment.id }, projectId)),
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
      body: JSON.stringify(withProjectId({
        professional,
        installment_number: maxInstall + 1,
        amount: parseFloat(newPayment.amount),
        due_date: newPayment.due_date,
        notes: newPayment.notes || null,
        contract_id: contractId || null,
        quote_id: quoteId || null,
        source: quoteId ? 'quote' : contractId ? 'contract' : 'manual',
        payment_type: newPayment.payment_type || 'pix',
      }, projectId)),
    })
    await logAction('create', 'payment', '', `Nova parcela ${maxInstall + 1} para ${professional}: ${fmt(parseFloat(newPayment.amount))} (${newPayment.payment_type})`)
    showToast(`Parcela ${maxInstall + 1} adicionada!`)
    setShowAddPayment(null)
    setNewPayment({ amount: '', due_date: '', notes: '', payment_type: 'pix' })
    await fetchData()
  }

  const handleRecalculate = async (professional: string, negociado: number) => {
    const profPayments = payments.filter(p => p.professional === professional)
    const pago = profPayments.filter(p => p.status === 'pago').reduce((s, p) => s + p.amount, 0)
    const pendingPayments = profPayments.filter(p => p.status === 'pendente').sort((a, b) => a.due_date.localeCompare(b.due_date))
    if (pendingPayments.length === 0) {
      showToast('Sem parcelas pendentes para recalcular', 'error')
      return
    }
    const remaining = negociado - pago
    if (remaining <= 0) {
      showToast('Ja foi pago o valor total (ou mais) do contrato', 'error')
      return
    }
    const perInstallment = Math.floor((remaining / pendingPayments.length) * 100) / 100
    const lastExtra = Math.round((remaining - perInstallment * pendingPayments.length) * 100) / 100
    try {
      await Promise.all(pendingPayments.map((p, idx) => {
        const newAmount = idx === pendingPayments.length - 1 ? perInstallment + lastExtra : perInstallment
        return fetch('/api/payments', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(withProjectId({ id: p.id, amount: newAmount }, projectId)),
        })
      }))
      await logAction('edit', 'payment', '', `Recalculo automatico: ${pendingPayments.length} parcelas de ${professional} redistribuidas — R$${remaining.toFixed(2)} restante / ${pendingPayments.length} = R$${perInstallment.toFixed(2)}/parcela`)
      showToast(`${pendingPayments.length} parcelas recalculadas! R$${perInstallment.toFixed(2)} cada`)
      await fetchData()
    } catch (err) {
      console.error('recalculate error', err)
      showToast('Erro ao recalcular parcelas', 'error')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-15 px-5">
        <div className="text-5xl mb-4">💰</div>
        <p className="text-on-surface-variant">Carregando financeiro...</p>
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

  const upcomingPayments = payments.filter(p => p.status === 'pendente').sort((a, b) => a.due_date.localeCompare(b.due_date))
  const nextPayment = upcomingPayments[0]
  const daysUntilNext = nextPayment ? Math.ceil((new Date(nextPayment.due_date + 'T12:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null

  const allProfessionals = [...new Set(unifiedContracts.map(c => c.professional))]
  const profBreakdown = allProfessionals.map(prof => {
    const profContracts = unifiedContracts.filter(c => c.professional === prof)
    const profPayments = payments.filter(p => p.professional === prof)
    const negociado = profContracts.reduce((s, c) => s + c.negotiatedTotal, 0)
    const isCartaoParcelado = profPayments.some(p => p.payment_type === 'cartao_parcelado')
    // For cartao parcelado: professional is 100% paid (card company paid them)
    // "pago" = what already left your pocket, "pendente" = card installments still coming
    const pagoEfetivo = profPayments.filter(p => p.status === 'pago').reduce((s, p) => s + p.amount, 0)
    const pendenteEfetivo = profPayments.filter(p => p.status === 'pendente').reduce((s, p) => s + p.amount, 0)
    // For professional's perspective: if cartao parcelado, they're 100% paid
    const pagoProfissional = isCartaoParcelado ? negociado : pagoEfetivo
    const pendenteProfissional = isCartaoParcelado ? 0 : pendenteEfetivo
    const role = profContracts[0]?.role || ''
    const contractId = profContracts.find(c => c.source === 'contract')?.contractId
    const quoteId = profContracts.find(c => c.source === 'quote')?.quoteId
    const totalScheduled = pagoEfetivo + pendenteEfetivo
    const discrepancy = negociado > 0 && !isCartaoParcelado ? totalScheduled - negociado : 0
    const pendingCount = profPayments.filter(p => p.status === 'pendente').length
    const percentProfissional = negociado > 0 ? Math.round((pagoProfissional / negociado) * 100) : 0
    return {
      professional: prof, role, negociado,
      pago: pagoEfetivo, pendente: pendenteEfetivo,
      pagoProfissional, pendenteProfissional,
      isCartaoParcelado, payments: profPayments,
      contractId, quoteId, percent: percentProfissional,
      discrepancy, pendingCount,
    }
  }).sort((a, b) => b.negociado - a.negociado)

  // Cash flow: group ALL pending payments by month for fluxo de caixa
  const cashFlowByMonth: Record<string, { total: number; items: { professional: string; amount: number; type: string }[] }> = {}
  for (const p of payments.filter(p => p.status === 'pendente')) {
    const month = p.due_date.substring(0, 7) // YYYY-MM
    if (!cashFlowByMonth[month]) cashFlowByMonth[month] = { total: 0, items: [] }
    cashFlowByMonth[month].total += p.amount
    cashFlowByMonth[month].items.push({ professional: p.professional, amount: p.amount, type: p.payment_type || 'pix' })
  }
  const cashFlowMonths = Object.entries(cashFlowByMonth).sort(([a], [b]) => a.localeCompare(b))

  // KPI totals — profissional perspective (cartao = 100% pago)
  const totalPagoServicos = profBreakdown.reduce((s, p) => s + p.pagoProfissional, 0)
  const totalPendente = profBreakdown.reduce((s, p) => s + p.pendenteProfissional, 0)
  // Fluxo de caixa: o que ainda vai sair do bolso de fato
  const totalAindaSaiDoBolso = payments.filter(p => p.status === 'pendente').reduce((s, p) => s + p.amount, 0)

  // Grand totals (services + materials)
  const totalPago = totalPagoServicos + materiaisTotal
  const totalGeral = totalNegociado + materiaisTotal
  const percentPago = totalGeral > 0 ? Math.round((totalPago / totalGeral) * 100) : 0

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
  const categoryGrandTotal = categoryTotals.reduce((s, c) => s + c.total, 0)

  // Recharts data for PieChart
  const pieData = categoryTotals.map((cat, idx) => ({
    name: cat.name,
    value: cat.total,
    fill: PIE_COLORS[idx % PIE_COLORS.length],
  }))

  // Recharts data for BarChart
  const barData = cashFlowMonths.slice(0, 6).map(([month, data]) => {
    const [y, m] = month.split('-')
    const monthName = new Date(Number(y), Number(m) - 1).toLocaleString('pt-BR', { month: 'short' })
    return { name: monthName, value: data.total }
  })

  const PROF_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#10B981', '#EF4444']

  return (
    <div className="relative">
      {/* TOAST */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] px-5 py-2.5 rounded-2xl text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] animate-[fadeIn_0.3s_ease] ${toast.type === 'success' ? 'bg-success' : 'bg-danger'}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* === HEADER === */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <DollarSign size={20} className="text-on-surface" />
          <h2 className="text-[17px] font-bold m-0">Visao Geral</h2>
        </div>
        {isOwner && (
          <button onClick={() => { setShowAuditLog(!showAuditLog); if (!showAuditLog) fetchAuditLog() }}
            className="bg-surface-container border border-outline-variant rounded-xl px-2 py-1 cursor-pointer text-on-surface flex items-center"
            title="Ver historico de alteracoes">
            <History size={14} />
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <KpiGrid cols={2}>
        <KpiCard
          label="Total Pago"
          value={fmt(totalPago)}
          sub={`${percentPago}% do total`}
          icon={<CheckCircle2 size={20} />}
          accent="success"
        />
        <KpiCard
          label="Servicos"
          value={fmt(totalNegociado)}
          sub={`${unifiedContracts.length} contratos`}
          icon={<Users size={20} />}
          accent="primary"
        />
        <KpiCard
          label="Materiais"
          value={fmt(materiaisTotal)}
          sub={`${materials.length} itens`}
          icon={<ShoppingCart size={20} />}
          accent="warning"
        />
        <KpiCard
          label="Total Geral"
          value={fmt(totalGeral)}
          sub={economiaTotal > 0 ? `Economia: ${fmt(economiaTotal)}` : undefined}
          icon={<DollarSign size={20} />}
          accent="info"
        />
      </KpiGrid>

      {/* Progress Bar — M3 style */}
      <div className="bg-surface-container-highest rounded-full h-2 overflow-hidden my-4">
        <div className="h-full bg-secondary rounded-full transition-all duration-500 ease-in-out" style={{ width: `${percentPago}%` }} />
      </div>

      {/* === AUDIT LOG PANEL === */}
      {showAuditLog && (
        <div className="mb-4 rounded-2xl bg-surface-container border border-outline-variant p-4 max-h-[300px] overflow-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-on-surface m-0 flex items-center gap-1.5">
              <History size={14} /> Historico de Alteracoes
            </h3>
            <button onClick={() => setShowAuditLog(false)} className="bg-transparent border-none cursor-pointer text-on-surface-variant"><X size={16} /></button>
          </div>
          {auditLog.length === 0 ? (
            <p className="text-xs text-outline text-center">Nenhuma alteracao registrada ainda</p>
          ) : (
            auditLog.slice(0, 20).map(log => (
              <div key={log.id} className="py-2 border-b border-outline-variant text-xs">
                <div className="flex justify-between items-center">
                  <span className={`font-semibold ${log.action === 'delete' ? 'text-danger' : log.action === 'edit' ? 'text-warning' : 'text-success'}`}>
                    {log.action === 'delete' ? '🗑️ Deletou' : log.action === 'edit' ? '✏️ Editou' : log.action === 'create' ? '➕ Criou' : '🔄 Alterou'}
                  </span>
                  <span className="text-outline">{fmtDateTime(log.performed_at)}</span>
                </div>
                <p className="mt-0.5 mb-0 text-on-surface-variant">{log.entity_description}</p>
                <p className="mt-0.5 mb-0 text-outline italic">por {log.performed_by}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* === NEXT PAYMENT ALERT === */}
      {nextPayment && (
        <div className={`flex items-center gap-3 py-3.5 px-4 rounded-2xl mb-4 ${daysUntilNext !== null && daysUntilNext <= 3 ? 'bg-danger-light border border-[#FECACA]' : 'bg-[#FFFBEB] border border-[#FDE68A]'}`}>
          {daysUntilNext !== null && daysUntilNext <= 3 ? <AlertTriangle size={20} className="text-danger" /> : <Calendar size={20} className="text-warning" />}
          <div className="flex-1">
            <p className="text-sm font-semibold text-on-surface m-0">
              Proximo: {fmt(nextPayment.amount)} — {nextPayment.professional}
            </p>
            <p className="text-xs text-on-surface-variant mt-0.5 mb-0">
              {fmtDate(nextPayment.due_date)} · {daysUntilNext !== null && daysUntilNext > 0
                ? `Faltam ${daysUntilNext} dias` : daysUntilNext === 0 ? 'Vence HOJE!' : `Vencida ha ${Math.abs(daysUntilNext!)} dias`}
            </p>
          </div>
        </div>
      )}

      {/* === CONTRATOS & PAGAMENTOS === */}
      <div className="mb-5">
        <h3 className="text-[15px] font-bold text-on-surface mb-1 flex items-center gap-2">
          <Users size={16} /> Contratos & Pagamentos
        </h3>
        <p className="text-[11px] text-outline mt-0 mb-3 pl-6">
          Toque em um profissional para ver e gerenciar parcelas
        </p>
        <div className="flex flex-col gap-2.5">
          {profBreakdown.map((prof, idx) => {
            const isExpanded = expandedProf === prof.professional
            const profPaymentsSorted = prof.payments.sort((a, b) => a.installment_number - b.installment_number)
            const color = PROF_COLORS[idx % PROF_COLORS.length]

            return (
              <div key={prof.professional} className="rounded-2xl bg-surface-lowest overflow-hidden transition-colors duration-200" style={{
                border: `1px solid ${isExpanded ? color + '40' : 'var(--outline-variant, #E5E7EB)'}`,
                boxShadow: isExpanded ? `0 2px 8px ${color}15` : 'none',
              }}>
                {/* Header */}
                <div
                  onClick={() => setExpandedProf(isExpanded ? null : prof.professional)}
                  className="py-3.5 px-4 cursor-pointer select-none transition-colors duration-200"
                  style={{ background: isExpanded ? `${color}08` : 'white' }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold" style={{ background: `${color}15`, color }}>
                        {prof.professional.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface m-0">{prof.professional}</p>
                        <p className="text-[11px] text-on-surface-variant m-0">{prof.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="text-right">
                        <p className="text-[15px] font-extrabold text-on-surface m-0">{fmt(prof.negociado)}</p>
                        <p className="text-[11px] text-success font-semibold m-0">{prof.percent}% pago</p>
                      </div>
                      {/* Clear expand/collapse indicator */}
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-200" style={{
                        background: isExpanded ? color : 'var(--surface-container, #F3F4F6)',
                        color: isExpanded ? 'white' : 'var(--outline, #9CA3AF)',
                      }}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>
                  <div className="bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500 ease-in-out" style={{ width: `${prof.percent}%`, background: color }} />
                  </div>
                  <div className="flex justify-between mt-1.5 flex-wrap gap-1">
                    {prof.isCartaoParcelado ? (
                      <>
                        <span className="text-[11px] text-success font-semibold">
                          <CheckCircle2 size={11} className="inline align-middle mr-[3px]" />
                          💳 Pago no cartao
                        </span>
                        <span className="text-[11px] text-on-surface-variant">
                          <Clock size={11} className="inline align-middle mr-[3px]" />
                          Fatura restante: {fmt(prof.pendente)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[11px] text-on-surface-variant">
                          <CheckCircle2 size={11} className="inline align-middle mr-[3px]" />
                          Pago: {fmt(prof.pago)}
                        </span>
                        <span className="text-[11px] text-on-surface-variant">
                          <Clock size={11} className="inline align-middle mr-[3px]" />
                          Pendente: {fmt(prof.pendente)}
                        </span>
                      </>
                    )}
                    <span className="text-[11px] font-semibold" style={{ color }}>
                      {profPaymentsSorted.length} parcela{profPaymentsSorted.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Expanded payments */}
                {isExpanded && (
                  <div className="py-3 px-4 bg-surface-container" style={{ borderTop: `2px solid ${color}20` }}>
                    {/* Discrepancy Alert */}
                    {Math.abs(prof.discrepancy) > 0.01 && prof.negociado > 0 && (
                      <div className={`flex items-center gap-2.5 py-2.5 px-3.5 rounded-2xl mb-2.5 ${prof.discrepancy > 0 ? 'bg-danger-light border border-[#FECACA]' : 'bg-[#FFF7ED] border border-[#FED7AA]'}`}>
                        <AlertTriangle size={16} className={`shrink-0 ${prof.discrepancy > 0 ? 'text-danger' : 'text-warning'}`} />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-on-surface m-0">
                            {prof.discrepancy > 0
                              ? `Parcelas somam ${fmt(prof.discrepancy)} A MAIS que o contrato`
                              : `Faltam ${fmt(Math.abs(prof.discrepancy))} nas parcelas vs contrato`}
                          </p>
                          <p className="text-[11px] text-on-surface-variant mt-0.5 mb-0">
                            Contrato: {fmt(prof.negociado)} · Pago: {fmt(prof.pago)} · Pendente: {fmt(prof.pendente)} · Falta pagar: {fmt(prof.negociado - prof.pago)}
                          </p>
                        </div>
                        {prof.pendingCount > 0 && (
                          <button
                            onClick={() => handleRecalculate(prof.professional, prof.negociado)}
                            className="py-1.5 px-3 rounded-xl text-[11px] font-bold bg-secondary text-white border-none cursor-pointer whitespace-nowrap shrink-0"
                          >
                            ⚡ Recalcular
                          </button>
                        )}
                      </div>
                    )}

                    {profPaymentsSorted.length === 0 && (
                      <div className="text-center p-4 bg-[#FFF7ED] rounded-2xl border border-[#FED7AA] mb-2">
                        <p className="text-[13px] text-[#92400E] m-0 font-semibold">Nenhuma parcela cadastrada</p>
                        <p className="text-xs text-[#B45309] mt-1 mb-0">Adicione parcelas para controlar os pagamentos</p>
                      </div>
                    )}

                    {profPaymentsSorted.map(p => {
                      const isEditing = editingPayment === p.id
                      const isPago = p.status === 'pago'
                      const days = Math.ceil((new Date(p.due_date + 'T12:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                      const isConfirmingDelete = confirmDelete === p.id

                      return (
                        <div key={p.id} className={`flex items-center gap-2 py-2.5 px-3 rounded-2xl mb-1.5 ${isPago ? 'bg-[#F0FDF4] border border-[#BBF7D0]' : days <= 3 && !isPago ? 'bg-danger-light border border-[#FECACA]' : 'bg-surface-lowest border border-outline-variant'}`}>
                          <div className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${isPago ? 'bg-success text-white' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                            {isPago ? '✓' : p.installment_number}
                          </div>

                          {isEditing ? (
                            <div className="flex-1 flex flex-col gap-2.5">
                              <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Valor pago (R$)</label>
                              <input
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                value={editAmount}
                                onChange={e => setEditAmount(e.target.value)}
                                placeholder="0,00"
                                autoFocus
                                className="w-full py-3.5 px-4 rounded-2xl border-2 border-secondary/30 text-[22px] font-bold text-primary bg-surface-lowest box-border"
                              />
                              <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Data</label>
                              <input
                                type="date"
                                value={editDate}
                                onChange={e => setEditDate(e.target.value)}
                                className="w-full py-3 px-3.5 rounded-2xl border border-outline-variant text-[15px] box-border"
                              />
                              <input
                                type="text"
                                value={editNotes}
                                onChange={e => setEditNotes(e.target.value)}
                                placeholder="Observacao (opcional)"
                                className="w-full py-3 px-3.5 rounded-2xl border border-outline-variant text-sm box-border"
                              />
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => handleSaveEdit(p)}
                                  className="flex items-center gap-1.5 py-2.5 px-[18px] rounded-2xl bg-success text-white border-none text-sm cursor-pointer font-bold">
                                  <Save size={14} /> Salvar
                                </button>
                                <button onClick={() => setEditingPayment(null)}
                                  className="flex items-center gap-1.5 py-2.5 px-[18px] rounded-2xl bg-surface-container text-on-surface border border-outline-variant text-sm cursor-pointer font-semibold">
                                  <X size={14} /> Cancelar
                                </button>
                              </div>
                            </div>
                          ) : isConfirmingDelete ? (
                            <div className="flex-1 flex items-center justify-between">
                              <span className="text-[13px] text-danger font-semibold">Confirmar exclusao?</span>
                              <div className="flex gap-1.5">
                                <button onClick={() => handleDeletePayment(p)}
                                  className="py-1 px-2.5 rounded-xl bg-danger text-white border-none text-xs cursor-pointer font-semibold">
                                  Sim, deletar
                                </button>
                                <button onClick={() => setConfirmDelete(null)}
                                  className="py-1 px-2.5 rounded-xl bg-surface-container text-on-surface-variant border-none text-xs cursor-pointer">
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-on-surface m-0">
                                  {fmt(p.amount)}
                                  <span className="font-normal text-on-surface-variant ml-1.5 text-xs">
                                    {fmtDate(p.due_date)}
                                    {!isPago && days <= 3 && days >= 0 && ' ⚠️'}
                                    {!isPago && days < 0 && ' 🔴'}
                                  </span>
                                </p>
                                {p.notes && <p className="text-[11px] text-outline mt-0.5 mb-0 whitespace-nowrap overflow-hidden text-ellipsis">{p.notes}</p>}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                {isPago ? (
                                  <button onClick={() => handleUnmarkPaid(p)} title="Desfazer pagamento"
                                    className="py-1 px-2 rounded-xl bg-warning-light text-[#92400E] border-none text-[11px] font-semibold cursor-pointer">
                                    Desfazer
                                  </button>
                                ) : (
                                  <button onClick={() => handleMarkPaid(p)} title="Marcar como pago"
                                    className="py-1 px-2 rounded-xl bg-success-light text-[#065F46] border-none text-[11px] font-semibold cursor-pointer">
                                    ✓ Pagar
                                  </button>
                                )}
                                <button onClick={() => { setEditingPayment(p.id); setEditAmount(String(p.amount)); setEditDate(p.due_date); setEditNotes(p.notes || '') }}
                                  title="Editar parcela"
                                  className="py-1 px-1.5 rounded-xl bg-[#DBEAFE] text-[#1D4ED8] border-none cursor-pointer">
                                  <Pencil size={12} />
                                </button>
                                <button onClick={() => setConfirmDelete(p.id)} title="Excluir parcela"
                                  className="py-1 px-1.5 rounded-xl bg-danger-light text-danger border-none cursor-pointer">
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
                      <div className="p-3 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] mt-1.5">
                        <p className="text-xs font-semibold text-secondary mt-0 mb-2">Nova Parcela</p>
                        <div className="flex flex-col gap-1.5 mb-1.5">
                          <input type="number" placeholder="Valor (R$)" value={newPayment.amount}
                            onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })}
                            className="w-full py-2.5 px-3 rounded-xl border border-outline-variant text-sm box-border" />
                          <input type="date" value={newPayment.due_date}
                            onChange={e => setNewPayment({ ...newPayment, due_date: e.target.value })}
                            className="w-full py-2.5 px-3 rounded-xl border border-outline-variant text-sm box-border" />
                        </div>
                        <select value={newPayment.payment_type}
                          onChange={e => setNewPayment({ ...newPayment, payment_type: e.target.value })}
                          className="w-full py-2.5 px-3 rounded-xl border border-outline-variant text-sm box-border mb-1.5 bg-surface-lowest">
                          <option value="pix">⚡ PIX</option>
                          <option value="cartao_parcelado">💳 Cartao Parcelado</option>
                          <option value="boleto">📄 Boleto</option>
                          <option value="dinheiro">💵 Dinheiro</option>
                          <option value="transferencia">🏦 Transferencia</option>
                        </select>
                        <input type="text" placeholder="Observacao (opcional)" value={newPayment.notes}
                          onChange={e => setNewPayment({ ...newPayment, notes: e.target.value })}
                          className="w-full py-2 px-2.5 rounded-xl border border-outline-variant text-[13px] mb-2 box-border" />
                        <div className="flex gap-1.5 justify-end">
                          <button onClick={() => handleAddPayment(prof.professional, prof.contractId, prof.quoteId)}
                            disabled={!newPayment.amount || !newPayment.due_date}
                            className={`flex items-center gap-1 py-1.5 px-3.5 rounded-xl text-white border-none text-xs font-semibold ${newPayment.amount && newPayment.due_date ? 'bg-secondary cursor-pointer' : 'bg-outline cursor-default'}`}>
                            <Plus size={12} /> Adicionar
                          </button>
                          <button onClick={() => { setShowAddPayment(null); setNewPayment({ amount: '', due_date: '', notes: '', payment_type: 'pix' }) }}
                            className="py-1.5 px-3.5 rounded-xl bg-surface-container text-on-surface-variant border-none text-xs cursor-pointer">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowAddPayment(prof.professional)}
                        className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-2xl text-xs font-semibold cursor-pointer mt-1"
                        style={{
                          border: `1px dashed ${color}60`,
                          background: `${color}05`,
                          color,
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
            <div className="text-center py-[30px] px-5 text-outline text-[13px] bg-surface-container rounded-2xl border border-dashed border-outline-variant">
              <p className="text-2xl mt-0 mb-2">📋</p>
              Nenhum contrato fechado ainda.<br />
              Feche orcamentos na aba Profissionais para ve-los aqui.
            </div>
          )}
        </div>
      </div>

      {/* === UPCOMING PAYMENTS TIMELINE === */}
      {upcomingPayments.length > 0 && (
        <div className="mb-5">
          <h3 className="text-[15px] font-bold text-on-surface mb-3 flex items-center gap-2">
            <CreditCard size={16} /> Proximos Pagamentos
          </h3>
          <div className="flex flex-col gap-1.5">
            {upcomingPayments.slice(0, 6).map((p, idx) => {
              const days = Math.ceil((new Date(p.due_date + 'T12:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
              const isUrgent = days <= 3
              return (
                <div key={p.id} className={`flex items-center gap-3 py-2.5 px-3.5 rounded-2xl ${isUrgent ? 'bg-danger-light border border-[#FECACA]' : idx === 0 ? 'bg-[#FFFBEB] border border-[#FDE68A]' : 'bg-surface-container border border-outline-variant'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isUrgent ? 'bg-[#EF4444] text-white' : idx === 0 ? 'bg-[#F59E0B] text-white' : 'bg-surface-container-highest text-outline'}`}>
                    {p.installment_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-on-surface m-0">
                      {fmt(p.amount)} — {p.professional}
                    </p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5 mb-0">
                      {fmtDate(p.due_date)} · {days > 0 ? `${days}d` : days === 0 ? 'HOJE' : `${Math.abs(days)}d atras`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* === FLUXO DE CAIXA MENSAL — BarChart === */}
      {cashFlowMonths.length > 0 && (
        <div className="mb-5">
          <h3 className="text-[15px] font-bold text-on-surface mb-1 flex items-center gap-2">
            <TrendingDown size={16} /> Fluxo de Caixa — Proximos Meses
          </h3>
          <p className="text-[11px] text-outline mt-0 mb-3 pl-6">
            Quanto sai do bolso por mes (inclui faturas de cartao)
          </p>

          {/* BarChart Card */}
          <div className="bg-surface-lowest border border-outline-variant rounded-2xl shadow-sm p-6 mb-3">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip
                  formatter={(value) => [fmt(Number(value)), 'Total']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 13 }}
                />
                <Bar dataKey="value" fill="#022448" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detail cards per month */}
          <div className="flex flex-col gap-2">
            {cashFlowMonths.slice(0, 6).map(([month, data]) => {
              const [y, m] = month.split('-')
              const monthName = new Date(Number(y), Number(m) - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
              const maxFlow = Math.max(...cashFlowMonths.map(([, d]) => d.total))
              return (
                <div key={month} className="py-3 px-3.5 rounded-2xl bg-surface-lowest border border-outline-variant">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-semibold text-[13px] text-on-surface capitalize">{monthName}</span>
                    <span className="font-bold text-[15px] text-danger">- {fmt(data.total)}</span>
                  </div>
                  <div className="bg-surface-container-highest rounded-full h-[5px] overflow-hidden mb-1.5">
                    <div className="h-full bg-danger rounded-full" style={{ width: `${(data.total / maxFlow) * 100}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {data.items.map((item, idx) => (
                      <span key={idx} className={`text-[10px] py-0.5 px-2 rounded-full font-semibold ${item.type === 'cartao_parcelado' ? 'bg-[#EDE9FE] text-[#6D28D9]' : 'bg-[#DBEAFE] text-[#1D4ED8]'}`}>
                        {item.type === 'cartao_parcelado' ? '💳' : '⚡'} {item.professional.split(' ')[0]} {fmt(item.amount)}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-2 py-2.5 px-3.5 rounded-2xl bg-danger-light border border-[#FECACA] flex justify-between items-center">
            <span className="text-xs font-semibold text-[#991B1B]">Total a sair do bolso</span>
            <span className="text-[15px] font-extrabold text-danger">{fmt(totalAindaSaiDoBolso)}</span>
          </div>
        </div>
      )}

      {/* === DIVISAO DE CUSTOS POR CATEGORIA — PieChart === */}
      {categoryTotals.length > 0 && (
        <div className="mb-5">
          <h3 className="text-[15px] font-bold text-on-surface mb-1 flex items-center gap-2">
            <PieChartIcon size={16} /> Divisao de Custos por Categoria
          </h3>
          <p className="text-[11px] text-outline mt-0 mb-3 pl-6">
            Valores finais negociados (descontos diluidos)
          </p>

          {/* PieChart Card */}
          <div className="bg-surface-lowest border border-outline-variant rounded-2xl shadow-sm p-6 mb-3">
            <div className="flex items-center gap-6">
              <div className="relative w-[180px] h-[180px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [fmt(Number(value)), '']}
                      contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 13 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-outline uppercase tracking-wider">Total</span>
                  <span className="text-sm font-bold text-primary">{fmt(categoryGrandTotal)}</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                {categoryTotals.map((cat, idx) => (
                  <div key={cat.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    <span className="text-xs text-on-surface-variant truncate flex-1">{cat.name}</span>
                    <span className="text-xs font-semibold text-on-surface whitespace-nowrap">{fmt(cat.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === MATERIAIS SECTION === */}
      <div className="mt-5 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-[15px] font-bold text-[#166534] m-0 flex items-center gap-1.5">
            <ShoppingCart size={16} /> Materiais de Obra
            <span className="text-xs font-medium text-[#4ADE80] ml-1.5">
              {materials.length} ite{materials.length !== 1 ? 'ns' : 'm'}
            </span>
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPaymentMethods(true)}
              className="flex items-center gap-1.5 py-2 px-3.5 rounded-2xl bg-surface-lowest text-[#4338CA] border border-[#C7D2FE] cursor-pointer text-[13px] font-semibold"
              title="Gerenciar formas de pagamento (cartoes, PIX, boletos)"
            >
              <CreditCard size={14} /> Cartoes
            </button>
            <button
              onClick={() => setShowNfeImport(true)}
              className="flex items-center gap-1.5 py-2 px-3.5 rounded-2xl bg-success text-white border-none cursor-pointer text-[13px] font-semibold"
            >
              <FileText size={14} /> Importar NF-e
            </button>
          </div>
        </div>
        {materials.length === 0 && (
          <div className="p-4 text-center text-on-surface-variant text-[13px] bg-surface-lowest rounded-2xl border border-dashed border-[#BBF7D0]">
            Nenhum material ainda. Clique em &quot;Importar NF-e&quot; para comecar.
          </div>
        )}
        {materials.length > 0 && (
          <>
            {/* By Category */}
            <div className="flex flex-col gap-1.5 mb-3">
              {Object.entries(materiaisPorCategoria)
                .sort(([, a], [, b]) => b.total - a.total)
                .map(([cat, data]) => {
                  const catInfo = MATERIAL_CATEGORIES[cat] || { label: cat, emoji: '📦' }
                  const maxMatCat = Math.max(...Object.values(materiaisPorCategoria).map(d => d.total))
                  return (
                    <div key={cat} className="py-2.5 px-3 rounded-2xl bg-surface-lowest border border-[#D1FAE5]">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-[13px] text-on-surface">{catInfo.emoji} {catInfo.label}</span>
                        <span className="font-bold text-[13px] text-[#166534]">{fmt(data.total)}</span>
                      </div>
                      <div className="bg-surface-container-highest rounded-full h-1 overflow-hidden">
                        <div className="h-full bg-success rounded-full" style={{ width: `${(data.total / maxMatCat) * 100}%` }} />
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-[3px] mb-0">{data.count} ite{data.count !== 1 ? 'ns' : 'm'}</p>
                    </div>
                  )
                })}
            </div>

            {/* By Buyer */}
            {Object.keys(materiaisPorComprador).length > 1 && (
              <div className="flex gap-2 mb-3">
                {Object.entries(materiaisPorComprador).map(([buyer, total]) => (
                  <div key={buyer} className="flex-1 py-2 px-3 rounded-2xl bg-surface-lowest border border-[#D1FAE5] text-center">
                    <div className="text-[11px] text-on-surface-variant">👤 {buyer}</div>
                    <div className="text-sm font-bold text-[#166534]">{fmt(total)}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="py-2.5 px-3.5 rounded-2xl bg-success text-white flex justify-between items-center">
              <span className="text-[13px] font-semibold">Total Materiais</span>
              <span className="text-base font-extrabold">{fmt(materiaisTotal)}</span>
            </div>
          </>
        )}
      </div>

      {/* === RESUMO GERAL === */}
      <div className="mt-5 rounded-2xl bg-gradient-to-br from-[#1E293B] to-[#334155] p-4 text-white">
        <h3 className="text-[15px] font-bold mt-0 mb-3">📊 Resumo Geral da Reforma</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/10 rounded-2xl p-2.5 text-center">
            <div className="text-[11px] opacity-70">Servicos</div>
            <div className="text-[15px] font-extrabold">{fmt(totalNegociado)}</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-2.5 text-center">
            <div className="text-[11px] opacity-70">Materiais</div>
            <div className="text-[15px] font-extrabold">{fmt(materiaisTotal)}</div>
          </div>
          <div className="col-span-full bg-white/15 rounded-2xl p-3 text-center">
            <div className="text-[11px] opacity-70">Total Investido na Reforma</div>
            <div className="text-xl font-extrabold">{fmt(totalGeral)}</div>
            <div className="text-[11px] opacity-70 mt-1">
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
