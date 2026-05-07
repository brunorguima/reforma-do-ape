'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Room } from '@/lib/supabase'
import type { UserID } from '@/lib/constants'
import { USERS, formatCurrency } from '@/lib/constants'
import { Plus, User, Phone, Mail, ChevronDown, ChevronUp, Trash2, Edit3, Check, X, Wrench, FileText, CreditCard, CheckCircle2, Clock, TrendingDown, Users, BookOpen, ExternalLink, Upload, File as FileIcon } from 'lucide-react'
import { apiUrl, withProjectId } from '@/lib/project-client'

interface ServiceCategory {
  id: string
  name: string
  icon: string
  order_index: number
}

interface Professional {
  id: string
  name: string
  phone?: string
  email?: string
  specialty?: string
  notes?: string
  recommended_by?: string
  created_at: string
  created_by: string
}

interface Quote {
  id: string
  professional_id: string
  service_category_id?: string
  room_id?: string
  description: string
  amount: number
  status: 'recebido' | 'avaliando' | 'aprovado' | 'contratado' | 'pago' | 'recusado'
  notes?: string
  scheduled_date?: string
  paid_date?: string
  payment_method?: string
  payment_details?: string
  negotiated_amount?: number
  created_at: string
  created_by: string
  updated_by: string
  professional?: Professional
  service_category?: ServiceCategory
  room?: Room
}

const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX', emoji: '⚡' },
  { value: 'boleto', label: 'Boleto', emoji: '📄' },
  { value: 'cartao_credito', label: 'Cartão Crédito', emoji: '💳' },
  { value: 'cartao_debito', label: 'Cartão Débito', emoji: '💳' },
  { value: 'dinheiro', label: 'Dinheiro', emoji: '💵' },
  { value: 'transferencia', label: 'Transferência', emoji: '🏦' },
  { value: 'parcelado', label: 'Parcelado', emoji: '📊' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  recebido: { label: 'Recebido', color: '#6b7280', bg: '#f3f4f6', emoji: '📩' },
  avaliando: { label: 'Avaliando', color: '#d97706', bg: '#fef3c7', emoji: '🔍' },
  aprovado: { label: 'Aprovado', color: '#059669', bg: '#d1fae5', emoji: '✅' },
  contratado: { label: 'Contratado', color: '#2563eb', bg: '#dbeafe', emoji: '🤝' },
  pago: { label: 'Pago', color: '#7c3aed', bg: '#ede9fe', emoji: '💰' },
  recusado: { label: 'Recusado', color: '#dc2626', bg: '#fee2e2', emoji: '❌' },
}

interface Contract {
  id: string; professional: string; role: string; original_total: number; negotiated_total: number;
  start_date: string; first_payment_date: string; status: string; notes: string;
}
interface BudgetItem {
  id: string; professional: string; category: string; service: string; location: string;
  original_value: number | null; notes: string | null; sort_order: number;
}
interface Payment {
  id: string; professional: string; installment_number: number; amount: number;
  due_date: string; paid_date: string | null; status: string; notes: string;
}

interface OrcamentoDoc {
  id: string
  title: string
  description?: string
  doc_type: string
  url?: string
  file_path?: string
  file_name?: string
  file_size?: number
  file_type?: string
  created_by: string
  created_at: string
}

interface OrcamentoParsedItem {
  numero: number
  descricao: string
  quantidade: number
  unidade: string | null
  valor_unitario: number
  valor_total: number
  categoria: string | null
  ambiente_sugerido: string | null
  observacoes: string | null
  room_id?: string | null
}

interface OrcamentoParsed {
  profissional_sugerido: string | null
  especialidade_sugerida: string | null
  telefone: string | null
  email: string | null
  cnpj_cpf: string | null
  data_orcamento: string | null
  validade_dias: number | null
  condicoes_pagamento: string | null
  total: number
  total_mao_obra: number | null
  total_material: number | null
  itens: OrcamentoParsedItem[]
  observacoes: string | null
  confidence: 'alta' | 'media' | 'baixa'
  warnings: string[]
  file_name?: string
  file_size?: number
}

interface OrcamentoFlow {
  proId: string
  step: 'select' | 'parsing' | 'review'
  file: File | null
  documentId: string | null
  parsed: OrcamentoParsed | null
  description: string
  editedItems: OrcamentoParsedItem[]
  saving: boolean
  error: string | null
}

const fmtBRL = (v: number | null) => v ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) : '—'
const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

const STATUS_FLOW = ['recebido', 'avaliando', 'aprovado', 'contratado']

interface Props {
  currentUser: UserID
  rooms: Room[]
  projectId?: string | null
}

