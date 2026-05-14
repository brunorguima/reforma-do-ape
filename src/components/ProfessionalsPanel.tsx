'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Room } from '@/lib/supabase'
import type { UserID } from '@/lib/constants'
import { USERS, formatCurrency } from '@/lib/constants'
import { Plus, User, Users, BookOpen, Upload, Phone, Mail, ChevronDown, ChevronUp, Edit3, Check, X, FileText } from 'lucide-react'
import { apiUrl, withProjectId } from '@/lib/project-client'
import { PanelSkeleton } from '@/components/ui'

import type { Professional, Quote, Contract, BudgetItem, Payment, OrcamentoDoc, OrcamentoFlow, OrcamentoParsedItem, ServiceCategory } from './professionals/types'
import { fmtBRL, fmtFileSize } from './professionals/types'

import QuoteCard from './professionals/QuoteCard'
import { ContractFromTable, ContractFromQuote } from './professionals/ContractCard'
import AddProfessionalForm from './professionals/AddProfessionalForm'
import AddQuoteForm from './professionals/AddQuoteForm'
import { OcrProSelectModal, OcrModal } from './professionals/OcrModal'
import PaymentModal from './professionals/PaymentModal'
import DocumentSection from './professionals/DocumentSection'

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
  const [showProfessionalsList, setShowProfessionalsList] = useState(true)
  const [expandedProfessional, setExpandedProfessional] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState<{ [key: string]: string }>({})

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
        fetch(apiUrl('/api/quotes', projectId)), fetch(apiUrl('/api/professionals', projectId)), fetch(apiUrl('/api/service-categories', projectId)),
        fetch(apiUrl('/api/contracts', projectId)), fetch(apiUrl('/api/budget-items', projectId)), fetch(apiUrl('/api/payments', projectId)),
        fetch(apiUrl('/api/documents', projectId)),
      ])
      const [quotesData, prosData, catsData, conData, budData, payData, docsData] = await Promise.all([
        quotesRes.json(), prosRes.json(), catsRes.json(), conRes.json(), budRes.json(), payRes.json(),
        docsRes.json(),
      ])
      setQuotes(Array.isArray(quotesData) ? quotesData : [])
      setProfessionals(Array.isArray(prosData) ? prosData : [])
      setServiceCategories(Array.isArray(catsData) ? catsData : [])
      setContracts(Array.isArray(conData) ? conData : [])
      setBudgetItems(Array.isArray(budData) ? budData : [])
      setPayments(Array.isArray(payData) ? payData : [])
      setOrcamentoDocs(Array.isArray(docsData) ? docsData.filter((d: OrcamentoDoc) => d.doc_type === 'orcamento' || d.doc_type === 'memorial') : [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
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

  const filteredQuotes = quotes.filter(q => {
    if (['contratado', 'pago'].includes(q.status)) return false
    if (filterStatus && q.status !== filterStatus) return false
    if (filterCategory && q.service_category_id !== filterCategory) return false
    return true
  })

  const contratadoQuotes = quotes.filter(q => ['contratado', 'pago'].includes(q.status))

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
    if (hasContratado || hasContract) return { status: 'Contratado', emoji: '✅' }
    if (profQuotes.length > 0) return { status: 'Orçando', emoji: '📋' }
    return { status: 'Cadastrado', emoji: '👤' }
  }

  const STATUS_CONFIG_FILTER: Record<string, { label: string; emoji: string }> = {
    recebido: { label: 'Recebido', emoji: '📩' },
    avaliando: { label: 'Avaliando', emoji: '🔍' },
    aprovado: { label: 'Aprovado', emoji: '✅' },
    recusado: { label: 'Recusado', emoji: '❌' },
  }

  if (loading) return <PanelSkeleton />

  return (
    <div>
      {/* KPI Cards */}
      <div className="kpi-grid grid-cols-4">
        <div className="kpi-card" data-accent="indigo">
          <p className="kpi-label">Orçado</p>
          <p className="kpi-value">{formatCurrency(totalOrcado)}</p>
        </div>
        <div className="kpi-card" data-accent="green">
          <p className="kpi-label">Contratado</p>
          <p className="kpi-value">{formatCurrency(totalContratado)}</p>
        </div>
        <div className="kpi-card" data-accent="blue">
          <p className="kpi-label">Pago</p>
          <p className="kpi-value">{formatCurrency(totalPago)}</p>
        </div>
        <div className="kpi-card" data-accent="amber">
          <p className="kpi-label">Profissionais</p>
          <p className="kpi-value">{activeQuotes.length}</p>
          <p className="kpi-sub">orçamentos ativos</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <button className="btn-primary" onClick={() => setShowAddQuote(!showAddQuote)}>
          <Plus size={16} className="inline mr-1 align-middle" />
          Novo Orçamento
        </button>
        <button onClick={() => setShowOcrProSelect(true)} className="btn-primary text-[13px]" title="Subir PDF de orçamento e extrair itens automaticamente com Gemini OCR">
          📄 Subir Orçamento (OCR)
        </button>
        <button onClick={() => setShowAddProfessional(!showAddProfessional)} className="btn-secondary">
          <User size={16} className="inline mr-1 align-middle" />
          Novo Profissional
        </button>
      </div>

      {/* OCR Professional Selector Modal */}
      {showOcrProSelect && (
        <OcrProSelectModal
          professionals={professionals}
          quotes={quotes}
          onSelect={(proId) => { setShowOcrProSelect(false); openOrcamentoFlow(proId) }}
          onClose={() => setShowOcrProSelect(false)}
        />
      )}

      {/* Documents Section */}
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

      {/* Tab Toggle: Orçamentos / Profissionais */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setShowProfessionalsList(false)}
          className={`px-4 py-2 rounded-[20px] border-none text-[13px] font-semibold cursor-pointer transition-all ${!showProfessionalsList ? 'bg-[#2563EB] text-white' : 'bg-[#f3f4f6] text-[#6b7280]'}`}>
          <BookOpen size={14} className="inline mr-1.5 align-middle" />
          Orçamentos
        </button>
        <button
          onClick={() => setShowProfessionalsList(true)}
          className={`px-4 py-2 rounded-[20px] border-none text-[13px] font-semibold cursor-pointer transition-all ${showProfessionalsList ? 'bg-[#2563EB] text-white' : 'bg-[#f3f4f6] text-[#6b7280]'}`}>
          <Users size={14} className="inline mr-1.5 align-middle" />
          Profissionais
        </button>
      </div>

      {/* Add Professional Form Modal */}
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

      {/* Add Quote Form Modal */}
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

      {/* Payment Method Modal */}
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

      {/* Orçamentos Tab */}
      {!showProfessionalsList && (
        <>
          {/* Filters */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="min-w-[140px]">
              <option value="">Todos os status</option>
              {Object.entries(STATUS_CONFIG_FILTER).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
              ))}
            </select>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="min-w-[160px]">
              <option value="">Todos os serviços</option>
              {serviceCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>

          {/* Quotes List */}
          {filteredQuotes.length === 0 ? (
            <div className="text-center p-10">
              <div className="text-5xl mb-4">👷</div>
              <h3 className="text-lg text-[#374151] mb-2">Nenhum orçamento ainda</h3>
              <p className="text-[#6b7280]">Adicione profissionais e orçamentos para controlar os custos da reforma!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredQuotes.map(quote => (
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
        </>
      )}

      {/* Contratos Fechados Section */}
      {(contracts.length > 0 || contratadoQuotes.length > 0) && (
        <div className="mt-7">
          <h3 className="text-base font-bold text-[#374151] mb-3.5 flex items-center gap-2">
            <FileText size={18} /> Contratos Fechados
          </h3>
          <div className="flex flex-col gap-3.5">
            {contracts.map(contract => (
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
            {contratadoQuotes.map(quote => (
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
        </div>
      )}

      {/* OCR Orçamento Modal */}
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

      {/* Profissionais Cadastrados Section */}
      {showProfessionalsList && (
        <div className="mt-7">
          <h3 className="text-base font-bold text-[#374151] mb-3.5 flex items-center gap-2">
            <Users size={18} /> Profissionais Cadastrados
          </h3>
          {professionals.length === 0 ? (
            <div className="text-center p-10">
              <div className="text-5xl mb-4">👤</div>
              <h3 className="text-lg text-[#374151] mb-2">Nenhum profissional cadastrado</h3>
              <p className="text-[#6b7280]">Comece adicionando profissionais para seus orçamentos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
              {professionals.map(pro => {
                const isExpanded = expandedProfessional === pro.id
                const status = getProfessionalStatus(pro.id)
                const proQuotes = quotes.filter(q => q.professional_id === pro.id)

                return (
                  <div key={pro.id} className="card p-0 overflow-hidden">
                    <div
                      onClick={() => setExpandedProfessional(isExpanded ? null : pro.id)}
                      className={`p-3.5 cursor-pointer bg-[#F9FAFB] flex justify-between items-start gap-3 ${isExpanded ? 'border-b border-[#E5E7EB]' : ''}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="m-0 text-sm font-bold text-[#1F2937]">{pro.name}</h4>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#E5E7EB] text-[#374151] font-semibold">
                            {status.emoji} {status.status}
                          </span>
                        </div>
                        {pro.specialty && <p className="m-0 text-xs text-[#6B7280]">{pro.specialty}</p>}
                        <p className="mt-1 mb-0 text-xs text-[#9CA3AF]">
                          {proQuotes.length} orçamento{proQuotes.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {isExpanded ? <ChevronUp size={16} color="#9CA3AF" /> : <ChevronDown size={16} color="#9CA3AF" />}
                    </div>

                    {isExpanded && (
                      <div className="p-3.5 border-t border-[#E5E7EB]">
                        <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
                          <button onClick={() => openOrcamentoFlow(pro.id)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border-none bg-gradient-to-br from-[#7c3aed] to-[#2563eb] text-white text-xs font-bold cursor-pointer shadow-[0_2px_4px_rgba(124,58,237,0.2)]">
                            <Upload size={13} /> Subir Orçamento (OCR)
                          </button>
                          {editingProfessional === pro.id ? (
                            <div className="flex gap-1.5">
                              <button onClick={handleSaveProfessional}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-md border-none bg-[#10B981] text-white text-xs font-semibold cursor-pointer">
                                <Check size={12} /> Salvar
                              </button>
                              <button onClick={() => { setEditingProfessional(null); setEditProfessionalForm({}) }}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-md border-none bg-[#E5E7EB] text-[#6B7280] text-xs font-semibold cursor-pointer">
                                <X size={12} /> Cancelar
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => handleEditProfessional(pro)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#D1D5DB] bg-white text-[#374151] text-xs font-semibold cursor-pointer">
                              <Edit3 size={12} /> Editar
                            </button>
                          )}
                        </div>

                        {editingProfessional === pro.id ? (
                          <div className="flex flex-col gap-2 mb-4 p-3 bg-[#F0FDF4] rounded-[10px]">
                            <div>
                              <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Nome</label>
                              <input value={editProfessionalForm.name || ''} onChange={e => setEditProfessionalForm({ ...editProfessionalForm, name: e.target.value })}
                                className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Telefone</label>
                              <input value={editProfessionalForm.phone || ''} onChange={e => setEditProfessionalForm({ ...editProfessionalForm, phone: e.target.value })}
                                className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Email</label>
                              <input type="email" value={editProfessionalForm.email || ''} onChange={e => setEditProfessionalForm({ ...editProfessionalForm, email: e.target.value })}
                                className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Especialidade</label>
                              <input value={editProfessionalForm.specialty || ''} onChange={e => setEditProfessionalForm({ ...editProfessionalForm, specialty: e.target.value })}
                                className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Indicado por</label>
                              <input value={editProfessionalForm.recommended_by || ''} onChange={e => setEditProfessionalForm({ ...editProfessionalForm, recommended_by: e.target.value })}
                                className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="mb-3">
                              <h5 className="mt-0 mb-2 text-xs font-bold text-[#374151]">📞 Contato</h5>
                              {pro.phone && <p className="mt-0 mb-1 text-xs text-[#6B7280]"><Phone size={12} className="inline align-middle mr-1" />{pro.phone}</p>}
                              {pro.email && <p className="mt-0 mb-1 text-xs text-[#6B7280]"><Mail size={12} className="inline align-middle mr-1" />{pro.email}</p>}
                              {!pro.phone && !pro.email && <p className="m-0 text-xs text-[#9CA3AF] italic">Sem informações de contato</p>}
                            </div>
                            {pro.recommended_by && (
                              <div className="mb-3">
                                <h5 className="mt-0 mb-1 text-xs font-bold text-[#374151]">👤 Indicado por</h5>
                                <p className="m-0 text-xs text-[#6B7280]">{pro.recommended_by}</p>
                              </div>
                            )}
                          </>
                        )}

                        {!editingProfessional && (
                          <div>
                            <h5 className="mt-0 mb-1 text-xs font-bold text-[#374151]">📝 Observações</h5>
                            {editingNotes[pro.id] !== undefined ? (
                              <div className="flex gap-1.5">
                                <textarea value={editingNotes[pro.id]} onChange={e => setEditingNotes({ ...editingNotes, [pro.id]: e.target.value })} rows={2} className="flex-1 text-xs p-1.5 rounded-md border border-[#E5E7EB]" />
                                <div className="flex gap-1 flex-col">
                                  <button onClick={() => handleSaveNotes(pro.id, editingNotes[pro.id])} className="px-2 py-1 rounded border-none bg-success text-white text-[11px] font-semibold cursor-pointer"><Check size={12} /></button>
                                  <button onClick={() => { const n = { ...editingNotes }; delete n[pro.id]; setEditingNotes(n) }} className="px-2 py-1 rounded border-none bg-[#E5E7EB] text-[#6B7280] text-[11px] font-semibold cursor-pointer"><X size={12} /></button>
                                </div>
                              </div>
                            ) : (
                              <p onClick={() => setEditingNotes({ ...editingNotes, [pro.id]: pro.notes || '' })}
                                className={`m-0 text-xs cursor-pointer p-1.5 rounded bg-[#F9FAFB] ${pro.notes ? 'text-[#6B7280]' : 'text-[#9CA3AF] italic'}`}>
                                {pro.notes || 'Clique para adicionar observações'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
