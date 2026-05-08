'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Room } from '@/lib/supabase'
import type { UserID } from '@/lib/constants'
import { USERS, formatCurrency } from '@/lib/constants'
import {
  Plus, User, Users, Upload, Phone, Mail,
  ChevronDown, ChevronUp, Edit3, Check, X, FileText,
  Search, TrendingDown, Sparkles, ScanLine, Filter,
  Briefcase, FolderOpen
} from 'lucide-react'
import { apiUrl, withProjectId } from '@/lib/project-client'
import { KpiCard, KpiGrid, PanelSkeleton } from '@/components/ui'
import { motion, AnimatePresence } from 'motion/react'

import type {
  Professional, Quote, Contract, BudgetItem, Payment,
  OrcamentoDoc, OrcamentoFlow, OrcamentoParsedItem, ServiceCategory
} from './professionals/types'
import { fmtBRL, fmtFileSize } from './professionals/types'

import QuoteCard from './professionals/QuoteCard'
import { ContractFromTable, ContractFromQuote } from './professionals/ContractCard'
import AddProfessionalForm from './professionals/AddProfessionalForm'
import AddQuoteForm from './professionals/AddQuoteForm'
import { OcrProSelectModal, OcrModal } from './professionals/OcrModal'
import PaymentModal from './professionals/PaymentModal'
import DocumentSection from './professionals/DocumentSection'
// ─── Collapsible Section ─────────────────────────────────────
function CollapsibleSection({
  title,
  icon: Icon,
  count,
  badge,
  defaultOpen = false,
  children,
  actions,
}: {
  title: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  count?: number
  badge?: { text: string; variant: 'success' | 'warning' | 'info' | 'default' }
  defaultOpen?: boolean
  children: React.ReactNode
  actions?: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const badgeColors = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    default: 'bg-gray-50 text-gray-600 border-gray-200',
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-outline-variant/40 hover:border-outline-variant cursor-pointer transition-all group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <Icon size={16} className="text-primary" />
          </div>
          <span className="text-sm font-bold text-on-surface">{title}</span>
          {count !== undefined && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-semibold">
              {count}
            </span>
          )}
          {badge && (
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${badgeColors[badge.variant]}`}>
              {badge.text}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actions && open && <div onClick={e => e.stopPropagation()}>{actions}</div>}
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={18} className="text-outline" />
          </motion.div>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Search Bar ──────────────────────────────────────────────
function SearchBar({
  value,
  onChange,
  placeholder = 'Buscar...',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="relative mb-3">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 text-sm border border-outline-variant/50 rounded-xl bg-surface-container-low focus:border-secondary outline-none transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 bg-transparent border-none cursor-pointer"
        >
          <X size={14} className="text-outline" />
        </button>
      )}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────
interface Props {
  currentUser: UserID
  rooms: Room[]
  projectId?: string | null
}

export default function ProfessionalsPanel({ currentUser, rooms, projectId }: Props) {
  // Data state
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [orcamentoDocs, setOrcamentoDocs] = useState<OrcamentoDoc[]>([])
  const [loading, setLoading] = useState(true)

  // UI state
  const [showAddQuote, setShowAddQuote] = useState(false)
  const [showAddProfessional, setShowAddProfessional] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [expandedQuote, setExpandedQuote] = useState<string | null>(null)
  const [expandedContract, setExpandedContract] = useState<string | null>(null)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedProfessional, setExpandedProfessional] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState<{ [key: string]: string }>({})

  // Search states
  const [searchQuotes, setSearchQuotes] = useState('')
  const [searchContracts, setSearchContracts] = useState('')
  const [searchPros, setSearchPros] = useState('')

  // Payment modal
  const [paymentModal, setPaymentModal] = useState<{ quoteId: string; targetStatus: string; currentAmount: number } | null>(null)
  const [paymentForm, setPaymentForm] = useState({ payment_method: '', payment_details: '', negotiated_amount: '' })

  // Editing states
  const [editingContract, setEditingContract] = useState<string | null>(null)
  const [editContractForm, setEditContractForm] = useState<Partial<Contract>>({})
  const [editingQuote, setEditingQuote] = useState<string | null>(null)
  const [editQuoteForm, setEditQuoteForm] = useState<Partial<Quote>>({})
  const [editingProfessional, setEditingProfessional] = useState<string | null>(null)
  const [editProfessionalForm, setEditProfessionalForm] = useState<Partial<Professional>>({})

  // Document upload
  const [showAddDoc, setShowAddDoc] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [newDoc, setNewDoc] = useState<{ title: string; description: string; file: File | null }>({ title: '', description: '', file: null })

  // OCR flow
  const [orcamentoFlow, setOrcamentoFlow] = useState<OrcamentoFlow | null>(null)
  const [showOcrProSelect, setShowOcrProSelect] = useState(false)

  // Form states
  const [newProfessional, setNewProfessional] = useState({ name: '', phone: '', email: '', specialty: '', notes: '', recommended_by: '' })
  const [newQuote, setNewQuote] = useState({
    professional_id: '', service_category_id: '', room_id: '',
    description: '', amount: '', notes: '', scheduled_date: ''
  })

  // === DATA FETCHING ===
  const fetchData = useCallback(async () => {
    try {
      const [quotesRes, prosRes, catsRes, conRes, budRes, payRes, docsRes] = await Promise.all([
        fetch(apiUrl('/api/quotes', projectId)), fetch(apiUrl('/api/professionals', projectId)),
        fetch(apiUrl('/api/service-categories', projectId)), fetch(apiUrl('/api/contracts', projectId)),
        fetch(apiUrl('/api/budget-items', projectId)), fetch(apiUrl('/api/payments', projectId)),
        fetch(apiUrl('/api/documents', projectId)),
      ])
      const [quotesData, prosData, catsData, conData, budData, payData, docsData] = await Promise.all([
        quotesRes.json(), prosRes.json(), catsRes.json(), conRes.json(), budRes.json(), payRes.json(), docsRes.json(),
      ])
      setQuotes(Array.isArray(quotesData) ? quotesData : [])
      setProfessionals(Array.isArray(prosData) ? prosData : [])
      setServiceCategories(Array.isArray(catsData) ? catsData : [])
      setContracts(Array.isArray(conData) ? conData : [])
      setBudgetItems(Array.isArray(budData) ? budData : [])
      setPayments(Array.isArray(payData) ? payData : [])
      setOrcamentoDocs(Array.isArray(docsData) ? docsData.filter((d: OrcamentoDoc) => d.doc_type === 'orcamento' || d.doc_type === 'memorial') : [])
    } catch (err) { console.error('Error:', err) }
    finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { fetchData() }, [fetchData])

  // === COMPUTED VALUES ===
  const activeQuotes = quotes.filter(q => !['recusado'].includes(q.status))
  const contractsTotal = contracts.reduce((s, c) => s + (c.negotiated_total || 0), 0)
  const contractsOriginalTotal = contracts.reduce((s, c) => s + (c.original_total || 0), 0)
  const quotesContratado = activeQuotes.filter(q => ['contratado', 'pago'].includes(q.status))
    .reduce((s, q) => s + Number(q.negotiated_amount || q.amount), 0)
  const totalContratado = quotesContratado + contractsTotal
  const contractsPaid = contracts.reduce((s, c) => {
    const cPays = payments.filter(p => p.professional === c.professional && p.status === 'pago')
    return s + cPays.reduce((ps, p) => ps + p.amount, 0)
  }, 0)
  const totalPago = activeQuotes.filter(q => q.status === 'pago').reduce((s, q) => s + Number(q.negotiated_amount || q.amount), 0) + contractsPaid
  const quotesOrcado = activeQuotes.reduce((s, q) => s + Number(q.amount), 0)
  const totalOrcado = quotesOrcado + contractsOriginalTotal
  const totalEconomia = totalOrcado - totalContratado

  // Filtered & searched quotes (not contracted)
  const pendingQuotes = useMemo(() => {
    return quotes.filter(q => {
      if (['contratado', 'pago'].includes(q.status)) return false
      if (filterStatus && q.status !== filterStatus) return false
      if (filterCategory && q.service_category_id !== filterCategory) return false
      if (searchQuotes) {
        const s = searchQuotes.toLowerCase()
        const match = q.description?.toLowerCase().includes(s) ||
          q.professional?.name?.toLowerCase().includes(s) ||
          q.service_category?.name?.toLowerCase().includes(s)
        if (!match) return false
      }
      return true
    })
  }, [quotes, filterStatus, filterCategory, searchQuotes])

  const contratadoQuotes = quotes.filter(q => ['contratado', 'pago'].includes(q.status))

  // Searched contracts
  const filteredContracts = useMemo(() => {
    if (!searchContracts) return contracts
    const s = searchContracts.toLowerCase()
    return contracts.filter(c => c.professional?.toLowerCase().includes(s) || c.role?.toLowerCase().includes(s))
  }, [contracts, searchContracts])

  const filteredContratadoQuotes = useMemo(() => {
    if (!searchContracts) return contratadoQuotes
    const s = searchContracts.toLowerCase()
    return contratadoQuotes.filter(q =>
      q.description?.toLowerCase().includes(s) || q.professional?.name?.toLowerCase().includes(s)
    )
  }, [contratadoQuotes, searchContracts])

  // Searched professionals
  const filteredPros = useMemo(() => {
    if (!searchPros) return professionals
    const s = searchPros.toLowerCase()
    return professionals.filter(p =>
      p.name?.toLowerCase().includes(s) || p.specialty?.toLowerCase().includes(s) ||
      p.phone?.includes(s) || p.email?.toLowerCase().includes(s)
    )
  }, [professionals, searchPros])

  const STATUS_CONFIG_FILTER: Record<string, { label: string; emoji: string }> = {
    recebido: { label: 'Recebido', emoji: '📩' },
    avaliando: { label: 'Avaliando', emoji: '🔍' },
    aprovado: { label: 'Aprovado', emoji: '✅' },
    recusado: { label: 'Recusado', emoji: '❌' },
  }

  // === DOCUMENT HANDLERS ===
  const handleUploadDoc = async () => {
    if (!newDoc.title.trim() || !newDoc.file) { alert('Preencha o título e selecione um arquivo'); return }
    setUploadingDoc(true)
    try {
      const formData = new FormData()
      formData.append('file', newDoc.file)
      formData.append('title', newDoc.title.trim())
      formData.append('description', newDoc.description || '')
      formData.append('type', 'orcamento')
      formData.append('created_by', currentUser)
      formData.append('project_id', projectId || '')
      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData })
      if (!res.ok) { const err = await res.json(); alert('Erro no upload: ' + (err.error || 'Falha')); return }
      await fetchData()
      setShowAddDoc(false)
      setNewDoc({ title: '', description: '', file: null })
    } catch (err) { console.error(err); alert('Erro no upload') }
    finally { setUploadingDoc(false) }
  }

  const handleDeleteDoc = async (docId: string) => {
    const doc = orcamentoDocs.find(d => d.id === docId)
    if (currentUser === 'mari' && doc?.created_by !== 'mari') { alert('Sem permissão para deletar documentos de outros usuários'); return }
    if (!confirm('Tem certeza que deseja excluir este documento?')) return
    try { await fetch(`/api/documents/${docId}`, { method: 'DELETE' }); await fetchData() } catch (err) { console.error(err) }
  }

  // === OCR HANDLERS ===
  const openOrcamentoFlow = (proId: string) => {
    setOrcamentoFlow({ proId, step: 'select', file: null, documentId: null, parsed: null, description: '', editedItems: [], saving: false, error: null })
  }
  const closeOrcamentoFlow = () => setOrcamentoFlow(null)

  const handleParseOrcamento = async () => {
    if (!orcamentoFlow || !orcamentoFlow.file) return
    setOrcamentoFlow({ ...orcamentoFlow, step: 'parsing', error: null })
    try {
      const pro = professionals.find(p => p.id === orcamentoFlow.proId)
      const fd = new FormData()
      fd.append('file', orcamentoFlow.file)
      fd.append('title', `Orçamento ${pro?.name ?? ''} - ${orcamentoFlow.file.name}`)
      fd.append('description', `Orçamento OCR de ${pro?.name ?? ''}`)
      fd.append('type', 'orcamento')
      fd.append('created_by', currentUser)
      fd.append('professional_id', orcamentoFlow.proId)
      fd.append('allow_duplicate', 'true')
      fd.append('project_id', projectId || '')
      const upRes = await fetch('/api/documents/upload', { method: 'POST', body: fd })
      if (!upRes.ok) { const err = await upRes.json(); throw new Error(err.error || 'Falha no upload do PDF') }
      const upData = await upRes.json()
      const documentId = upData.id

      const parseForm = new FormData()
      parseForm.append('file', orcamentoFlow.file)
      parseForm.append('project_id', projectId || '')
      const parseRes = await fetch('/api/orcamento/parse', { method: 'POST', body: parseForm })
      if (!parseRes.ok) { const err = await parseRes.json(); throw new Error(err.error || 'Falha ao parsear orçamento') }
      const parsed = await parseRes.json()

      try {
        await fetch(`/api/documents/${documentId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(withProjectId({ parsed_data: parsed }, projectId)),
        })
      } catch { /* non-critical */ }

      const autoDescription = parsed.itens.length > 0
        ? `Orçamento - ${parsed.itens.length} ite${parsed.itens.length === 1 ? 'm' : 'ns'}`
        : `Orçamento ${pro?.name ?? ''}`

      setOrcamentoFlow((prev) => prev ? { ...prev, step: 'review', documentId, parsed, description: autoDescription, editedItems: parsed.itens.map((it: OrcamentoParsedItem) => ({ ...it, room_id: null })) } : null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      setOrcamentoFlow((prev) => prev ? { ...prev, step: 'select', error: msg } : null)
    }
  }

  const updateOrcItem = (index: number, patch: Partial<OrcamentoParsedItem>) => {
    setOrcamentoFlow((prev) => {
      if (!prev) return prev
      const next = [...prev.editedItems]
      const merged = { ...next[index], ...patch }
      if ('quantidade' in patch || 'valor_unitario' in patch) {
        merged.valor_total = (Number(merged.quantidade) || 0) * (Number(merged.valor_unitario) || 0)
      }
      next[index] = merged
      return { ...prev, editedItems: next }
    })
  }

  const removeOrcItem = (index: number) => {
    setOrcamentoFlow((prev) => prev ? { ...prev, editedItems: prev.editedItems.filter((_, i) => i !== index) } : prev)
  }

  const addOrcItem = () => {
    setOrcamentoFlow((prev) => {
      if (!prev) return prev
      const next: OrcamentoParsedItem = { numero: prev.editedItems.length + 1, descricao: '', quantidade: 1, unidade: null, valor_unitario: 0, valor_total: 0, categoria: null, ambiente_sugerido: null, observacoes: null, room_id: null }
      return { ...prev, editedItems: [...prev.editedItems, next] }
    })
  }

  const handleSaveOrcamento = async () => {
    if (!orcamentoFlow || !orcamentoFlow.parsed) return
    const totalCalc = orcamentoFlow.editedItems.reduce((s, it) => s + (Number(it.valor_total) || 0), 0)
    setOrcamentoFlow({ ...orcamentoFlow, saving: true, error: null })
    try {
      const res = await fetch('/api/orcamento/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withProjectId({ professional_id: orcamentoFlow.proId, description: orcamentoFlow.description || 'Orçamento', amount: totalCalc > 0 ? totalCalc : orcamentoFlow.parsed.total, status: 'avaliando', notes: orcamentoFlow.parsed.observacoes || null, itens: orcamentoFlow.editedItems, document_id: orcamentoFlow.documentId, created_by: currentUser }, projectId)),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Falha ao salvar orçamento') }
      closeOrcamentoFlow()
      await fetchData()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      setOrcamentoFlow((prev) => prev ? { ...prev, saving: false, error: msg } : null)
    }
  }

  // === PROFESSIONAL HANDLERS ===
  const handleAddProfessional = async () => {
    setFormError('')
    if (!newProfessional.name.trim()) { setFormError('Preencha o nome do profissional'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/professionals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(withProjectId({ ...newProfessional, created_by: currentUser }, projectId)) })
      if (!res.ok) { const err = await res.json(); setFormError(err.error || 'Erro ao salvar profissional'); return }
      setNewProfessional({ name: '', phone: '', email: '', specialty: '', notes: '', recommended_by: '' })
      setShowAddProfessional(false); setFormError(''); await fetchData()
    } catch (err) { setFormError('Erro de conexão. Tente novamente.') }
    finally { setSaving(false) }
  }

  // === QUOTE HANDLERS ===
  const handleAddQuote = async () => {
    setFormError('')
    if (!newQuote.professional_id) { setFormError('Selecione um profissional'); return }
    if (!newQuote.description.trim()) { setFormError('Preencha a descrição do serviço'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(withProjectId({ ...newQuote, amount: parseFloat(newQuote.amount) || 0, service_category_id: newQuote.service_category_id || null, room_id: newQuote.room_id || null, scheduled_date: newQuote.scheduled_date || null, notes: newQuote.notes || null, created_by: currentUser }, projectId)) })
      if (!res.ok) { const err = await res.json(); setFormError(err.error || 'Erro ao salvar orçamento'); return }
      setNewQuote({ professional_id: '', service_category_id: '', room_id: '', description: '', amount: '', notes: '', scheduled_date: '' })
      setShowAddQuote(false); setFormError(''); await fetchData()
    } catch (err) { setFormError('Erro de conexão. Tente novamente.') }
    finally { setSaving(false) }
  }

  const handleStatusChange = async (quoteId: string, newStatus: string) => {
    if (newStatus === 'contratado') {
      const quote = quotes.find(q => q.id === quoteId)
      setPaymentForm({ payment_method: quote?.payment_method || '', payment_details: quote?.payment_details || '', negotiated_amount: quote?.negotiated_amount?.toString() || quote?.amount?.toString() || '' })
      setPaymentModal({ quoteId, targetStatus: newStatus, currentAmount: Number(quote?.amount || 0) })
      return
    }
    await fetch(`/api/quotes/${quoteId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(withProjectId({ status: newStatus, updated_by: currentUser }, projectId)) })
    fetchData()
  }

  const handlePaymentConfirm = async () => {
    if (!paymentModal) return
    setSaving(true)
    try {
      await fetch(`/api/quotes/${paymentModal.quoteId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(withProjectId({ status: paymentModal.targetStatus, updated_by: currentUser, payment_method: paymentForm.payment_method || null, payment_details: paymentForm.payment_details || null, negotiated_amount: paymentForm.negotiated_amount ? parseFloat(paymentForm.negotiated_amount) : null }, projectId)) })
      setPaymentModal(null); setPaymentForm({ payment_method: '', payment_details: '', negotiated_amount: '' }); await fetchData()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const handleDeleteQuote = async (quoteId: string) => {
    const quote = quotes.find(q => q.id === quoteId)
    if (currentUser === 'mari') {
      const profName = quote?.professional?.name || ''
      if (!profName.toLowerCase().includes('mariana') && !profName.toLowerCase().includes('mari') && quote?.created_by !== 'mari') { alert('Sem permissão para deletar orçamentos de outros profissionais'); return }
    }
    if (!confirm('Excluir este orçamento?')) return
    await fetch(`/api/quotes/${quoteId}`, { method: 'DELETE' })
    try {
      await fetch('/api/audit-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(withProjectId({ action: 'delete', entity_type: 'quote', entity_id: quoteId, entity_description: `Orçamento "${quote?.description}" de ${quote?.professional?.name || '?'} (${fmtBRL(Number(quote?.amount || 0))}) deletado`, old_values: quote ? { description: quote.description, amount: quote.amount, status: quote.status, professional: quote.professional?.name } : null, performed_by: currentUser }, projectId)) })
    } catch (e) { console.error(e) }
    fetchData()
  }

  // === CONTRACT/PAYMENT HANDLERS ===
  const handleMarkPaid = async (payment: Payment) => {
    setMarkingPaid(payment.id)
    try {
      await fetch('/api/payments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(withProjectId({ id: payment.id, status: 'pago', paid_date: new Date().toISOString().split('T')[0] }, projectId)) })
      await fetchData()
    } catch (err) { console.error(err) }
    finally { setMarkingPaid(null) }
  }

  const handleSaveNotes = async (professionalId: string, newNotes: string) => {
    try {
      await fetch(`/api/professionals/${professionalId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(withProjectId({ notes: newNotes }, projectId)) })
      setEditingNotes({ ...editingNotes, [professionalId]: '' }); await fetchData()
    } catch (err) { console.error(err) }
  }

  const handleEditContract = (contract: Contract) => { setEditingContract(contract.id); setEditContractForm({ ...contract }) }
  const handleSaveContract = async () => {
    if (!editingContract) return
    try {
      await fetch('/api/contracts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(withProjectId({ id: editingContract, ...editContractForm }, projectId)) })
      setEditingContract(null); setEditContractForm({}); await fetchData()
    } catch (err) { console.error(err) }
  }

  const handleEditQuote = (quote: Quote) => {
    setEditingQuote(quote.id)
    setEditQuoteForm({ description: quote.description, amount: quote.amount, negotiated_amount: quote.negotiated_amount, notes: quote.notes, payment_method: quote.payment_method, payment_details: quote.payment_details, status: quote.status })
  }
  const handleSaveQuote = async () => {
    if (!editingQuote) return
    try {
      await fetch(`/api/quotes/${editingQuote}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(withProjectId({ ...editQuoteForm, amount: Number(editQuoteForm.amount) || 0, negotiated_amount: editQuoteForm.negotiated_amount ? Number(editQuoteForm.negotiated_amount) : null, updated_by: currentUser }, projectId)) })
      setEditingQuote(null); setEditQuoteForm({}); await fetchData()
    } catch (err) { console.error(err) }
  }

  const handleEditProfessional = (pro: Professional) => {
    setEditingProfessional(pro.id)
    setEditProfessionalForm({ name: pro.name, phone: pro.phone, email: pro.email, specialty: pro.specialty, recommended_by: pro.recommended_by })
  }
  const handleSaveProfessional = async () => {
    if (!editingProfessional) return
    try {
      await fetch(`/api/professionals/${editingProfessional}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(withProjectId(editProfessionalForm, projectId)) })
      setEditingProfessional(null); setEditProfessionalForm({}); await fetchData()
    } catch (err) { console.error(err) }
  }

  const getProfessionalStatus = (professionalId: string) => {
    const pro = professionals.find(p => p.id === professionalId)
    const profQuotes = quotes.filter(q => q.professional_id === professionalId)
    const hasContratado = profQuotes.some(q => ['contratado', 'pago'].includes(q.status))
    const hasContract = pro ? contracts.some(c => c.professional === pro.name) : false
    if (hasContratado || hasContract) return { status: 'Contratado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    if (profQuotes.length > 0) return { status: 'Orçando', color: 'bg-blue-50 text-blue-700 border-blue-200' }
    return { status: 'Cadastrado', color: 'bg-gray-50 text-gray-600 border-gray-200' }
  }

  // Next payment alert
  const nextPaymentGlobal = useMemo(() => {
    const allPending = payments.filter(p => p.status === 'pendente').sort((a, b) => a.due_date.localeCompare(b.due_date))
    return allPending[0] || null
  }, [payments])

  const daysUntilNextPayment = nextPaymentGlobal
    ? Math.ceil((new Date(nextPaymentGlobal.due_date + 'T12:00:00').getTime() - Date.now()) / 86400000)
    : null

  if (loading) return <PanelSkeleton />

  const totalContracts = contracts.length + contratadoQuotes.length

  return (
    <div>
      {/* ─── KPI Cards ─────────────────────────────────────────── */}
      <div className="mb-5">
      <KpiGrid cols={4}>
        <KpiCard
          icon={<FileText size={20} />}
          label="Orçado"
          value={formatCurrency(totalOrcado)}
          accent="info"
        />
        <KpiCard
          icon={<Briefcase size={20} />}
          label="Contratado"
          value={formatCurrency(totalContratado)}
          accent="success"
        />
        <KpiCard
          icon={<Check size={20} />}
          label="Pago"
          value={formatCurrency(totalPago)}
          accent="primary"
        />
        <KpiCard
          icon={<TrendingDown size={20} />}
          label="Economia"
          value={formatCurrency(totalEconomia > 0 ? totalEconomia : 0)}
          accent={totalEconomia > 0 ? 'success' : 'warning'}
          sub={totalEconomia > 0 ? `${Math.round((totalEconomia / (totalOrcado || 1)) * 100)}% economizado` : undefined}
        />
      </KpiGrid>
      </div>

      {/* ─── Next Payment Alert ────────────────────────────────── */}
      {nextPaymentGlobal && daysUntilNextPayment !== null && daysUntilNextPayment <= 7 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-4 border ${
            daysUntilNextPayment <= 2
              ? 'bg-red-50 border-red-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            daysUntilNextPayment <= 2 ? 'bg-red-100' : 'bg-amber-100'
          }`}>
            <span className="text-lg">{daysUntilNextPayment <= 0 ? '🚨' : '⏰'}</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-on-surface m-0">
              {daysUntilNextPayment <= 0 ? 'Pagamento vencido!' : daysUntilNextPayment === 0 ? 'Pagamento HOJE!' : `Pagamento em ${daysUntilNextPayment} dia${daysUntilNextPayment > 1 ? 's' : ''}`}
            </p>
            <p className="text-xs text-on-surface-variant mt-0.5 mb-0">
              {fmtBRL(nextPaymentGlobal.amount)} — {nextPaymentGlobal.professional}
            </p>
          </div>
        </motion.div>
      )}

      {/* ─── Quick Actions ─────────────────────────────────────── */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setShowOcrProSelect(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-none bg-gradient-to-r from-primary to-secondary text-white text-sm font-bold cursor-pointer shadow-[0_2px_8px_rgba(0,81,213,0.25)] hover:shadow-[0_4px_12px_rgba(0,81,213,0.35)] transition-all hover:-translate-y-0.5"
        >
          <ScanLine size={18} />
          Subir Orçamento (OCR)
        </button>
        <button
          onClick={() => setShowAddQuote(!showAddQuote)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-outline-variant/50 bg-white text-on-surface text-sm font-semibold cursor-pointer hover:border-secondary hover:text-secondary transition-all"
        >
          <Plus size={16} />
          Orçamento Manual
        </button>
        <button
          onClick={() => setShowAddProfessional(!showAddProfessional)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-outline-variant/50 bg-white text-on-surface text-sm font-semibold cursor-pointer hover:border-secondary hover:text-secondary transition-all"
        >
          <User size={16} />
          Novo Profissional
        </button>
      </div>

      {/* ─── 1. Orçamentos em Análise ──────────────────────────── */}
      <CollapsibleSection
        title="Orçamentos em Análise"
        icon={FileText}
        count={pendingQuotes.length}
        badge={pendingQuotes.length > 0 ? {
          text: `${fmtBRL(pendingQuotes.reduce((s, q) => s + Number(q.amount), 0))}`,
          variant: 'info'
        } : undefined}
        defaultOpen={true}
      >
        <SearchBar
          value={searchQuotes}
          onChange={setSearchQuotes}
          placeholder="Buscar orçamento, profissional..."
        />

        {/* Filters */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="min-w-[130px] text-sm py-2 px-3"
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS_CONFIG_FILTER).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
            ))}
          </select>
          {serviceCategories.length > 0 && (
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="min-w-[150px] text-sm py-2 px-3"
            >
              <option value="">Todos os serviços</option>
              {serviceCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          )}
        </div>

        {pendingQuotes.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-3">
              <FileText size={24} className="text-primary/40" />
            </div>
            <h3 className="text-sm font-bold text-on-surface mb-1">Nenhum orçamento em análise</h3>
            <p className="text-xs text-on-surface-variant m-0">
              Adicione orçamentos para comparar preços e controlar custos.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {pendingQuotes.map(quote => (
              <QuoteCard
                key={quote.id}
                quote={quote}
                currentUser={currentUser}
                expandedQuote={expandedQuote}
                onToggleExpand={setExpandedQuote}
                onStatusChange={handleStatusChange}
                onDeleteQuote={handleDeleteQuote}
              />
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* ─── 2. Contratos Ativos ───────────────────────────────── */}
      {totalContracts > 0 && (
        <CollapsibleSection
          title="Contratos Ativos"
          icon={Briefcase}
          count={totalContracts}
          badge={{ text: fmtBRL(totalContratado), variant: 'success' }}
          defaultOpen={false}
        >
          <SearchBar
            value={searchContracts}
            onChange={setSearchContracts}
            placeholder="Buscar contrato, profissional..."
          />
          <div className="flex flex-col gap-3">
            {filteredContracts.map(contract => (
              <ContractFromTable
                key={contract.id}
                contract={contract}
                budgetItems={budgetItems.filter(b => b.professional === contract.professional)}
                payments={payments.filter(p => p.professional === contract.professional)}
                isExpanded={expandedContract === contract.id}
                onToggleExpand={() => setExpandedContract(expandedContract === contract.id ? null : contract.id)}
                editingContract={editingContract}
                editContractForm={editContractForm}
                onEditContract={handleEditContract}
                onSaveContract={handleSaveContract}
                onCancelEditContract={() => { setEditingContract(null); setEditContractForm({}) }}
                onEditContractFormChange={setEditContractForm}
                markingPaid={markingPaid}
                onMarkPaid={handleMarkPaid}
              />
            ))}
            {filteredContratadoQuotes.map(quote => (
              <ContractFromQuote
                key={`quote-${quote.id}`}
                quote={quote}
                isExpanded={expandedContract === `quote-${quote.id}`}
                onToggleExpand={() => setExpandedContract(expandedContract === `quote-${quote.id}` ? null : `quote-${quote.id}`)}
                editingQuote={editingQuote}
                editQuoteForm={editQuoteForm}
                onEditQuote={handleEditQuote}
                onSaveQuote={handleSaveQuote}
                onCancelEditQuote={() => { setEditingQuote(null); setEditQuoteForm({}) }}
                onEditQuoteFormChange={setEditQuoteForm}
              />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* ─── 3. Profissionais Cadastrados ──────────────────────── */}
      <CollapsibleSection
        title="Profissionais"
        icon={Users}
        count={professionals.length}
        defaultOpen={false}
      >
        <SearchBar
          value={searchPros}
          onChange={setSearchPros}
          placeholder="Buscar profissional, especialidade..."
        />
        {filteredPros.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-3">
              <Users size={24} className="text-primary/40" />
            </div>
            <h3 className="text-sm font-bold text-on-surface mb-1">
              {professionals.length === 0 ? 'Nenhum profissional cadastrado' : 'Nenhum resultado encontrado'}
            </h3>
            <p className="text-xs text-on-surface-variant m-0">
              {professionals.length === 0 ? 'Comece adicionando profissionais para seus orçamentos.' : 'Tente outra busca.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
            {filteredPros.map(pro => {
              const isExpanded = expandedProfessional === pro.id
              const status = getProfessionalStatus(pro.id)
              const proQuotes = quotes.filter(q => q.professional_id === pro.id)

              return (
                <div key={pro.id} className="bg-white rounded-xl border border-outline-variant/40 overflow-hidden hover:border-outline-variant transition-all">
                  <button
                    onClick={() => setExpandedProfessional(isExpanded ? null : pro.id)}
                    className={`w-full p-3.5 cursor-pointer bg-transparent border-none flex justify-between items-start gap-3 text-left ${isExpanded ? 'border-b border-outline-variant/30' : ''}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="m-0 text-sm font-bold text-on-surface">{pro.name}</h4>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${status.color}`}>
                          {status.status}
                        </span>
                      </div>
                      {pro.specialty && <p className="m-0 text-xs text-on-surface-variant">{pro.specialty}</p>}
                      <p className="mt-1 mb-0 text-xs text-outline">
                        {proQuotes.length} orçamento{proQuotes.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={16} className="text-outline" />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-3.5">
                          <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
                            <button onClick={() => openOrcamentoFlow(pro.id)}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border-none bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold cursor-pointer shadow-sm">
                              <ScanLine size={13} /> Subir Orçamento (OCR)
                            </button>
                            {editingProfessional === pro.id ? (
                              <div className="flex gap-1.5">
                                <button onClick={handleSaveProfessional}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border-none bg-success text-white text-xs font-semibold cursor-pointer">
                                  <Check size={12} /> Salvar
                                </button>
                                <button onClick={() => { setEditingProfessional(null); setEditProfessionalForm({}) }}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant bg-white text-on-surface-variant text-xs font-semibold cursor-pointer">
                                  <X size={12} /> Cancelar
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => handleEditProfessional(pro)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant bg-white text-on-surface text-xs font-semibold cursor-pointer hover:bg-surface-container-low transition-colors">
                                <Edit3 size={12} /> Editar
                              </button>
                            )}
                          </div>

                          {editingProfessional === pro.id ? (
                            <div className="flex flex-col gap-2 mb-4 p-3 bg-surface-container-low rounded-xl">
                              <div>
                                <label className="text-[11px] font-semibold text-on-surface-variant block mb-0.5">Nome</label>
                                <input value={editProfessionalForm.name || ''} onChange={e => setEditProfessionalForm({ ...editProfessionalForm, name: e.target.value })} className="w-full p-2 rounded-lg border border-outline-variant text-sm" />
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold text-on-surface-variant block mb-0.5">Telefone</label>
                                <input value={editProfessionalForm.phone || ''} onChange={e => setEditProfessionalForm({ ...editProfessionalForm, phone: e.target.value })} className="w-full p-2 rounded-lg border border-outline-variant text-sm" />
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold text-on-surface-variant block mb-0.5">Email</label>
                                <input type="email" value={editProfessionalForm.email || ''} onChange={e => setEditProfessionalForm({ ...editProfessionalForm, email: e.target.value })} className="w-full p-2 rounded-lg border border-outline-variant text-sm" />
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold text-on-surface-variant block mb-0.5">Especialidade</label>
                                <input value={editProfessionalForm.specialty || ''} onChange={e => setEditProfessionalForm({ ...editProfessionalForm, specialty: e.target.value })} className="w-full p-2 rounded-lg border border-outline-variant text-sm" />
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold text-on-surface-variant block mb-0.5">Indicado por</label>
                                <input value={editProfessionalForm.recommended_by || ''} onChange={e => setEditProfessionalForm({ ...editProfessionalForm, recommended_by: e.target.value })} className="w-full p-2 rounded-lg border border-outline-variant text-sm" />
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="mb-3 p-2.5 bg-surface-container-low rounded-lg">
                                {pro.phone && <p className="mt-0 mb-1 text-xs text-on-surface-variant"><Phone size={12} className="inline align-middle mr-1.5" />{pro.phone}</p>}
                                {pro.email && <p className="mt-0 mb-1 text-xs text-on-surface-variant"><Mail size={12} className="inline align-middle mr-1.5" />{pro.email}</p>}
                                {!pro.phone && !pro.email && <p className="m-0 text-xs text-outline italic">Sem informações de contato</p>}
                                {pro.recommended_by && <p className="mt-1 mb-0 text-xs text-on-surface-variant">Indicado por: {pro.recommended_by}</p>}
                              </div>
                            </>
                          )}

                          {!editingProfessional && (
                            <div>
                              <h5 className="mt-0 mb-1 text-xs font-bold text-on-surface">Observações</h5>
                              {editingNotes[pro.id] !== undefined ? (
                                <div className="flex gap-1.5">
                                  <textarea value={editingNotes[pro.id]} onChange={e => setEditingNotes({ ...editingNotes, [pro.id]: e.target.value })} rows={2} className="flex-1 text-xs p-2 rounded-lg border border-outline-variant" />
                                  <div className="flex gap-1 flex-col">
                                    <button onClick={() => handleSaveNotes(pro.id, editingNotes[pro.id])} className="px-2 py-1 rounded-lg border-none bg-success text-white text-[11px] font-semibold cursor-pointer"><Check size={12} /></button>
                                    <button onClick={() => { const n = { ...editingNotes }; delete n[pro.id]; setEditingNotes(n) }} className="px-2 py-1 rounded-lg border-none bg-surface-container text-on-surface-variant text-[11px] font-semibold cursor-pointer"><X size={12} /></button>
                                  </div>
                                </div>
                              ) : (
                                <p onClick={() => setEditingNotes({ ...editingNotes, [pro.id]: pro.notes || '' })}
                                  className={`m-0 text-xs cursor-pointer p-2 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors ${pro.notes ? 'text-on-surface-variant' : 'text-outline italic'}`}>
                                  {pro.notes || 'Clique para adicionar observações'}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
      </CollapsibleSection>

      {/* ─── 4. Documentos & Memoriais ─────────────────────────── */}
      <CollapsibleSection
        title="Documentos & Memoriais"
        icon={FolderOpen}
        count={orcamentoDocs.length}
        defaultOpen={false}
      >
        <DocumentSection
          orcamentoDocs={orcamentoDocs}
          currentUser={currentUser}
          showAddDoc={showAddDoc}
          uploadingDoc={uploadingDoc}
          newDoc={newDoc}
          onNewDocChange={setNewDoc}
          onShowAddDoc={setShowAddDoc}
          onUploadDoc={handleUploadDoc}
          onDeleteDoc={handleDeleteDoc}
        />
      </CollapsibleSection>

      {/* ─── Modals ────────────────────────────────────────────── */}
      {showOcrProSelect && (
        <OcrProSelectModal
          professionals={professionals}
          quotes={quotes}
          onSelect={(proId) => { setShowOcrProSelect(false); openOrcamentoFlow(proId) }}
          onClose={() => setShowOcrProSelect(false)}
        />
      )}

      {showAddProfessional && (
        <AddProfessionalForm
          formError={formError}
          saving={saving}
          newProfessional={newProfessional}
          onNewProfessionalChange={setNewProfessional}
          onSave={handleAddProfessional}
          onClose={() => { setShowAddProfessional(false); setFormError('') }}
        />
      )}

      {showAddQuote && (
        <AddQuoteForm
          formError={formError}
          saving={saving}
          professionals={professionals}
          serviceCategories={serviceCategories}
          rooms={rooms}
          newQuote={newQuote}
          onNewQuoteChange={setNewQuote}
          onSave={handleAddQuote}
          onClose={() => { setShowAddQuote(false); setFormError('') }}
          onOpenAddProfessional={() => { setShowAddQuote(false); setShowAddProfessional(true); setFormError('') }}
        />
      )}

      {paymentModal && (
        <PaymentModal
          quoteId={paymentModal.quoteId}
          targetStatus={paymentModal.targetStatus}
          currentAmount={paymentModal.currentAmount}
          saving={saving}
          paymentForm={paymentForm}
          onPaymentFormChange={setPaymentForm}
          onConfirm={handlePaymentConfirm}
          onClose={() => setPaymentModal(null)}
        />
      )}

      {orcamentoFlow && (
        <OcrModal
          orcamentoFlow={orcamentoFlow}
          professionals={professionals}
          rooms={rooms}
          onClose={closeOrcamentoFlow}
          onFileChange={(file) => setOrcamentoFlow({ ...orcamentoFlow, file, error: null })}
          onParse={handleParseOrcamento}
          onSave={handleSaveOrcamento}
          onUpdateItem={updateOrcItem}
          onRemoveItem={removeOrcItem}
          onAddItem={addOrcItem}
          onDescriptionChange={(desc) => setOrcamentoFlow({ ...orcamentoFlow, description: desc })}
        />
      )}
    </div>
  )
}