export default function ProfessionalsPanel({ currentUser, rooms, projectId }: Props) {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([])
  const [showAddQuote, setShowAddQuote] = useState(false)
  const [showAddProfessional, setShowAddProfessional] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [expandedQuote, setExpandedQuote] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [expandedContract, setExpandedContract] = useState<string | null>(null)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showProfessionalsList, setShowProfessionalsList] = useState(true)
  const [expandedProfessional, setExpandedProfessional] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState<{ [key: string]: string }>({})
  // Payment method modal
  const [paymentModal, setPaymentModal] = useState<{ quoteId: string; targetStatus: string; currentAmount: number } | null>(null)
  const [paymentForm, setPaymentForm] = useState({ payment_method: '', payment_details: '', negotiated_amount: '' })

  // Editing states
  const [editingContract, setEditingContract] = useState<string | null>(null)
  const [editContractForm, setEditContractForm] = useState<Partial<Contract>>({})
  const [editingQuote, setEditingQuote] = useState<string | null>(null)
  const [editQuoteForm, setEditQuoteForm] = useState<Partial<Quote>>({})
  const [editingProfessional, setEditingProfessional] = useState<string | null>(null)
  const [editProfessionalForm, setEditProfessionalForm] = useState<Partial<Professional>>({})

  // Orçamento docs (memoriais, escopos, PDFs)
  const [orcamentoDocs, setOrcamentoDocs] = useState<OrcamentoDoc[]>([])
  const [showAddDoc, setShowAddDoc] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [newDoc, setNewDoc] = useState<{ title: string; description: string; file: File | null }>({ title: '', description: '', file: null })

  // OCR Orçamento flow
  const [orcamentoFlow, setOrcamentoFlow] = useState<OrcamentoFlow | null>(null)
  const [showOcrProSelect, setShowOcrProSelect] = useState(false)

  // Form states
  const [newProfessional, setNewProfessional] = useState({ name: '', phone: '', email: '', specialty: '', notes: '', recommended_by: '' })
  const [newQuote, setNewQuote] = useState({
    professional_id: '', service_category_id: '', room_id: '',
    description: '', amount: '', notes: '', scheduled_date: ''
  })

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

  // Totals — include both quotes AND contracts table
  const activeQuotes = quotes.filter(q => !['recusado'].includes(q.status))
  const contractsTotal = contracts.reduce((s, c) => s + (c.negotiated_total || 0), 0)
  const contractsOriginalTotal = contracts.reduce((s, c) => s + (c.original_total || 0), 0)
  // For contratado quotes, use negotiated_amount if available
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

  // Filter - only non-contratado/pago quotes for main list
  const filteredQuotes = quotes.filter(q => {
    if (['contratado', 'pago'].includes(q.status)) return false
    if (filterStatus && q.status !== filterStatus) return false
    if (filterCategory && q.service_category_id !== filterCategory) return false
    return true
  })

  // Quotes that are contratado or pago (for Contratos Fechados section)
  const contratadoQuotes = quotes.filter(q => ['contratado', 'pago'].includes(q.status))

  const handleUploadDoc = async () => {
    if (!newDoc.title.trim() || !newDoc.file) {
      alert('Preencha o título e selecione um arquivo')
      return
    }
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
      if (!res.ok) {
        const err = await res.json()
        alert('Erro no upload: ' + (err.error || 'Falha'))
        return
      }
      await fetchData()
      setShowAddDoc(false)
      setNewDoc({ title: '', description: '', file: null })
    } catch (err) {
      console.error(err)
      alert('Erro no upload')
    } finally {
      setUploadingDoc(false)
    }
  }

  const handleDeleteDoc = async (docId: string) => {
    const doc = orcamentoDocs.find(d => d.id === docId)
    if (currentUser === 'mari' && doc?.created_by !== 'mari') {
      alert('Sem permissão para deletar documentos de outros usuários')
      return
    }
    if (!confirm('Tem certeza que deseja excluir este documento?')) return
    try {
      await fetch(`/api/documents/${docId}`, { method: 'DELETE' })
      await fetchData()
    } catch (err) { console.error(err) }
  }

  const fmtFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // === OCR ORÇAMENTO FLOW ===
  const openOrcamentoFlow = (proId: string) => {
    setOrcamentoFlow({
      proId,
      step: 'select',
      file: null,
      documentId: null,
      parsed: null,
      description: '',
      editedItems: [],
      saving: false,
      error: null,
    })
  }

  const closeOrcamentoFlow = () => setOrcamentoFlow(null)

  const handleParseOrcamento = async () => {
    if (!orcamentoFlow || !orcamentoFlow.file) return
    setOrcamentoFlow({ ...orcamentoFlow, step: 'parsing', error: null })
    try {
      const pro = professionals.find(p => p.id === orcamentoFlow.proId)
      // 1. Upload PDF to storage (type=orcamento, link to professional)
      const fd = new FormData()
      fd.append('file', orcamentoFlow.file)
      fd.append('title', `Orçamento ${pro?.name ?? ''} - ${orcamentoFlow.file.name}`)
      fd.append('description', `Orçamento OCR de ${pro?.name ?? ''}`)
      fd.append('type', 'orcamento')
      fd.append('created_by', currentUser)
      fd.append('professional_id', orcamentoFlow.proId)
      fd.append('allow_duplicate', 'true') // allow reparse
      fd.append('project_id', projectId || '')
      const upRes = await fetch('/api/documents/upload', { method: 'POST', body: fd })
      if (!upRes.ok) {
        const err = await upRes.json()
        throw new Error(err.error || 'Falha no upload do PDF')
      }
      const upData = await upRes.json()
      const documentId = upData.id

      // 2. Parse with Gemini
      const parseForm = new FormData()
      parseForm.append('file', orcamentoFlow.file)
      parseForm.append('project_id', projectId || '')
      const parseRes = await fetch('/api/orcamento/parse', { method: 'POST', body: parseForm })
      if (!parseRes.ok) {
        const err = await parseRes.json()
        throw new Error(err.error || 'Falha ao parsear orçamento')
      }
      const parsed: OrcamentoParsed = await parseRes.json()

      // 3. Fill parsed_data on the document record so we keep history
      try {
        await fetch(`/api/documents/${documentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(withProjectId({ parsed_data: parsed }, projectId)),
        })
      } catch { /* non-critical */ }

      const autoDescription = parsed.itens.length > 0
        ? `Orçamento - ${parsed.itens.length} ite${parsed.itens.length === 1 ? 'm' : 'ns'}`
        : `Orçamento ${pro?.name ?? ''}`

      setOrcamentoFlow((prev) => prev ? {
        ...prev,
        step: 'review',
        documentId,
        parsed,
        description: autoDescription,
        editedItems: parsed.itens.map(it => ({ ...it, room_id: null })),
      } : null)
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
      // Recalculate valor_total if quantity or unit price changed
      if ('quantidade' in patch || 'valor_unitario' in patch) {
        merged.valor_total = (Number(merged.quantidade) || 0) * (Number(merged.valor_unitario) || 0)
      }
      next[index] = merged
      return { ...prev, editedItems: next }
    })
  }

  const removeOrcItem = (index: number) => {
    setOrcamentoFlow((prev) => {
      if (!prev) return prev
      const next = prev.editedItems.filter((_, i) => i !== index)
      return { ...prev, editedItems: next }
    })
  }

  const addOrcItem = () => {
    setOrcamentoFlow((prev) => {
      if (!prev) return prev
      const next: OrcamentoParsedItem = {
        numero: prev.editedItems.length + 1,
        descricao: '',
        quantidade: 1,
        unidade: null,
        valor_unitario: 0,
        valor_total: 0,
        categoria: null,
        ambiente_sugerido: null,
        observacoes: null,
        room_id: null,
      }
      return { ...prev, editedItems: [...prev.editedItems, next] }
    })
  }

  const handleSaveOrcamento = async () => {
    if (!orcamentoFlow || !orcamentoFlow.parsed) return
    const totalCalc = orcamentoFlow.editedItems.reduce((s, it) => s + (Number(it.valor_total) || 0), 0)
    setOrcamentoFlow({ ...orcamentoFlow, saving: true, error: null })
    try {
      const res = await fetch('/api/orcamento/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withProjectId({
          professional_id: orcamentoFlow.proId,
          description: orcamentoFlow.description || 'Orçamento',
          amount: totalCalc > 0 ? totalCalc : orcamentoFlow.parsed.total,
          status: 'avaliando',
          notes: orcamentoFlow.parsed.observacoes || null,
          itens: orcamentoFlow.editedItems,
          document_id: orcamentoFlow.documentId,
          created_by: currentUser,
        }, projectId)),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Falha ao salvar orçamento')
      }
      closeOrcamentoFlow()
      await fetchData()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      setOrcamentoFlow((prev) => prev ? { ...prev, saving: false, error: msg } : null)
    }
  }

  const orcCategories = [
    'eletrica', 'hidraulica', 'alvenaria', 'piso', 'pintura', 'gesso',
    'marcenaria', 'serralheria', 'vidraçaria', 'impermeabilizacao',
    'ar_condicionado', 'demolicao', 'limpeza', 'mao_de_obra', 'material', 'outro',
  ]

  const handleAddProfessional = async () => {
    setFormError('')
    if (!newProfessional.name.trim()) {
      setFormError('Preencha o nome do profissional')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/professionals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withProjectId({ ...newProfessional, created_by: currentUser }, projectId)),
      })
      if (!res.ok) {
        const err = await res.json()
        setFormError(err.error || 'Erro ao salvar profissional')
        return
      }
      setNewProfessional({ name: '', phone: '', email: '', specialty: '', notes: '', recommended_by: '' })
      setShowAddProfessional(false)
      setFormError('')
      await fetchData()
    } catch (err) {
      setFormError('Erro de conexão. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddQuote = async () => {
    setFormError('')
    if (!newQuote.professional_id) {
      setFormError('Selecione um profissional')
      return
    }
    if (!newQuote.description.trim()) {
      setFormError('Preencha a descrição do serviço')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withProjectId({
          ...newQuote,
          amount: parseFloat(newQuote.amount) || 0,
          service_category_id: newQuote.service_category_id || null,
          room_id: newQuote.room_id || null,
          scheduled_date: newQuote.scheduled_date || null,
          notes: newQuote.notes || null,
          created_by: currentUser,
        }, projectId)),
      })
      if (!res.ok) {
        const err = await res.json()
        setFormError(err.error || 'Erro ao salvar orçamento')
        return
      }
      setNewQuote({ professional_id: '', service_category_id: '', room_id: '', description: '', amount: '', notes: '', scheduled_date: '' })
      setShowAddQuote(false)
      setFormError('')
      await fetchData()
    } catch (err) {
      setFormError('Erro de conexão. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (quoteId: string, newStatus: string) => {
    // For contratado, show payment method modal
    if (newStatus === 'contratado') {
      const quote = quotes.find(q => q.id === quoteId)
      setPaymentForm({
        payment_method: quote?.payment_method || '',
        payment_details: quote?.payment_details || '',
        negotiated_amount: quote?.negotiated_amount?.toString() || quote?.amount?.toString() || '',
      })
      setPaymentModal({ quoteId, targetStatus: newStatus, currentAmount: Number(quote?.amount || 0) })
      return
    }
    await fetch(`/api/quotes/${quoteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(withProjectId({ status: newStatus, updated_by: currentUser }, projectId)),
    })
    fetchData()
  }

  const handlePaymentConfirm = async () => {
    if (!paymentModal) return
    setSaving(true)
    try {
      await fetch(`/api/quotes/${paymentModal.quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withProjectId({
          status: paymentModal.targetStatus,
          updated_by: currentUser,
          payment_method: paymentForm.payment_method || null,
          payment_details: paymentForm.payment_details || null,
          negotiated_amount: paymentForm.negotiated_amount ? parseFloat(paymentForm.negotiated_amount) : null,
        }, projectId)),
      })
      setPaymentModal(null)
      setPaymentForm({ payment_method: '', payment_details: '', negotiated_amount: '' })
      await fetchData()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const handleDeleteQuote = async (quoteId: string) => {
    const quote = quotes.find(q => q.id === quoteId)
    // Mari can only delete her own quotes
    if (currentUser === 'mari') {
      const profName = quote?.professional?.name || ''
      if (!profName.toLowerCase().includes('mariana') && !profName.toLowerCase().includes('mari') && quote?.created_by !== 'mari') {
        alert('Sem permissão para deletar orçamentos de outros profissionais')
        return
      }
    }
    if (!confirm('Excluir este orçamento?')) return
    await fetch(`/api/quotes/${quoteId}`, { method: 'DELETE' })
    // Log deletion
    try {
      await fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withProjectId({
          action: 'delete', entity_type: 'quote', entity_id: quoteId,
          entity_description: `Orçamento "${quote?.description}" de ${quote?.professional?.name || '?'} (${fmtBRL(Number(quote?.amount || 0))}) deletado`,
          old_values: quote ? { description: quote.description, amount: quote.amount, status: quote.status, professional: quote.professional?.name } : null,
          performed_by: currentUser,
        }, projectId)),
      })
    } catch (e) { console.error(e) }
    fetchData()
  }

  const handleMarkPaid = async (payment: Payment) => {
    setMarkingPaid(payment.id)
    try {
      await fetch('/api/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withProjectId({ id: payment.id, status: 'pago', paid_date: new Date().toISOString().split('T')[0] }, projectId)),
      })
      await fetchData()
    } catch (err) { console.error(err) }
    finally { setMarkingPaid(null) }
  }

  const handleSaveNotes = async (professionalId: string, newNotes: string) => {
    try {
      await fetch(`/api/professionals/${professionalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withProjectId({ notes: newNotes }, projectId)),
      })
      setEditingNotes({ ...editingNotes, [professionalId]: '' })
      await fetchData()
    } catch (err) { console.error(err) }
  }

  const handleEditContract = (contract: Contract) => {
    setEditingContract(contract.id)
    setEditContractForm({ ...contract })
  }

  const handleSaveContract = async () => {
    if (!editingContract) return
    try {
      await fetch('/api/contracts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withProjectId({ id: editingContract, ...editContractForm }, projectId)),
      })
      setEditingContract(null)
      setEditContractForm({})
      await fetchData()
    } catch (err) { console.error(err) }
  }

  const handleEditQuote = (quote: Quote) => {
    setEditingQuote(quote.id)
    setEditQuoteForm({
      description: quote.description,
      amount: quote.amount,
      negotiated_amount: quote.negotiated_amount,
      notes: quote.notes,
      payment_method: quote.payment_method,
      payment_details: quote.payment_details,
      status: quote.status,
    })
  }

  const handleSaveQuote = async () => {
    if (!editingQuote) return
    try {
      await fetch(`/api/quotes/${editingQuote}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withProjectId({
          ...editQuoteForm,
          amount: Number(editQuoteForm.amount) || 0,
          negotiated_amount: editQuoteForm.negotiated_amount ? Number(editQuoteForm.negotiated_amount) : null,
          updated_by: currentUser,
        }, projectId)),
      })
      setEditingQuote(null)
      setEditQuoteForm({})
      await fetchData()
    } catch (err) { console.error(err) }
  }

  const handleEditProfessional = (pro: Professional) => {
    setEditingProfessional(pro.id)
    setEditProfessionalForm({ name: pro.name, phone: pro.phone, email: pro.email, specialty: pro.specialty, recommended_by: pro.recommended_by })
  }

  const handleSaveProfessional = async () => {
    if (!editingProfessional) return
    try {
      await fetch(`/api/professionals/${editingProfessional}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withProjectId(editProfessionalForm, projectId)),
      })
      setEditingProfessional(null)
      setEditProfessionalForm({})
      await fetchData()
    } catch (err) { console.error(err) }
  }

  const getProfessionalStatus = (professionalId: string) => {
    const pro = professionals.find(p => p.id === professionalId)
    const profQuotes = quotes.filter(q => q.professional_id === professionalId)
    const hasContratado = profQuotes.some(q => ['contratado', 'pago'].includes(q.status))
    // Also check if the professional has a contract in the contracts table
    const hasContract = pro ? contracts.some(c => c.professional === pro.name) : false
    if (hasContratado || hasContract) return { status: 'Contratado', emoji: '✅' }
    if (profQuotes.length > 0) return { status: 'Orçando', emoji: '📋' }
    return { status: 'Cadastrado', emoji: '👤' }
  }

  if (loading) return <div className="text-center p-10"><p className="text-[#6b7280]">Carregando orçamentos...</p></div>

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
        <button
          onClick={() => setShowOcrProSelect(true)}
          className="btn-primary text-[13px]"
          title="Subir PDF de orçamento e extrair itens automaticamente com Gemini OCR"
        >
          📄 Subir Orçamento (OCR)
        </button>
        <button onClick={() => setShowAddProfessional(!showAddProfessional)}
          className="btn-secondary">
          <User size={16} className="inline mr-1 align-middle" />
          Novo Profissional
        </button>
      </div>

      {/* OCR Professional Selector Modal */}
      {showOcrProSelect && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowOcrProSelect(false) }}
        >
          <div className="modal-content max-w-[520px] w-[95%]">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-bold m-0">📄 Subir Orçamento (OCR)</h3>
                <p className="text-xs text-[#6b7280] mt-1 mb-0">
                  Escolha o profissional pra vincular o PDF. O Gemini vai ler tudo e extrair itens + valores.
                </p>
              </div>
              <button
                onClick={() => setShowOcrProSelect(false)}
                className="bg-transparent border-none cursor-pointer p-1"
              >
                <X size={20} color="#6b7280" />
              </button>
            </div>
            {professionals.length === 0 ? (
              <div className="p-6 text-center bg-[#fef3c7] rounded-[10px] border border-[#fde68a]">
                <p className="text-sm text-[#92400e] m-0 font-semibold">
                  Nenhum profissional cadastrado ainda.
                </p>
                <p className="text-xs text-[#b45309] mt-1.5 mb-0">
                  Clique em &ldquo;Novo Profissional&rdquo; primeiro e volte aqui.
                </p>
              </div>
            ) : (
              <div className="grid gap-2 max-h-[420px] overflow-y-auto p-1">
                {professionals.map(pro => {
                  const proQuotes = quotes.filter(q => q.professional_id === pro.id)
                  return (
                    <button
                      key={pro.id}
                      onClick={() => {
                        setShowOcrProSelect(false)
                        openOrcamentoFlow(pro.id)
                      }}
                      className="flex items-center justify-between px-3.5 py-3 border-[1.5px] border-[#e5e7eb] rounded-[10px] bg-white cursor-pointer text-left w-full transition-all hover:border-[#7c3aed] hover:bg-[#faf5ff]"
                    >
                      <div>
                        <p className="text-sm font-bold m-0 text-[#111827]">{pro.name}</p>
                        <p className="text-xs text-[#6b7280] mt-0.5 mb-0">
                          {pro.specialty || 'Profissional'} · {proQuotes.length} orçamento{proQuotes.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Upload size={18} color="#7c3aed" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Memoriais & Documentos de Orçamento */}
      <div className="mb-5 bg-white rounded-[14px] p-4 border border-[#e5e7eb]">
        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FileText size={18} color="#7c3aed" />
            <h3 className="text-[15px] font-bold m-0 text-[#111827]">Memoriais & Documentos</h3>
            {orcamentoDocs.length > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-[10px] bg-[#ede9fe] text-[#7c3aed] font-semibold">
                {orcamentoDocs.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAddDoc(true)}
            className="text-xs px-3 py-1.5 border-[1.5px] border-[#7c3aed] rounded-lg bg-white text-[#7c3aed] cursor-pointer font-semibold inline-flex items-center gap-1">
            <Upload size={13} /> Enviar PDF
          </button>
        </div>
        {orcamentoDocs.length === 0 ? (
          <p className="text-[13px] text-[#9ca3af] m-0 py-3 text-center">
            Nenhum memorial ou documento. Envie PDFs de escopo para solicitar orçamentos competitivos.
          </p>
        ) : (
          <div className="grid gap-2">
            {orcamentoDocs.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 px-3 py-2.5 bg-[#faf5ff] rounded-[10px] border border-[#e9d5ff]">
                <div className="text-xl shrink-0">📄</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold m-0 text-[#111827] whitespace-nowrap overflow-hidden text-ellipsis">
                    {doc.title}
                  </p>
                  {doc.description && (
                    <p className="text-[11px] text-[#6b7280] mt-0.5 mb-0 whitespace-nowrap overflow-hidden text-ellipsis">
                      {doc.description}
                    </p>
                  )}
                  <p className="text-[10px] text-[#9ca3af] mt-0.5 mb-0">
                    {doc.file_size ? fmtFileSize(doc.file_size) + ' · ' : ''}{USERS.find(u => u.id === doc.created_by)?.name || doc.created_by} · {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#7c3aed] text-white no-underline text-[11px] font-semibold shrink-0">
                    <ExternalLink size={12} /> Abrir
                  </a>
                )}
                {(currentUser !== 'mari' || doc.created_by === 'mari') && (
                  <button
                    onClick={() => handleDeleteDoc(doc.id)}
                    title="Excluir"
                    className="p-1.5 border-none rounded-lg bg-danger-light text-danger cursor-pointer shrink-0">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Doc Modal */}
      {showAddDoc && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddDoc(false) }}>
          <div className="modal-content">
            <h3 className="text-lg font-bold mb-4">Enviar Memorial / Documento</h3>
            <div className="flex flex-col gap-3">
              <input
                placeholder="Título do documento *"
                value={newDoc.title}
                onChange={e => setNewDoc({ ...newDoc, title: e.target.value })}
                autoFocus
              />
              <textarea
                placeholder="Descrição (opcional)"
                value={newDoc.description}
                onChange={e => setNewDoc({ ...newDoc, description: e.target.value })}
                rows={2}
              />
              <label className={`flex items-center gap-2 p-3 border-2 border-dashed rounded-[10px] cursor-pointer ${newDoc.file ? 'bg-[#f0fdf4] border-[#10b981]' : 'bg-[#fafafa] border-[#d1d5db]'}`}>
                <Upload size={18} color={newDoc.file ? '#10b981' : '#6b7280'} />
                <span className={`text-[13px] font-semibold ${newDoc.file ? 'text-[#065f46]' : 'text-[#6b7280]'}`}>
                  {newDoc.file ? newDoc.file.name : 'Selecionar arquivo PDF...'}
                </span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={e => setNewDoc({ ...newDoc, file: e.target.files?.[0] || null })}
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button
                onClick={() => { setShowAddDoc(false); setNewDoc({ title: '', description: '', file: null }) }}
                className="px-5 py-2.5 border border-[#e5e7eb] rounded-[10px] bg-white cursor-pointer font-semibold text-sm">
                Cancelar
              </button>
              <button
                className="btn-primary px-5 py-2.5"
                onClick={handleUploadDoc}
                disabled={!newDoc.title.trim() || !newDoc.file || uploadingDoc}
                style={{
                  opacity: (!newDoc.title.trim() || !newDoc.file || uploadingDoc) ? 0.5 : 1,
                }}>
                {uploadingDoc ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Add Professional Form */}
      {showAddProfessional && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddProfessional(false) }}>
          <div className="modal-content">
            <h3 className="text-lg font-bold mb-4">Cadastrar Profissional</h3>
            {formError && (
              <div className="px-3.5 py-2.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-danger text-[13px] mb-3">
                {formError}
              </div>
            )}
            <div className="flex flex-col gap-3">
              <input placeholder="Nome do profissional *" value={newProfessional.name} onChange={e => setNewProfessional({...newProfessional, name: e.target.value})} autoFocus style={{ borderColor: formError && !newProfessional.name.trim() ? '#DC2626' : undefined }} />
              <input placeholder="Telefone" type="tel" value={newProfessional.phone} onChange={e => setNewProfessional({...newProfessional, phone: e.target.value})} />
              <input placeholder="Email" type="email" value={newProfessional.email} onChange={e => setNewProfessional({...newProfessional, email: e.target.value})} />
              <input placeholder="Especialidade (ex: Eletricista, Pintor)" value={newProfessional.specialty} onChange={e => setNewProfessional({...newProfessional, specialty: e.target.value})} />
              <input placeholder="Indicado por" value={newProfessional.recommended_by} onChange={e => setNewProfessional({...newProfessional, recommended_by: e.target.value})} />
              <textarea placeholder="Observações" value={newProfessional.notes} onChange={e => setNewProfessional({...newProfessional, notes: e.target.value})} rows={2} />
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => { setShowAddProfessional(false); setFormError('') }} className="px-5 py-2.5 border border-[#e5e7eb] rounded-[10px] bg-white cursor-pointer font-semibold text-sm">Cancelar</button>
              <button className="btn-primary px-5 py-2.5" onClick={handleAddProfessional} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Quote Form */}
      {showAddQuote && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddQuote(false) }}>
          <div className="modal-content">
            <h3 className="text-lg font-bold mb-4">Novo Orçamento</h3>
            {formError && (
              <div className="px-3.5 py-2.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-danger text-[13px] mb-3">
                {formError}
              </div>
            )}
            {professionals.length === 0 && (
              <div className="px-3.5 py-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-[13px] mb-3">
                Cadastre um profissional primeiro antes de criar um orçamento.
                <button onClick={() => { setShowAddQuote(false); setShowAddProfessional(true); setFormError('') }} className="block mt-2 text-[#2563EB] font-semibold bg-transparent border-none cursor-pointer p-0 text-[13px]">
                  + Cadastrar Profissional
                </button>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <select value={newQuote.professional_id} onChange={e => setNewQuote({...newQuote, professional_id: e.target.value})} style={{ borderColor: formError && !newQuote.professional_id ? '#DC2626' : undefined }}>
                <option value="">Selecione o Profissional *</option>
                {professionals.map(p => <option key={p.id} value={p.id}>{p.name} {p.specialty ? `(${p.specialty})` : ''}</option>)}
              </select>
              <select value={newQuote.service_category_id} onChange={e => setNewQuote({...newQuote, service_category_id: e.target.value})}>
                <option value="">Tipo de Serviço</option>
                {serviceCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <input placeholder="Descrição do serviço *" value={newQuote.description} onChange={e => setNewQuote({...newQuote, description: e.target.value})} style={{ borderColor: formError && !newQuote.description.trim() ? '#DC2626' : undefined }} />
              <input type="number" placeholder="Valor (R$)" inputMode="decimal" value={newQuote.amount} onChange={e => setNewQuote({...newQuote, amount: e.target.value})} />
              <select value={newQuote.room_id} onChange={e => setNewQuote({...newQuote, room_id: e.target.value})}>
                <option value="">Cômodo (opcional)</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.icon} {r.name}</option>)}
              </select>
              <input type="date" placeholder="Data prevista" value={newQuote.scheduled_date} onChange={e => setNewQuote({...newQuote, scheduled_date: e.target.value})} />
              <textarea placeholder="Observações" value={newQuote.notes} onChange={e => setNewQuote({...newQuote, notes: e.target.value})} rows={2} />
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => { setShowAddQuote(false); setFormError('') }} className="px-5 py-2.5 border border-[#e5e7eb] rounded-[10px] bg-white cursor-pointer font-semibold text-sm">Cancelar</button>
              <button className="btn-primary px-5 py-2.5" onClick={handleAddQuote} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>{saving ? 'Salvando...' : 'Salvar Orçamento'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Modal */}
      {paymentModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setPaymentModal(null) }}>
          <div className="modal-content">
            <h3 className="text-lg font-bold mb-1">
              🤝 Confirmar Contratação
            </h3>
            <p className="text-[13px] text-[#6B7280] mt-0 mb-4">
              Como será feito o pagamento?
            </p>

            <div className="flex flex-col gap-3">
              {/* Payment Method Chips */}
              <div>
                <label className="text-[13px] font-semibold text-[#374151] mb-2 block">Forma de Pagamento</label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.value} onClick={() => setPaymentForm({ ...paymentForm, payment_method: m.value })}
                      className={`px-3.5 py-2 rounded-[20px] border-2 font-semibold text-[13px] cursor-pointer transition-all ${paymentForm.payment_method === m.value ? 'border-[#2563EB] bg-[#DBEAFE] text-[#1D4ED8]' : 'border-[#E5E7EB] bg-white text-[#374151]'}`}>
                      {m.emoji} {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Negotiated Amount */}
              <div>
                <label className="text-[13px] font-semibold text-[#374151] mb-1.5 block">
                  Valor Negociado (R$)
                </label>
                <input
                  type="number" inputMode="decimal" placeholder="Valor final negociado"
                  value={paymentForm.negotiated_amount}
                  onChange={e => setPaymentForm({ ...paymentForm, negotiated_amount: e.target.value })}
                />
                {paymentModal.currentAmount > 0 && (
                  <p className="text-[11px] text-[#6B7280] mt-1 mb-0">
                    Valor original do orçamento: {formatCurrency(paymentModal.currentAmount)}
                  </p>
                )}
              </div>

              {/* Payment Details */}
              <div>
                <label className="text-[13px] font-semibold text-[#374151] mb-1.5 block">
                  Detalhes do Pagamento
                </label>
                <textarea
                  placeholder="Descreva o plano de pagamento (ex: 3x PIX de R$800 a cada 7 dias, 1ª parcela dia 15/04)"
                  value={paymentForm.payment_details}
                  onChange={e => setPaymentForm({ ...paymentForm, payment_details: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setPaymentModal(null)}
                className="px-5 py-2.5 border border-[#e5e7eb] rounded-[10px] bg-white cursor-pointer font-semibold text-sm">
                Cancelar
              </button>
              <button className="btn-primary px-5 py-2.5" onClick={handlePaymentConfirm} disabled={saving}
                style={{ opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Salvando...' : '🤝 Contratar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!showProfessionalsList && (
        <>
          {/* Filters */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="min-w-[140px]">
              <option value="">Todos os status</option>
              {['recebido', 'avaliando', 'aprovado', 'recusado'].map(key => (
                <option key={key} value={key}>{STATUS_CONFIG[key].emoji} {STATUS_CONFIG[key].label}</option>
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
              {filteredQuotes.map(quote => {
                const statusCfg = STATUS_CONFIG[quote.status] || STATUS_CONFIG.recebido
                const isExpanded = expandedQuote === quote.id
                const currentIdx = STATUS_FLOW.indexOf(quote.status)
                const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null
                const userColor = USERS.find(u => u.id === quote.created_by)?.color || '#6b7280'

                return (
                  <div key={quote.id} className="card p-4 transition-all">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-xl text-xs font-semibold" style={{
                            background: statusCfg.bg, color: statusCfg.color
                          }}>
                            {statusCfg.emoji} {statusCfg.label}
                          </span>
                          {quote.service_category && (
                            <span className="text-xs text-[#6b7280]">
                              {quote.service_category.icon} {quote.service_category.name}
                            </span>
                          )}
                          {quote.room && (
                            <span className="text-xs text-[#6b7280]">
                              📍 {quote.room.name}
                            </span>
                          )}
                        </div>
                        <h4 className="text-[15px] font-semibold mb-1 mt-0 text-[#1f2937]">
                          {quote.description}
                        </h4>
                        <p className="text-[13px] text-[#6b7280] m-0">
                          <User size={12} className="inline align-middle mr-1" />
                          {quote.professional?.name || 'Profissional'}
                          {quote.professional?.phone && (
                            <span className="ml-2">
                              <Phone size={12} className="inline align-middle mr-0.5" />
                              {quote.professional.phone}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[15px] font-extrabold text-[#1f2937] mt-0 mb-1">
                          {formatCurrency(Number(quote.amount))}
                        </p>
                        <div className="flex gap-1 justify-end items-center flex-wrap">
                          <select
                            value={quote.status}
                            onChange={e => handleStatusChange(quote.id, e.target.value)}
                            className="px-2 py-[5px] rounded-lg border border-[#E5E7EB] cursor-pointer text-xs font-semibold appearance-auto"
                            style={{
                              background: statusCfg.bg, color: statusCfg.color,
                            }}
                          >
                            {Object.entries(STATUS_CONFIG)
                              .filter(([key]) => key !== 'pago')
                              .map(([key, cfg]) => (
                              <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
                            ))}
                          </select>
                          <button onClick={() => setExpandedQuote(isExpanded ? null : quote.id)}
                            className="px-2 py-1 rounded-lg border-none cursor-pointer bg-[#f3f4f6]">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-[#f3f4f6] text-[13px] text-[#6b7280]">
                        {quote.payment_method && (
                          <p className="mt-0 mb-2">
                            {PAYMENT_METHODS.find(m => m.value === quote.payment_method)?.emoji || '💳'}{' '}
                            Pagamento: <strong className="text-[#1F2937]">{PAYMENT_METHODS.find(m => m.value === quote.payment_method)?.label || quote.payment_method}</strong>
                            {quote.payment_details && <span> — {quote.payment_details}</span>}
                          </p>
                        )}
                        {quote.negotiated_amount && quote.negotiated_amount !== Number(quote.amount) && (
                          <p className="mt-0 mb-2 text-success">
                            💰 Valor negociado: <strong>{formatCurrency(quote.negotiated_amount)}</strong>
                            <span className="text-[11px] ml-1.5 line-through text-[#9CA3AF]">{formatCurrency(Number(quote.amount))}</span>
                          </p>
                        )}
                        {quote.notes && <p className="mt-0 mb-2">📝 {quote.notes}</p>}
                        {quote.scheduled_date && <p className="mt-0 mb-2">📅 Previsão: {new Date(quote.scheduled_date).toLocaleDateString('pt-BR')}</p>}
                        {quote.paid_date && <p className="mt-0 mb-2">💰 Pago em: {new Date(quote.paid_date).toLocaleDateString('pt-BR')}</p>}
                        {quote.professional?.email && <p className="mt-0 mb-2"><Mail size={12} className="inline align-middle" /> {quote.professional.email}</p>}
                        {quote.professional?.recommended_by && <p className="mt-0 mb-2">👤 Indicado por: {quote.professional.recommended_by}</p>}
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[11px]">
                            Adicionado por <span style={{ color: userColor }} className="font-semibold">{USERS.find(u => u.id === quote.created_by)?.name || quote.created_by}</span>
                            {' em '}{new Date(quote.created_at).toLocaleDateString('pt-BR')}
                          </span>
                          <button onClick={() => handleDeleteQuote(quote.id)}
                            className="px-2 py-1 rounded-md border-none cursor-pointer bg-danger-light text-danger text-xs">
                            <Trash2 size={12} className="inline align-middle mr-1" />
                            Excluir
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Contratos Fechados Section - Merged from contracts table AND contratado/pago quotes */}
      {(contracts.length > 0 || contratadoQuotes.length > 0) && (
        <div className="mt-7">
          <h3 className="text-base font-bold text-[#374151] mb-3.5 flex items-center gap-2">
            <FileText size={18} /> Contratos Fechados
          </h3>
          <div className="flex flex-col gap-3.5">
            {/* Contracts from contracts table */}
            {contracts.map(contract => {
              const cBudgetItems = budgetItems.filter(b => b.professional === contract.professional)
              const cPayments = payments.filter(p => p.professional === contract.professional)
              const totalPaidC = cPayments.filter(p => p.status === 'pago').reduce((s, p) => s + p.amount, 0)
              const economia = contract.original_total - contract.negotiated_total
              const percentPaid = contract.negotiated_total > 0 ? Math.round((totalPaidC / contract.negotiated_total) * 100) : 0
              const isExpanded = expandedContract === contract.id
              const nextPayment = cPayments.find(p => p.status === 'pendente')
              const categories = [...new Set(cBudgetItems.map(b => b.category))]
              const daysUntilNext = nextPayment ? Math.ceil((new Date(nextPayment.due_date + 'T12:00:00').getTime() - Date.now()) / 86400000) : null

              return (
                <div key={contract.id} className="rounded-[14px] border border-[#D1FAE5] overflow-hidden bg-white">
                  {/* Contract Header */}
                  <button
                    onClick={() => setExpandedContract(isExpanded ? null : contract.id)}
                    className="w-full flex items-center justify-between p-4 border-none cursor-pointer bg-gradient-to-br from-[#065F4615] to-[#04785715]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-sm font-bold text-[#065F46]">👷 {contract.professional}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#D1FAE5] text-[#065F46] font-semibold">
                          🤝 Contratado
                        </span>
                      </div>
                      <div className="flex gap-2 text-[11px] text-[#6B7280] flex-wrap">
                        <span>Fechado: {fmtBRL(contract.negotiated_total)}</span>
                        <span className="text-success">
                          <TrendingDown size={11} className="inline align-middle" /> {fmtBRL(economia)}
                        </span>
                        <span>Pago: {percentPaid}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[15px] font-extrabold text-[#065F46]">{fmtBRL(contract.negotiated_total)}</span>
                      {isExpanded ? <ChevronUp size={18} color="#9CA3AF" /> : <ChevronDown size={18} color="#9CA3AF" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4">
                      {/* Edit Button */}
                      <div className="flex justify-end mb-3">
                        {editingContract === contract.id ? (
                          <div className="flex gap-1.5">
                            <button onClick={handleSaveContract}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-md border-none bg-[#10B981] text-white text-xs font-semibold cursor-pointer">
                              <Check size={12} /> Salvar
                            </button>
                            <button onClick={() => { setEditingContract(null); setEditContractForm({}) }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-md border-none bg-[#E5E7EB] text-[#6B7280] text-xs font-semibold cursor-pointer">
                              <X size={12} /> Cancelar
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => handleEditContract(contract)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#D1D5DB] bg-white text-[#374151] text-xs font-semibold cursor-pointer">
                            <Edit3 size={12} /> Editar Contrato
                          </button>
                        )}
                      </div>

                      {/* Contract Details - Editable */}
                      {editingContract === contract.id ? (
                        <div className="flex flex-col gap-2 mb-4 p-3.5 bg-[#F0FDF4] rounded-[10px]">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Profissional</label>
                              <input value={editContractForm.professional || ''} onChange={e => setEditContractForm({ ...editContractForm, professional: e.target.value })}
                                className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
                            </div>
                            <div className="flex-1">
                              <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Função</label>
                              <input value={editContractForm.role || ''} onChange={e => setEditContractForm({ ...editContractForm, role: e.target.value })}
                                className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Valor Original</label>
                              <input type="number" value={editContractForm.original_total || ''} onChange={e => setEditContractForm({ ...editContractForm, original_total: Number(e.target.value) })}
                                className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
                            </div>
                            <div className="flex-1">
                              <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Valor Negociado</label>
                              <input type="number" value={editContractForm.negotiated_total || ''} onChange={e => setEditContractForm({ ...editContractForm, negotiated_total: Number(e.target.value) })}
                                className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Início</label>
                              <input type="date" value={editContractForm.start_date || ''} onChange={e => setEditContractForm({ ...editContractForm, start_date: e.target.value })}
                                className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
                            </div>
                            <div className="flex-1">
                              <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">1º Pagamento</label>
                              <input type="date" value={editContractForm.first_payment_date || ''} onChange={e => setEditContractForm({ ...editContractForm, first_payment_date: e.target.value })}
                                className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Observações</label>
                            <textarea value={editContractForm.notes || ''} onChange={e => setEditContractForm({ ...editContractForm, notes: e.target.value })}
                              rows={2} className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Payment Progress */}
                          <div className="bg-[#F0FDF4] rounded-[10px] p-3.5 mb-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[13px] font-semibold text-[#065F46]">Progresso de Pagamento</span>
                              <span className="text-[13px] font-bold text-[#065F46]">{fmtBRL(totalPaidC)} / {fmtBRL(contract.negotiated_total)}</span>
                            </div>
                            <div className="bg-[#BBF7D0] rounded-md h-2 overflow-hidden">
                              <div className="h-full bg-[#10B981] rounded-md transition-[width] duration-500" style={{ width: `${percentPaid}%` }} />
                            </div>
                            <div className="flex justify-between mt-1.5 text-[11px] text-[#6B7280]">
                              <span>Início: {contract.start_date ? fmtDate(contract.start_date) : '—'}</span>
                              <span>Orçado: {fmtBRL(contract.original_total)}</span>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Next Payment Alert */}
                      {nextPayment && !editingContract && (
                        <div className={`flex items-center gap-2.5 p-3 rounded-[10px] mb-4 border ${daysUntilNext !== null && daysUntilNext <= 3 ? 'bg-[#FEF2F2] border-[#FECACA]' : 'bg-[#FFFBEB] border-[#FDE68A]'}`}>
                          <Clock size={18} color={daysUntilNext !== null && daysUntilNext <= 3 ? '#DC2626' : '#D97706'} />
                          <div className="flex-1">
                            <p className="text-[13px] font-semibold text-[#1F2937] m-0">
                              Próxima: {fmtBRL(nextPayment.amount)} em {fmtDate(nextPayment.due_date)}
                            </p>
                            <p className="text-[11px] text-[#6B7280] mt-0.5 mb-0">
                              {daysUntilNext !== null && daysUntilNext > 0 ? `${daysUntilNext} dias` : daysUntilNext === 0 ? 'HOJE!' : `Vencida há ${Math.abs(daysUntilNext!)} dias`}
                              {' · '}Parcela {nextPayment.installment_number}/{cPayments.length}
                            </p>
                          </div>
                          <button onClick={() => handleMarkPaid(nextPayment)} disabled={markingPaid === nextPayment.id}
                            className="px-3 py-1.5 rounded-lg border-none bg-[#10B981] text-white text-xs font-semibold cursor-pointer"
                            style={{ opacity: markingPaid === nextPayment.id ? 0.5 : 1 }}>
                            ✓ Paguei
                          </button>
                        </div>
                      )}

                      {/* Parcelas Timeline */}
                      {!editingContract && (
                        <div className="mb-4">
                          <h4 className="text-[13px] font-bold text-[#374151] mb-2 flex items-center gap-1.5">
                            <CreditCard size={14} /> Parcelas
                          </h4>
                          <div className="flex flex-col gap-1.5">
                            {cPayments.map(p => {
                              const isPaid = p.status === 'pago'
                              return (
                                <div key={p.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${isPaid ? 'bg-[#F0FDF4] border-[#BBF7D0]' : 'bg-[#F9FAFB] border-[#F3F4F6]'}`}>
                                  <div className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${isPaid ? 'bg-[#10B981] text-white' : 'bg-[#E5E7EB] text-[#9CA3AF]'}`}>
                                    {isPaid ? <CheckCircle2 size={14} /> : p.installment_number}
                                  </div>
                                  <div className="flex-1">
                                    <span className="text-[13px] font-semibold text-[#1F2937]">{fmtBRL(p.amount)}</span>
                                    <span className="text-[11px] text-[#6B7280] ml-2">{fmtDate(p.due_date)}</span>
                                  </div>
                                  {isPaid && <span className="text-[10px] font-semibold text-[#10B981] bg-[#DCFCE7] px-1.5 py-0.5 rounded">Pago</span>}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Budget Breakdown */}
                      {!editingContract && (
                        <>
                          <h4 className="text-[13px] font-bold text-[#374151] mb-2 flex items-center gap-1.5">
                            <FileText size={14} /> Itens do Orçamento
                          </h4>
                          {categories.map(cat => {
                            const items = cBudgetItems.filter(b => b.category === cat)
                            const catTotal = items.reduce((s, b) => s + (b.original_value || 0), 0)
                            return (
                              <div key={cat} className="mb-2 rounded-lg border border-[#F3F4F6] overflow-hidden">
                                <div className="flex justify-between px-3 py-2.5 bg-[#F9FAFB]">
                                  <span className="text-xs font-bold text-[#374151]">{cat}</span>
                                  <span className="text-xs font-bold text-[#047857]">{fmtBRL(catTotal)}</span>
                                </div>
                                {items.map(item => (
                                  <div key={item.id} className="flex justify-between px-3 py-1.5 border-t border-[#F3F4F6] text-xs">
                                    <div>
                                      <span className="text-[#1F2937]">{item.service}</span>
                                      {item.location && <span className="text-[#9CA3AF] ml-1.5">· {item.location}</span>}
                                    </div>
                                    <span className={`font-semibold shrink-0 ml-2 ${item.original_value ? 'text-[#1F2937]' : 'text-[#9CA3AF]'}`}>
                                      {item.original_value ? fmtBRL(item.original_value) : (item.notes || '—')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )
                          })}
                        </>
                      )}

                      {!editingContract && contract.notes && (
                        <p className="text-[11px] text-[#9CA3AF] italic mt-2">📝 {contract.notes}</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Quotes with contratado/pago status */}
            {contratadoQuotes.map(quote => {
              const isExpanded = expandedContract === `quote-${quote.id}`
              const amount = quote.negotiated_amount || Number(quote.amount)

              return (
                <div key={`quote-${quote.id}`} className="rounded-[14px] border border-[#D1FAE5] overflow-hidden bg-white">
                  {/* Quote Header */}
                  <button
                    onClick={() => setExpandedContract(isExpanded ? null : `quote-${quote.id}`)}
                    className="w-full flex items-center justify-between p-4 border-none cursor-pointer bg-gradient-to-br from-[#065F4615] to-[#04785715]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-sm font-bold text-[#065F46]">👷 {quote.professional?.name || 'Profissional'}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#D1FAE5] text-[#065F46] font-semibold">
                          {STATUS_CONFIG[quote.status]?.emoji} {STATUS_CONFIG[quote.status]?.label}
                        </span>
                      </div>
                      <div className="flex gap-2 text-[11px] text-[#6B7280] flex-wrap">
                        <span>{quote.description}</span>
                        {quote.payment_method && (
                          <span>
                            {PAYMENT_METHODS.find(m => m.value === quote.payment_method)?.emoji || '💳'} {PAYMENT_METHODS.find(m => m.value === quote.payment_method)?.label || quote.payment_method}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[15px] font-extrabold text-[#065F46]">{formatCurrency(amount)}</span>
                      {isExpanded ? <ChevronUp size={18} color="#9CA3AF" /> : <ChevronDown size={18} color="#9CA3AF" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 border-t border-[#E5E7EB]">
                      {/* Edit Button */}
                      <div className="flex justify-end mb-3">
                        {editingQuote === quote.id ? (
                          <div className="flex gap-1.5">
                            <button onClick={handleSaveQuote}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-md border-none bg-[#10B981] text-white text-xs font-semibold cursor-pointer">
                              <Check size={12} /> Salvar
                            </button>
                            <button onClick={() => { setEditingQuote(null); setEditQuoteForm({}) }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-md border-none bg-[#E5E7EB] text-[#6B7280] text-xs font-semibold cursor-pointer">
                              <X size={12} /> Cancelar
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => handleEditQuote(quote)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#D1D5DB] bg-white text-[#374151] text-xs font-semibold cursor-pointer">
                            <Edit3 size={12} /> Editar Orçamento
                          </button>
                        )}
                      </div>

                      {/* Editable Quote Form */}
                      {editingQuote === quote.id ? (
                        <div className="flex flex-col gap-2 mb-4 p-3.5 bg-[#F0FDF4] rounded-[10px]">
                          <div>
                            <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Descrição</label>
                            <input value={editQuoteForm.description || ''} onChange={e => setEditQuoteForm({ ...editQuoteForm, description: e.target.value })}
                              className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Valor Original</label>
                              <input type="number" value={editQuoteForm.amount || ''} onChange={e => setEditQuoteForm({ ...editQuoteForm, amount: Number(e.target.value) })}
                                className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
                            </div>
                            <div className="flex-1">
                              <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Valor Negociado</label>
                              <input type="number" value={editQuoteForm.negotiated_amount || ''} onChange={e => setEditQuoteForm({ ...editQuoteForm, negotiated_amount: Number(e.target.value) })}
                                className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Forma de Pagamento</label>
                              <select value={editQuoteForm.payment_method || ''} onChange={e => setEditQuoteForm({ ...editQuoteForm, payment_method: e.target.value })}
                                className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border">
                                <option value="">Selecione...</option>
                                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.emoji} {m.label}</option>)}
                              </select>
                            </div>
                            <div className="flex-1">
                              <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Status</label>
                              <select value={editQuoteForm.status || ''} onChange={e => setEditQuoteForm({ ...editQuoteForm, status: e.target.value as any })}
                                className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border">
                                <option value="recebido">Recebido</option>
                                <option value="avaliando">Avaliando</option>
                                <option value="aprovado">Aprovado</option>
                                <option value="contratado">Contratado</option>
                                <option value="recusado">Recusado</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Detalhes de Pagamento</label>
                            <textarea value={editQuoteForm.payment_details || ''} onChange={e => setEditQuoteForm({ ...editQuoteForm, payment_details: e.target.value })}
                              rows={2} className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Observações</label>
                            <textarea value={editQuoteForm.notes || ''} onChange={e => setEditQuoteForm({ ...editQuoteForm, notes: e.target.value })}
                              rows={2} className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Professional Info */}
                          <div className="mb-4">
                            <h4 className="text-[13px] font-bold text-[#374151] mb-2">👤 Informações do Profissional</h4>
                            <div className="flex flex-col gap-1 text-[13px] text-[#6B7280]">
                              {quote.professional?.phone && (
                                <p className="m-0">
                                  <Phone size={12} className="inline align-middle mr-1.5" />
                                  {quote.professional.phone}
                                </p>
                              )}
                              {quote.professional?.email && (
                                <p className="m-0">
                                  <Mail size={12} className="inline align-middle mr-1.5" />
                                  {quote.professional.email}
                                </p>
                              )}
                              {quote.professional?.specialty && (
                                <p className="m-0">📋 Especialidade: {quote.professional.specialty}</p>
                              )}
                              {quote.professional?.recommended_by && (
                                <p className="m-0">👤 Indicado por: {quote.professional.recommended_by}</p>
                              )}
                            </div>
                          </div>

                          {/* Payment Details */}
                          {quote.payment_method && (
                            <div className="mb-4">
                              <h4 className="text-[13px] font-bold text-[#374151] mb-2">💳 Forma de Pagamento</h4>
                              <p className="mt-0 mb-1 text-[13px] text-[#1F2937] font-semibold">
                                {PAYMENT_METHODS.find(m => m.value === quote.payment_method)?.emoji || '💳'} {PAYMENT_METHODS.find(m => m.value === quote.payment_method)?.label || quote.payment_method}
                              </p>
                              {quote.payment_details && (
                                <p className="m-0 text-xs text-[#6B7280] whitespace-pre-wrap">{quote.payment_details}</p>
                              )}
                            </div>
                          )}

                          {/* Amount Info */}
                          <div className="mb-4 p-3 bg-[#F0FDF4] rounded-lg">
                            <div className="flex justify-between text-[13px] mb-1">
                              <span className="text-[#6B7280]">Valor Original:</span>
                              <span className="text-[#1F2937] font-semibold">{formatCurrency(Number(quote.amount))}</span>
                            </div>
                            {quote.negotiated_amount && quote.negotiated_amount !== Number(quote.amount) && (
                              <div className="flex justify-between text-[13px] text-success font-semibold">
                                <span>Valor Negociado:</span>
                                <span>{formatCurrency(quote.negotiated_amount)}</span>
                              </div>
                            )}
                          </div>

                          {/* Notes */}
                          {quote.notes && (
                            <div className="mb-4">
                              <h4 className="text-[13px] font-bold text-[#374151] mb-1">📝 Observações</h4>
                              <p className="m-0 text-xs text-[#6B7280]">{quote.notes}</p>
                            </div>
                          )}

                          {/* Metadata */}
                          <div className="text-[11px] text-[#9CA3AF]">
                            Adicionado em {new Date(quote.created_at).toLocaleDateString('pt-BR')}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}


      {/* === OCR Orçamento Modal === */}
      {orcamentoFlow && (() => {
        const pro = professionals.find(p => p.id === orcamentoFlow.proId)
        const totalCalc = orcamentoFlow.editedItems.reduce((s, it) => s + (Number(it.valor_total) || 0), 0)
        return (
          <div
            className="modal-overlay items-start pt-6 pb-6 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget && !orcamentoFlow.saving && orcamentoFlow.step !== 'parsing') closeOrcamentoFlow() }}
          >
            <div className="modal-content max-w-[900px] w-[95%]">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="text-lg font-bold m-0">
                    📄 Subir Orçamento (OCR)
                  </h3>
                  <p className="text-xs text-[#6b7280] mt-1 mb-0">
                    {pro?.name} — Gemini vai ler o PDF e extrair itens e valores automaticamente
                  </p>
                </div>
                <button
                  onClick={closeOrcamentoFlow}
                  disabled={orcamentoFlow.saving || orcamentoFlow.step === 'parsing'}
                  className="bg-transparent border-none cursor-pointer p-1"
                >
                  <X size={20} color="#6b7280" />
                </button>
              </div>

              {/* Step indicator */}
              <div className="flex gap-2 mb-4">
                {(['select', 'parsing', 'review'] as const).map((s, i) => {
                  const active = orcamentoFlow.step === s
                  const done = (['select', 'parsing', 'review'] as const).indexOf(orcamentoFlow.step) > i
                  return (
                    <div key={s} className={`flex-1 h-1 rounded-sm ${active ? 'bg-[#7c3aed]' : done ? 'bg-[#a78bfa]' : 'bg-[#e5e7eb]'}`} />
                  )
                })}
              </div>

              {orcamentoFlow.error && (
                <div className="px-3 py-2.5 bg-danger-light text-[#991b1b] rounded-lg text-xs mb-3 border border-[#fecaca]">
                  ⚠️ {orcamentoFlow.error}
                </div>
              )}

              {/* STEP: SELECT FILE */}
              {orcamentoFlow.step === 'select' && (
                <div>
                  <label className={`flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-xl cursor-pointer ${orcamentoFlow.file ? 'bg-[#f0fdf4] border-[#10b981]' : 'bg-[#fafafa] border-[#d1d5db]'}`}>
                    <Upload size={32} color={orcamentoFlow.file ? '#10b981' : '#9ca3af'} />
                    <span className={`text-sm font-bold ${orcamentoFlow.file ? 'text-[#065f46]' : 'text-[#374151]'}`}>
                      {orcamentoFlow.file ? orcamentoFlow.file.name : 'Clique para selecionar o PDF do orçamento'}
                    </span>
                    {orcamentoFlow.file ? (
                      <span className="text-xs text-success">
                        {fmtFileSize(orcamentoFlow.file.size)} · pronto pra analisar
                      </span>
                    ) : (
                      <span className="text-xs text-[#6b7280]">PDF até 20MB (nativo ou escaneado)</span>
                    )}
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={e => setOrcamentoFlow({ ...orcamentoFlow, file: e.target.files?.[0] || null, error: null })}
                      className="hidden"
                    />
                  </label>
                  <div className="flex gap-2 mt-4 justify-end">
                    <button
                      onClick={closeOrcamentoFlow}
                      className="px-5 py-2.5 border border-[#e5e7eb] rounded-[10px] bg-white cursor-pointer font-semibold text-sm">
                      Cancelar
                    </button>
                    <button
                      className="btn-primary px-5 py-2.5"
                      onClick={handleParseOrcamento}
                      disabled={!orcamentoFlow.file}
                      style={{ opacity: orcamentoFlow.file ? 1 : 0.5 }}>
                      🤖 Analisar com Gemini OCR
                    </button>
                  </div>
                </div>
              )}

              {/* STEP: PARSING */}
              {orcamentoFlow.step === 'parsing' && (
                <div className="px-4 py-12 text-center">
                  <div className="text-5xl mb-4">🤖</div>
                  <h4 className="text-base font-bold mt-0 mb-2 text-[#111827]">
                    Analisando PDF com Gemini...
                  </h4>
                  <p className="text-[13px] text-[#6b7280] m-0">
                    Lendo itens, valores, datas e cômodos. Pode levar 10-30 segundos.
                  </p>
                  <div className="mt-5 h-1 bg-[#e5e7eb] rounded-sm overflow-hidden relative">
                    <div className="absolute top-0 left-0 h-full w-[30%] bg-gradient-to-r from-[#7c3aed] to-[#2563eb]" style={{
                      animation: 'progress 1.5s ease-in-out infinite',
                    }} />
                  </div>
                  <style>{`@keyframes progress { 0% { left: -30%; } 100% { left: 100%; } }`}</style>
                </div>
              )}

              {/* STEP: REVIEW */}
              {orcamentoFlow.step === 'review' && orcamentoFlow.parsed && (
                <div>
                  {/* Header: parsed metadata */}
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2 mb-3 p-3 bg-[#faf5ff] rounded-[10px] border border-[#e9d5ff]">
                    <div>
                      <p className="text-[10px] text-[#7c3aed] m-0 font-bold">CONFIANÇA</p>
                      <p className="text-[13px] mt-0.5 mb-0 font-semibold text-[#111827]">
                        {orcamentoFlow.parsed.confidence === 'alta' ? '🟢 Alta' : orcamentoFlow.parsed.confidence === 'media' ? '🟡 Média' : '🔴 Baixa'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#7c3aed] m-0 font-bold">TOTAL DECLARADO</p>
                      <p className="text-[13px] mt-0.5 mb-0 font-semibold text-[#111827]">
                        {fmtBRL(orcamentoFlow.parsed.total)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#7c3aed] m-0 font-bold">TOTAL CALCULADO</p>
                      <p className={`text-[13px] mt-0.5 mb-0 font-semibold ${totalCalc > 0 && Math.abs(totalCalc - orcamentoFlow.parsed.total) / (orcamentoFlow.parsed.total || 1) > 0.02 ? 'text-danger' : 'text-[#111827]'}`}>
                        {fmtBRL(totalCalc)}
                      </p>
                    </div>
                    {orcamentoFlow.parsed.data_orcamento && (
                      <div>
                        <p className="text-[10px] text-[#7c3aed] m-0 font-bold">DATA</p>
                        <p className="text-[13px] mt-0.5 mb-0 font-semibold text-[#111827]">
                          {orcamentoFlow.parsed.data_orcamento}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Warnings */}
                  {orcamentoFlow.parsed.warnings.length > 0 && (
                    <div className="px-3 py-2.5 bg-warning-light border border-[#fde68a] rounded-lg mb-3">
                      <p className="text-[11px] font-bold text-[#92400e] mt-0 mb-1">⚠️ Avisos do OCR</p>
                      {orcamentoFlow.parsed.warnings.map((w, i) => (
                        <p key={i} className="text-[11px] text-[#92400e] my-0.5">• {w}</p>
                      ))}
                    </div>
                  )}

                  {/* Description */}
                  <div className="mb-3">
                    <label className="text-[11px] font-bold text-[#374151] block mb-1">
                      DESCRIÇÃO DO ORÇAMENTO *
                    </label>
                    <input
                      value={orcamentoFlow.description}
                      onChange={e => setOrcamentoFlow({ ...orcamentoFlow, description: e.target.value })}
                      placeholder="Ex: Elétrica completa da cozinha"
                      className="w-full p-2.5 rounded-lg border border-[#d1d5db] text-[13px] box-border"
                    />
                  </div>

                  {/* Items table (editable) */}
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[11px] font-bold text-[#374151]">
                        ITENS EXTRAÍDOS ({orcamentoFlow.editedItems.length})
                      </label>
                      <button
                        onClick={addOrcItem}
                        className="px-2.5 py-1 text-[11px] font-semibold border border-[#7c3aed] bg-white text-[#7c3aed] rounded-md cursor-pointer">
                        + Novo Item
                      </button>
                    </div>
                    <div className="border border-[#e5e7eb] rounded-[10px] overflow-hidden max-h-[360px] overflow-y-auto">
                      {orcamentoFlow.editedItems.length === 0 ? (
                        <p className="p-4 text-center text-xs text-[#9ca3af] m-0">
                          Nenhum item extraído. Adicione manualmente.
                        </p>
                      ) : orcamentoFlow.editedItems.map((item, i) => (
                        <div key={i} className={`px-3 py-2.5 ${i < orcamentoFlow.editedItems.length - 1 ? 'border-b border-[#f3f4f6]' : ''} ${i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}`}>
                          <div className="flex gap-1.5 mb-1.5 items-start">
                            <span className="text-[10px] font-bold text-[#7c3aed] min-w-[18px] pt-2">
                              #{item.numero}
                            </span>
                            <input
                              value={item.descricao}
                              onChange={e => updateOrcItem(i, { descricao: e.target.value })}
                              placeholder="Descrição"
                              className="flex-1 px-2 py-1.5 text-xs border border-[#e5e7eb] rounded-md box-border"
                            />
                            <button
                              onClick={() => removeOrcItem(i)}
                              title="Remover"
                              className="p-1.5 border-none bg-danger-light text-danger rounded-md cursor-pointer">
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div className="grid grid-cols-[60px_70px_100px_100px_1fr_1fr] gap-1.5 ml-6">
                            <input
                              type="number"
                              step="0.01"
                              value={item.quantidade}
                              onChange={e => updateOrcItem(i, { quantidade: Number(e.target.value) || 0 })}
                              placeholder="Qtd"
                              className="p-1.5 text-[11px] border border-[#e5e7eb] rounded-md box-border"
                            />
                            <input
                              value={item.unidade ?? ''}
                              onChange={e => updateOrcItem(i, { unidade: e.target.value || null })}
                              placeholder="un"
                              className="p-1.5 text-[11px] border border-[#e5e7eb] rounded-md box-border"
                            />
                            <input
                              type="number"
                              step="0.01"
                              value={item.valor_unitario}
                              onChange={e => updateOrcItem(i, { valor_unitario: Number(e.target.value) || 0 })}
                              placeholder="V. Unit"
                              className="p-1.5 text-[11px] border border-[#e5e7eb] rounded-md box-border"
                            />
                            <input
                              type="number"
                              step="0.01"
                              value={item.valor_total}
                              onChange={e => updateOrcItem(i, { valor_total: Number(e.target.value) || 0 })}
                              placeholder="Total"
                              className="p-1.5 text-[11px] border border-[#e5e7eb] rounded-md box-border font-semibold"
                            />
                            <select
                              value={item.categoria ?? ''}
                              onChange={e => updateOrcItem(i, { categoria: e.target.value || null })}
                              className="p-1.5 text-[11px] border border-[#e5e7eb] rounded-md box-border">
                              <option value="">Categoria</option>
                              {orcCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select
                              value={item.room_id ?? ''}
                              onChange={e => updateOrcItem(i, { room_id: e.target.value || null })}
                              className="p-1.5 text-[11px] border border-[#e5e7eb] rounded-md box-border">
                              <option value="">{item.ambiente_sugerido ?? 'Cômodo'}</option>
                              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 justify-end pt-2 border-t border-[#e5e7eb]">
                    <button
                      onClick={closeOrcamentoFlow}
                      disabled={orcamentoFlow.saving}
                      className="px-5 py-2.5 border border-[#e5e7eb] rounded-[10px] bg-white cursor-pointer font-semibold text-sm">
                      Cancelar
                    </button>
                    <button
                      className="btn-primary px-5 py-2.5"
                      onClick={handleSaveOrcamento}
                      disabled={orcamentoFlow.saving || !orcamentoFlow.description.trim()}
                      style={{
                        opacity: (orcamentoFlow.saving || !orcamentoFlow.description.trim()) ? 0.6 : 1,
                      }}>
                      {orcamentoFlow.saving ? 'Salvando...' : `💾 Salvar Orçamento (${fmtBRL(totalCalc || orcamentoFlow.parsed.total)})`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

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
                    {/* Header */}
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
                        {pro.specialty && (
                          <p className="m-0 text-xs text-[#6B7280]">{pro.specialty}</p>
                        )}
                        <p className="mt-1 mb-0 text-xs text-[#9CA3AF]">
                          {proQuotes.length} orçamento{proQuotes.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {isExpanded ? <ChevronUp size={16} color="#9CA3AF" /> : <ChevronDown size={16} color="#9CA3AF" />}
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="p-3.5 border-t border-[#E5E7EB]">
                        {/* Action Row: Subir Orçamento OCR + Edit */}
                        <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
                          <button
                            onClick={() => openOrcamentoFlow(pro.id)}
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

                        {/* Editable Professional Form */}
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
                            {/* Contact Info */}
                            <div className="mb-3">
                              <h5 className="mt-0 mb-2 text-xs font-bold text-[#374151]">📞 Contato</h5>
                              {pro.phone && (
                                <p className="mt-0 mb-1 text-xs text-[#6B7280]">
                                  <Phone size={12} className="inline align-middle mr-1" />
                                  {pro.phone}
                                </p>
                              )}
                              {pro.email && (
                                <p className="mt-0 mb-1 text-xs text-[#6B7280]">
                                  <Mail size={12} className="inline align-middle mr-1" />
                                  {pro.email}
                                </p>
                              )}
                              {!pro.phone && !pro.email && (
                                <p className="m-0 text-xs text-[#9CA3AF] italic">Sem informações de contato</p>
                              )}
                            </div>

                            {/* Recommended By */}
                            {pro.recommended_by && (
                              <div className="mb-3">
                                <h5 className="mt-0 mb-1 text-xs font-bold text-[#374151]">👤 Indicado por</h5>
                                <p className="m-0 text-xs text-[#6B7280]">{pro.recommended_by}</p>
                              </div>
                            )}
                          </>
                        )}

                        {/* Notes - Editable */}
                        {!editingProfessional && (
                          <div>
                            <h5 className="mt-0 mb-1 text-xs font-bold text-[#374151]">📝 Observações</h5>
                            {editingNotes[pro.id] !== undefined ? (
                              <div className="flex gap-1.5">
                                <textarea
                                  value={editingNotes[pro.id]}
                                  onChange={e => setEditingNotes({ ...editingNotes, [pro.id]: e.target.value })}
                                  rows={2}
                                  className="flex-1 text-xs p-1.5 rounded-md border border-[#E5E7EB]"
                                />
                                <div className="flex gap-1 flex-col">
                                  <button
                                    onClick={() => handleSaveNotes(pro.id, editingNotes[pro.id])}
                                    className="px-2 py-1 rounded border-none bg-success text-white text-[11px] font-semibold cursor-pointer">
                                    <Check size={12} />
                                  </button>
                                  <button
                                    onClick={() => { const n = { ...editingNotes }; delete n[pro.id]; setEditingNotes(n) }}
                                    className="px-2 py-1 rounded border-none bg-[#E5E7EB] text-[#6B7280] text-[11px] font-semibold cursor-pointer">
                                    <X size={12} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p
                                onClick={() => setEditingNotes({ ...editingNotes, [pro.id]: pro.notes || '' })}
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
