'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Room } from '@/lib/supabase'
import type { UserID } from '@/lib/constants'
import { USERS, formatCurrency } from '@/lib/constants'
import { Plus, User, Phone, Mail, ChevronDown, ChevronUp, Trash2, Edit3, Check, X, Wrench, FileText, CreditCard, CheckCircle2, Clock, TrendingDown, Users, BookOpen, ExternalLink, Upload, File as FileIcon } from 'lucide-react'

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
}

export default function ProfessionalsPanel({ currentUser, rooms }: Props) {
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
        fetch('/api/quotes'), fetch('/api/professionals'), fetch('/api/service-categories'),
        fetch('/api/contracts'), fetch('/api/budget-items'), fetch('/api/payments'),
        fetch('/api/documents'),
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
  }, [])

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
          body: JSON.stringify({ parsed_data: parsed }),
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
        body: JSON.stringify({
          professional_id: orcamentoFlow.proId,
          description: orcamentoFlow.description || 'Orçamento',
          amount: totalCalc > 0 ? totalCalc : orcamentoFlow.parsed.total,
          status: 'avaliando',
          notes: orcamentoFlow.parsed.observacoes || null,
          itens: orcamentoFlow.editedItems,
          document_id: orcamentoFlow.documentId,
          created_by: currentUser,
        }),
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
        body: JSON.stringify({ ...newProfessional, created_by: currentUser }),
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
        body: JSON.stringify({
          ...newQuote,
          amount: parseFloat(newQuote.amount) || 0,
          service_category_id: newQuote.service_category_id || null,
          room_id: newQuote.room_id || null,
          scheduled_date: newQuote.scheduled_date || null,
          notes: newQuote.notes || null,
          created_by: currentUser,
        }),
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
      body: JSON.stringify({ status: newStatus, updated_by: currentUser }),
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
        body: JSON.stringify({
          status: paymentModal.targetStatus,
          updated_by: currentUser,
          payment_method: paymentForm.payment_method || null,
          payment_details: paymentForm.payment_details || null,
          negotiated_amount: paymentForm.negotiated_amount ? parseFloat(paymentForm.negotiated_amount) : null,
        }),
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
        body: JSON.stringify({
          action: 'delete', entity_type: 'quote', entity_id: quoteId,
          entity_description: `Orçamento "${quote?.description}" de ${quote?.professional?.name || '?'} (${fmtBRL(Number(quote?.amount || 0))}) deletado`,
          old_values: quote ? { description: quote.description, amount: quote.amount, status: quote.status, professional: quote.professional?.name } : null,
          performed_by: currentUser,
        }),
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
        body: JSON.stringify({ id: payment.id, status: 'pago', paid_date: new Date().toISOString().split('T')[0] }),
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
        body: JSON.stringify({ notes: newNotes }),
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
        body: JSON.stringify({ id: editingContract, ...editContractForm }),
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
        body: JSON.stringify({
          ...editQuoteForm,
          amount: Number(editQuoteForm.amount) || 0,
          negotiated_amount: editQuoteForm.negotiated_amount ? Number(editQuoteForm.negotiated_amount) : null,
          updated_by: currentUser,
        }),
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
        body: JSON.stringify(editProfessionalForm),
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

  if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}><p style={{ color: '#6b7280' }}>Carregando orçamentos...</p></div>

  return (
    <div>
      {/* Summary Cards */}
      <div style={{
        background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
        borderRadius: '16px', padding: '20px', marginBottom: '24px', color: 'white'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wrench size={20} />
            <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>Orçamentos</h2>
          </div>
          <span style={{ fontSize: '12px', opacity: 0.8 }}>
            {activeQuotes.length} ativo{activeQuotes.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '10px 6px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', opacity: 0.8, margin: '0 0 4px' }}>📋 Orçado</p>
            <p style={{ fontSize: '14px', fontWeight: 800, margin: 0 }}>{formatCurrency(totalOrcado)}</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '10px 6px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', opacity: 0.8, margin: '0 0 4px' }}>🤝 Contratado</p>
            <p style={{ fontSize: '14px', fontWeight: 800, margin: 0 }}>{formatCurrency(totalContratado)}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={() => setShowAddQuote(!showAddQuote)} style={{ fontSize: '14px', padding: '10px 16px' }}>
          <Plus size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
          Novo Orçamento
        </button>
        <button
          onClick={() => setShowOcrProSelect(true)}
          style={{
            fontSize: '14px', padding: '10px 16px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)', color: 'white',
            cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px',
            boxShadow: '0 2px 8px rgba(124,58,237,0.25)'
          }}
          title="Subir PDF de orçamento e extrair itens automaticamente com Gemini OCR"
        >
          📄 Subir Orçamento (OCR)
        </button>
        <button onClick={() => setShowAddProfessional(!showAddProfessional)}
          style={{ fontSize: '14px', padding: '10px 16px', border: '2px solid #e5e7eb', borderRadius: '10px', background: 'white', cursor: 'pointer' }}>
          <User size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
          Novo Profissional
        </button>
      </div>

      {/* OCR Professional Selector Modal */}
      {showOcrProSelect && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowOcrProSelect(false) }}
        >
          <div className="modal-content" style={{ maxWidth: '520px', width: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>📄 Subir Orçamento (OCR)</h3>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0' }}>
                  Escolha o profissional pra vincular o PDF. O Gemini vai ler tudo e extrair itens + valores.
                </p>
              </div>
              <button
                onClick={() => setShowOcrProSelect(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} color="#6b7280" />
              </button>
            </div>
            {professionals.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', background: '#fef3c7', borderRadius: '10px', border: '1px solid #fde68a' }}>
                <p style={{ fontSize: '14px', color: '#92400e', margin: 0, fontWeight: 600 }}>
                  Nenhum profissional cadastrado ainda.
                </p>
                <p style={{ fontSize: '12px', color: '#b45309', margin: '6px 0 0' }}>
                  Clique em &ldquo;Novo Profissional&rdquo; primeiro e volte aqui.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '8px', maxHeight: '420px', overflowY: 'auto', padding: '4px' }}>
                {professionals.map(pro => {
                  const proQuotes = quotes.filter(q => q.professional_id === pro.id)
                  return (
                    <button
                      key={pro.id}
                      onClick={() => {
                        setShowOcrProSelect(false)
                        openOrcamentoFlow(pro.id)
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: '10px',
                        background: 'white', cursor: 'pointer', textAlign: 'left', width: '100%',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.background = '#faf5ff' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'white' }}
                    >
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#111827' }}>{pro.name}</p>
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>
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
      <div style={{ marginBottom: '20px', background: 'white', borderRadius: '14px', padding: '16px', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="#7c3aed" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#111827' }}>Memoriais & Documentos</h3>
            {orcamentoDocs.length > 0 && (
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#ede9fe', color: '#7c3aed', fontWeight: 600 }}>
                {orcamentoDocs.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAddDoc(true)}
            style={{
              fontSize: '12px', padding: '6px 12px', border: '1.5px solid #7c3aed', borderRadius: '8px',
              background: 'white', color: '#7c3aed', cursor: 'pointer', fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}>
            <Upload size={13} /> Enviar PDF
          </button>
        </div>
        {orcamentoDocs.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0, padding: '12px 0', textAlign: 'center' }}>
            Nenhum memorial ou documento. Envie PDFs de escopo para solicitar orçamentos competitivos.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {orcamentoDocs.map(doc => (
              <div key={doc.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
                background: '#faf5ff', borderRadius: '10px', border: '1px solid #e9d5ff'
              }}>
                <div style={{ fontSize: '20px', flexShrink: 0 }}>📄</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {doc.title}
                  </p>
                  {doc.description && (
                    <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {doc.description}
                    </p>
                  )}
                  <p style={{ fontSize: '10px', color: '#9ca3af', margin: '2px 0 0' }}>
                    {doc.file_size ? fmtFileSize(doc.file_size) + ' · ' : ''}{USERS.find(u => u.id === doc.created_by)?.name || doc.created_by} · {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '6px 10px', borderRadius: '8px', background: '#7c3aed', color: 'white',
                      textDecoration: 'none', fontSize: '11px', fontWeight: 600, flexShrink: 0
                    }}>
                    <ExternalLink size={12} /> Abrir
                  </a>
                )}
                {(currentUser !== 'mari' || doc.created_by === 'mari') && (
                  <button
                    onClick={() => handleDeleteDoc(doc.id)}
                    title="Excluir"
                    style={{
                      padding: '6px', border: 'none', borderRadius: '8px', background: '#fee2e2',
                      color: '#dc2626', cursor: 'pointer', flexShrink: 0
                    }}>
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
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Enviar Memorial / Documento</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
              <label style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '12px',
                border: '2px dashed #d1d5db', borderRadius: '10px', cursor: 'pointer',
                background: newDoc.file ? '#f0fdf4' : '#fafafa',
                borderColor: newDoc.file ? '#10b981' : '#d1d5db',
              }}>
                <Upload size={18} color={newDoc.file ? '#10b981' : '#6b7280'} />
                <span style={{ fontSize: '13px', color: newDoc.file ? '#065f46' : '#6b7280', fontWeight: 600 }}>
                  {newDoc.file ? newDoc.file.name : 'Selecionar arquivo PDF...'}
                </span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={e => setNewDoc({ ...newDoc, file: e.target.files?.[0] || null })}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowAddDoc(false); setNewDoc({ title: '', description: '', file: null }) }}
                style={{ padding: '10px 20px', border: '1px solid #e5e7eb', borderRadius: '10px', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleUploadDoc}
                disabled={!newDoc.title.trim() || !newDoc.file || uploadingDoc}
                style={{
                  padding: '10px 20px',
                  opacity: (!newDoc.title.trim() || !newDoc.file || uploadingDoc) ? 0.5 : 1,
                }}>
                {uploadingDoc ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Toggle: Orçamentos / Profissionais */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => setShowProfessionalsList(false)}
          style={{
            padding: '8px 16px', borderRadius: '20px', border: 'none', fontSize: '13px', fontWeight: 600,
            background: !showProfessionalsList ? '#2563EB' : '#f3f4f6', color: !showProfessionalsList ? 'white' : '#6b7280',
            cursor: 'pointer', transition: 'all 0.2s'
          }}>
          <BookOpen size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          Orçamentos
        </button>
        <button
          onClick={() => setShowProfessionalsList(true)}
          style={{
            padding: '8px 16px', borderRadius: '20px', border: 'none', fontSize: '13px', fontWeight: 600,
            background: showProfessionalsList ? '#2563EB' : '#f3f4f6', color: showProfessionalsList ? 'white' : '#6b7280',
            cursor: 'pointer', transition: 'all 0.2s'
          }}>
          <Users size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          Profissionais
        </button>
      </div>

      {/* Add Professional Form */}
      {showAddProfessional && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddProfessional(false) }}>
          <div className="modal-content">
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Cadastrar Profissional</h3>
            {formError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '13px', marginBottom: '12px' }}>
                {formError}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input placeholder="Nome do profissional *" value={newProfessional.name} onChange={e => setNewProfessional({...newProfessional, name: e.target.value})} autoFocus style={{ borderColor: formError && !newProfessional.name.trim() ? '#DC2626' : undefined }} />
              <input placeholder="Telefone" type="tel" value={newProfessional.phone} onChange={e => setNewProfessional({...newProfessional, phone: e.target.value})} />
              <input placeholder="Email" type="email" value={newProfessional.email} onChange={e => setNewProfessional({...newProfessional, email: e.target.value})} />
              <input placeholder="Especialidade (ex: Eletricista, Pintor)" value={newProfessional.specialty} onChange={e => setNewProfessional({...newProfessional, specialty: e.target.value})} />
              <input placeholder="Indicado por" value={newProfessional.recommended_by} onChange={e => setNewProfessional({...newProfessional, recommended_by: e.target.value})} />
              <textarea placeholder="Observações" value={newProfessional.notes} onChange={e => setNewProfessional({...newProfessional, notes: e.target.value})} rows={2} />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowAddProfessional(false); setFormError('') }} style={{ padding: '10px 20px', border: '1px solid #e5e7eb', borderRadius: '10px', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>Cancelar</button>
              <button className="btn-primary" onClick={handleAddProfessional} disabled={saving} style={{ padding: '10px 20px', opacity: saving ? 0.6 : 1 }}>{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Quote Form */}
      {showAddQuote && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddQuote(false) }}>
          <div className="modal-content">
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Novo Orçamento</h3>
            {formError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '13px', marginBottom: '12px' }}>
                {formError}
              </div>
            )}
            {professionals.length === 0 && (
              <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', fontSize: '13px', marginBottom: '12px' }}>
                Cadastre um profissional primeiro antes de criar um orçamento.
                <button onClick={() => { setShowAddQuote(false); setShowAddProfessional(true); setFormError('') }} style={{ display: 'block', marginTop: '8px', color: '#2563EB', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '13px' }}>
                  + Cadastrar Profissional
                </button>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowAddQuote(false); setFormError('') }} style={{ padding: '10px 20px', border: '1px solid #e5e7eb', borderRadius: '10px', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>Cancelar</button>
              <button className="btn-primary" onClick={handleAddQuote} disabled={saving} style={{ padding: '10px 20px', opacity: saving ? 0.6 : 1 }}>{saving ? 'Salvando...' : 'Salvar Orçamento'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Modal */}
      {paymentModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setPaymentModal(null) }}>
          <div className="modal-content">
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
              🤝 Confirmar Contratação
            </h3>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 16px' }}>
              Como será feito o pagamento?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Payment Method Chips */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px', display: 'block' }}>Forma de Pagamento</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.value} onClick={() => setPaymentForm({ ...paymentForm, payment_method: m.value })}
                      style={{
                        padding: '8px 14px', borderRadius: '20px', border: '2px solid',
                        borderColor: paymentForm.payment_method === m.value ? '#2563EB' : '#E5E7EB',
                        background: paymentForm.payment_method === m.value ? '#DBEAFE' : 'white',
                        color: paymentForm.payment_method === m.value ? '#1D4ED8' : '#374151',
                        fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
                      }}>
                      {m.emoji} {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Negotiated Amount */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px', display: 'block' }}>
                  Valor Negociado (R$)
                </label>
                <input
                  type="number" inputMode="decimal" placeholder="Valor final negociado"
                  value={paymentForm.negotiated_amount}
                  onChange={e => setPaymentForm({ ...paymentForm, negotiated_amount: e.target.value })}
                />
                {paymentModal.currentAmount > 0 && (
                  <p style={{ fontSize: '11px', color: '#6B7280', margin: '4px 0 0' }}>
                    Valor original do orçamento: {formatCurrency(paymentModal.currentAmount)}
                  </p>
                )}
              </div>

              {/* Payment Details */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px', display: 'block' }}>
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

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button onClick={() => setPaymentModal(null)}
                style={{ padding: '10px 20px', border: '1px solid #e5e7eb', borderRadius: '10px', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handlePaymentConfirm} disabled={saving}
                style={{ padding: '10px 20px', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Salvando...' : '🤝 Contratar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!showProfessionalsList && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ minWidth: '140px' }}>
              <option value="">Todos os status</option>
              {['recebido', 'avaliando', 'aprovado', 'recusado'].map(key => (
                <option key={key} value={key}>{STATUS_CONFIG[key].emoji} {STATUS_CONFIG[key].label}</option>
              ))}
            </select>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ minWidth: '160px' }}>
              <option value="">Todos os serviços</option>
              {serviceCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>

          {/* Quotes List */}
          {filteredQuotes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👷</div>
              <h3 style={{ fontSize: '18px', color: '#374151', marginBottom: '8px' }}>Nenhum orçamento ainda</h3>
              <p style={{ color: '#6b7280' }}>Adicione profissionais e orçamentos para controlar os custos da reforma!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredQuotes.map(quote => {
                const statusCfg = STATUS_CONFIG[quote.status] || STATUS_CONFIG.recebido
                const isExpanded = expandedQuote === quote.id
                const currentIdx = STATUS_FLOW.indexOf(quote.status)
                const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null
                const userColor = USERS.find(u => u.id === quote.created_by)?.color || '#6b7280'

                return (
                  <div key={quote.id} className="card" style={{ padding: '16px', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                            background: statusCfg.bg, color: statusCfg.color
                          }}>
                            {statusCfg.emoji} {statusCfg.label}
                          </span>
                          {quote.service_category && (
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                              {quote.service_category.icon} {quote.service_category.name}
                            </span>
                          )}
                          {quote.room && (
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                              📍 {quote.room.name}
                            </span>
                          )}
                        </div>
                        <h4 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px', color: '#1f2937' }}>
                          {quote.description}
                        </h4>
                        <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                          <User size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                          {quote.professional?.name || 'Profissional'}
                          {quote.professional?.phone && (
                            <span style={{ marginLeft: '8px' }}>
                              <Phone size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} />
                              {quote.professional.phone}
                            </span>
                          )}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: '15px', fontWeight: 800, color: '#1f2937', margin: '0 0 4px' }}>
                          {formatCurrency(Number(quote.amount))}
                        </p>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                          <select
                            value={quote.status}
                            onChange={e => handleStatusChange(quote.id, e.target.value)}
                            style={{
                              padding: '5px 8px', borderRadius: '8px', border: '1px solid #E5E7EB', cursor: 'pointer',
                              background: statusCfg.bg, color: statusCfg.color,
                              fontSize: '12px', fontWeight: 600, appearance: 'auto',
                            }}
                          >
                            {Object.entries(STATUS_CONFIG)
                              .filter(([key]) => key !== 'pago')
                              .map(([key, cfg]) => (
                              <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
                            ))}
                          </select>
                          <button onClick={() => setExpandedQuote(isExpanded ? null : quote.id)}
                            style={{ padding: '4px 8px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#f3f4f6' }}>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6', fontSize: '13px', color: '#6b7280' }}>
                        {quote.payment_method && (
                          <p style={{ margin: '0 0 8px' }}>
                            {PAYMENT_METHODS.find(m => m.value === quote.payment_method)?.emoji || '💳'}{' '}
                            Pagamento: <strong style={{ color: '#1F2937' }}>{PAYMENT_METHODS.find(m => m.value === quote.payment_method)?.label || quote.payment_method}</strong>
                            {quote.payment_details && <span> — {quote.payment_details}</span>}
                          </p>
                        )}
                        {quote.negotiated_amount && quote.negotiated_amount !== Number(quote.amount) && (
                          <p style={{ margin: '0 0 8px', color: '#059669' }}>
                            💰 Valor negociado: <strong>{formatCurrency(quote.negotiated_amount)}</strong>
                            <span style={{ fontSize: '11px', marginLeft: '6px', textDecoration: 'line-through', color: '#9CA3AF' }}>{formatCurrency(Number(quote.amount))}</span>
                          </p>
                        )}
                        {quote.notes && <p style={{ margin: '0 0 8px' }}>📝 {quote.notes}</p>}
                        {quote.scheduled_date && <p style={{ margin: '0 0 8px' }}>📅 Previsão: {new Date(quote.scheduled_date).toLocaleDateString('pt-BR')}</p>}
                        {quote.paid_date && <p style={{ margin: '0 0 8px' }}>💰 Pago em: {new Date(quote.paid_date).toLocaleDateString('pt-BR')}</p>}
                        {quote.professional?.email && <p style={{ margin: '0 0 8px' }}><Mail size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {quote.professional.email}</p>}
                        {quote.professional?.recommended_by && <p style={{ margin: '0 0 8px' }}>👤 Indicado por: {quote.professional.recommended_by}</p>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                          <span style={{ fontSize: '11px' }}>
                            Adicionado por <span style={{ color: userColor, fontWeight: 600 }}>{USERS.find(u => u.id === quote.created_by)?.name || quote.created_by}</span>
                            {' em '}{new Date(quote.created_at).toLocaleDateString('pt-BR')}
                          </span>
                          <button onClick={() => handleDeleteQuote(quote.id)}
                            style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#fee2e2', color: '#dc2626', fontSize: '12px' }}>
                            <Trash2 size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
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
        <div style={{ marginTop: '28px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#374151', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} /> Contratos Fechados
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                <div key={contract.id} style={{ borderRadius: '14px', border: '1px solid #D1FAE5', overflow: 'hidden', background: 'white' }}>
                  {/* Contract Header */}
                  <button
                    onClick={() => setExpandedContract(isExpanded ? null : contract.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '16px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #065F4615, #04785715)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#065F46' }}>👷 {contract.professional}</span>
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '6px', background: '#D1FAE5', color: '#065F46', fontWeight: 600 }}>
                          🤝 Contratado
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#6B7280', flexWrap: 'wrap' }}>
                        <span>Fechado: {fmtBRL(contract.negotiated_total)}</span>
                        <span style={{ color: '#059669' }}>
                          <TrendingDown size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {fmtBRL(economia)}
                        </span>
                        <span>Pago: {percentPaid}%</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#065F46' }}>{fmtBRL(contract.negotiated_total)}</span>
                      {isExpanded ? <ChevronUp size={18} color="#9CA3AF" /> : <ChevronDown size={18} color="#9CA3AF" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div style={{ padding: '16px' }}>
                      {/* Edit Button */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                        {editingContract === contract.id ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={handleSaveContract}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#10B981', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                              <Check size={12} /> Salvar
                            </button>
                            <button onClick={() => { setEditingContract(null); setEditContractForm({}) }}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#E5E7EB', color: '#6B7280', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                              <X size={12} /> Cancelar
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => handleEditContract(contract)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', background: 'white', color: '#374151', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                            <Edit3 size={12} /> Editar Contrato
                          </button>
                        )}
                      </div>

                      {/* Contract Details - Editable */}
                      {editingContract === contract.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', padding: '14px', background: '#F0FDF4', borderRadius: '10px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '2px' }}>Profissional</label>
                              <input value={editContractForm.professional || ''} onChange={e => setEditContractForm({ ...editContractForm, professional: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '2px' }}>Função</label>
                              <input value={editContractForm.role || ''} onChange={e => setEditContractForm({ ...editContractForm, role: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '2px' }}>Valor Original</label>
                              <input type="number" value={editContractForm.original_total || ''} onChange={e => setEditContractForm({ ...editContractForm, original_total: Number(e.target.value) })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '2px' }}>Valor Negociado</label>
                              <input type="number" value={editContractForm.negotiated_total || ''} onChange={e => setEditContractForm({ ...editContractForm, negotiated_total: Number(e.target.value) })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '2px' }}>Início</label>
                              <input type="date" value={editContractForm.start_date || ''} onChange={e => setEditContractForm({ ...editContractForm, start_date: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '2px' }}>1º Pagamento</label>
                              <input type="date" value={editContractForm.first_payment_date || ''} onChange={e => setEditContractForm({ ...editContractForm, first_payment_date: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }} />
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '2px' }}>Observações</label>
                            <textarea value={editContractForm.notes || ''} onChange={e => setEditContractForm({ ...editContractForm, notes: e.target.value })}
                              rows={2} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }} />
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Payment Progress */}
                          <div style={{ background: '#F0FDF4', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#065F46' }}>Progresso de Pagamento</span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#065F46' }}>{fmtBRL(totalPaidC)} / {fmtBRL(contract.negotiated_total)}</span>
                            </div>
                            <div style={{ background: '#BBF7D0', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
                              <div style={{ width: `${percentPaid}%`, height: '100%', background: '#10B981', borderRadius: '6px', transition: 'width 0.5s' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: '#6B7280' }}>
                              <span>Início: {contract.start_date ? fmtDate(contract.start_date) : '—'}</span>
                              <span>Orçado: {fmtBRL(contract.original_total)}</span>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Next Payment Alert */}
                      {nextPayment && !editingContract && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '10px', marginBottom: '16px',
                          background: daysUntilNext !== null && daysUntilNext <= 3 ? '#FEF2F2' : '#FFFBEB',
                          border: `1px solid ${daysUntilNext !== null && daysUntilNext <= 3 ? '#FECACA' : '#FDE68A'}`,
                        }}>
                          <Clock size={18} color={daysUntilNext !== null && daysUntilNext <= 3 ? '#DC2626' : '#D97706'} />
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                              Próxima: {fmtBRL(nextPayment.amount)} em {fmtDate(nextPayment.due_date)}
                            </p>
                            <p style={{ fontSize: '11px', color: '#6B7280', margin: '2px 0 0' }}>
                              {daysUntilNext !== null && daysUntilNext > 0 ? `${daysUntilNext} dias` : daysUntilNext === 0 ? 'HOJE!' : `Vencida há ${Math.abs(daysUntilNext!)} dias`}
                              {' · '}Parcela {nextPayment.installment_number}/{cPayments.length}
                            </p>
                          </div>
                          <button onClick={() => handleMarkPaid(nextPayment)} disabled={markingPaid === nextPayment.id}
                            style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#10B981', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer', opacity: markingPaid === nextPayment.id ? 0.5 : 1 }}>
                            ✓ Paguei
                          </button>
                        </div>
                      )}

                      {/* Parcelas Timeline */}
                      {!editingContract && (
                        <div style={{ marginBottom: '16px' }}>
                          <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CreditCard size={14} /> Parcelas
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {cPayments.map(p => {
                              const isPaid = p.status === 'pago'
                              return (
                                <div key={p.id} style={{
                                  display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px',
                                  background: isPaid ? '#F0FDF4' : '#F9FAFB', border: `1px solid ${isPaid ? '#BBF7D0' : '#F3F4F6'}`,
                                }}>
                                  <div style={{
                                    width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: isPaid ? '#10B981' : '#E5E7EB', color: isPaid ? 'white' : '#9CA3AF', fontSize: '11px', fontWeight: 700, flexShrink: 0,
                                  }}>
                                    {isPaid ? <CheckCircle2 size={14} /> : p.installment_number}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937' }}>{fmtBRL(p.amount)}</span>
                                    <span style={{ fontSize: '11px', color: '#6B7280', marginLeft: '8px' }}>{fmtDate(p.due_date)}</span>
                                  </div>
                                  {isPaid && <span style={{ fontSize: '10px', fontWeight: 600, color: '#10B981', background: '#DCFCE7', padding: '2px 6px', borderRadius: '4px' }}>Pago</span>}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Budget Breakdown */}
                      {!editingContract && (
                        <>
                          <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FileText size={14} /> Itens do Orçamento
                          </h4>
                          {categories.map(cat => {
                            const items = cBudgetItems.filter(b => b.category === cat)
                            const catTotal = items.reduce((s, b) => s + (b.original_value || 0), 0)
                            return (
                              <div key={cat} style={{ marginBottom: '8px', borderRadius: '8px', border: '1px solid #F3F4F6', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#F9FAFB' }}>
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>{cat}</span>
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#047857' }}>{fmtBRL(catTotal)}</span>
                                </div>
                                {items.map(item => (
                                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', borderTop: '1px solid #F3F4F6', fontSize: '12px' }}>
                                    <div>
                                      <span style={{ color: '#1F2937' }}>{item.service}</span>
                                      {item.location && <span style={{ color: '#9CA3AF', marginLeft: '6px' }}>· {item.location}</span>}
                                    </div>
                                    <span style={{ fontWeight: 600, color: item.original_value ? '#1F2937' : '#9CA3AF', flexShrink: 0, marginLeft: '8px' }}>
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
                        <p style={{ fontSize: '11px', color: '#9CA3AF', fontStyle: 'italic', marginTop: '8px' }}>📝 {contract.notes}</p>
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
                <div key={`quote-${quote.id}`} style={{ borderRadius: '14px', border: '1px solid #D1FAE5', overflow: 'hidden', background: 'white' }}>
                  {/* Quote Header */}
                  <button
                    onClick={() => setExpandedContract(isExpanded ? null : `quote-${quote.id}`)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '16px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #065F4615, #04785715)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#065F46' }}>👷 {quote.professional?.name || 'Profissional'}</span>
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '6px', background: '#D1FAE5', color: '#065F46', fontWeight: 600 }}>
                          {STATUS_CONFIG[quote.status]?.emoji} {STATUS_CONFIG[quote.status]?.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#6B7280', flexWrap: 'wrap' }}>
                        <span>{quote.description}</span>
                        {quote.payment_method && (
                          <span>
                            {PAYMENT_METHODS.find(m => m.value === quote.payment_method)?.emoji || '💳'} {PAYMENT_METHODS.find(m => m.value === quote.payment_method)?.label || quote.payment_method}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#065F46' }}>{formatCurrency(amount)}</span>
                      {isExpanded ? <ChevronUp size={18} color="#9CA3AF" /> : <ChevronDown size={18} color="#9CA3AF" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div style={{ padding: '16px', borderTop: '1px solid #E5E7EB' }}>
                      {/* Edit Button */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                        {editingQuote === quote.id ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={handleSaveQuote}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#10B981', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                              <Check size={12} /> Salvar
                            </button>
                            <button onClick={() => { setEditingQuote(null); setEditQuoteForm({}) }}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#E5E7EB', color: '#6B7280', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                              <X size={12} /> Cancelar
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => handleEditQuote(quote)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', background: 'white', color: '#374151', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                            <Edit3 size={12} /> Editar Orçamento
                          </button>
                        )}
                      </div>

                      {/* Editable Quote Form */}
                      {editingQuote === quote.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', padding: '14px', background: '#F0FDF4', borderRadius: '10px' }}>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '2px' }}>Descrição</label>
                            <input value={editQuoteForm.description || ''} onChange={e => setEditQuoteForm({ ...editQuoteForm, description: e.target.value })}
                              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }} />
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '2px' }}>Valor Original</label>
                              <input type="number" value={editQuoteForm.amount || ''} onChange={e => setEditQuoteForm({ ...editQuoteForm, amount: Number(e.target.value) })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '2px' }}>Valor Negociado</label>
                              <input type="number" value={editQuoteForm.negotiated_amount || ''} onChange={e => setEditQuoteForm({ ...editQuoteForm, negotiated_amount: Number(e.target.value) })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '2px' }}>Forma de Pagamento</label>
                              <select value={editQuoteForm.payment_method || ''} onChange={e => setEditQuoteForm({ ...editQuoteForm, payment_method: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }}>
                                <option value="">Selecione...</option>
                                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.emoji} {m.label}</option>)}
                              </select>
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '2px' }}>Status</label>
                              <select value={editQuoteForm.status || ''} onChange={e => setEditQuoteForm({ ...editQuoteForm, status: e.target.value as any })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }}>
                                <option value="recebido">Recebido</option>
                                <option value="avaliando">Avaliando</option>
                                <option value="aprovado">Aprovado</option>
                                <option value="contratado">Contratado</option>
                                <option value="recusado">Recusado</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '2px' }}>Detalhes de Pagamento</label>
                            <textarea value={editQuoteForm.payment_details || ''} onChange={e => setEditQuoteForm({ ...editQuoteForm, payment_details: e.target.value })}
                              rows={2} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '2px' }}>Observações</label>
                            <textarea value={editQuoteForm.notes || ''} onChange={e => setEditQuoteForm({ ...editQuoteForm, notes: e.target.value })}
                              rows={2} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }} />
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Professional Info */}
                          <div style={{ marginBottom: '16px' }}>
                            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>👤 Informações do Profissional</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: '#6B7280' }}>
                              {quote.professional?.phone && (
                                <p style={{ margin: 0 }}>
                                  <Phone size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                                  {quote.professional.phone}
                                </p>
                              )}
                              {quote.professional?.email && (
                                <p style={{ margin: 0 }}>
                                  <Mail size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                                  {quote.professional.email}
                                </p>
                              )}
                              {quote.professional?.specialty && (
                                <p style={{ margin: 0 }}>📋 Especialidade: {quote.professional.specialty}</p>
                              )}
                              {quote.professional?.recommended_by && (
                                <p style={{ margin: 0 }}>👤 Indicado por: {quote.professional.recommended_by}</p>
                              )}
                            </div>
                          </div>

                          {/* Payment Details */}
                          {quote.payment_method && (
                            <div style={{ marginBottom: '16px' }}>
                              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>💳 Forma de Pagamento</h4>
                              <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#1F2937', fontWeight: 600 }}>
                                {PAYMENT_METHODS.find(m => m.value === quote.payment_method)?.emoji || '💳'} {PAYMENT_METHODS.find(m => m.value === quote.payment_method)?.label || quote.payment_method}
                              </p>
                              {quote.payment_details && (
                                <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', whiteSpace: 'pre-wrap' }}>{quote.payment_details}</p>
                              )}
                            </div>
                          )}

                          {/* Amount Info */}
                          <div style={{ marginBottom: '16px', padding: '12px', background: '#F0FDF4', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                              <span style={{ color: '#6B7280' }}>Valor Original:</span>
                              <span style={{ color: '#1F2937', fontWeight: 600 }}>{formatCurrency(Number(quote.amount))}</span>
                            </div>
                            {quote.negotiated_amount && quote.negotiated_amount !== Number(quote.amount) && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#059669', fontWeight: 600 }}>
                                <span>Valor Negociado:</span>
                                <span>{formatCurrency(quote.negotiated_amount)}</span>
                              </div>
                            )}
                          </div>

                          {/* Notes */}
                          {quote.notes && (
                            <div style={{ marginBottom: '16px' }}>
                              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>📝 Observações</h4>
                              <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>{quote.notes}</p>
                            </div>
                          )}

                          {/* Metadata */}
                          <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
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
            className="modal-overlay"
            onClick={(e) => { if (e.target === e.currentTarget && !orcamentoFlow.saving && orcamentoFlow.step !== 'parsing') closeOrcamentoFlow() }}
            style={{ alignItems: 'flex-start', paddingTop: '24px', paddingBottom: '24px', overflowY: 'auto' }}
          >
            <div className="modal-content" style={{ maxWidth: '900px', width: '95%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                    📄 Subir Orçamento (OCR)
                  </h3>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0' }}>
                    {pro?.name} — Gemini vai ler o PDF e extrair itens e valores automaticamente
                  </p>
                </div>
                <button
                  onClick={closeOrcamentoFlow}
                  disabled={orcamentoFlow.saving || orcamentoFlow.step === 'parsing'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} color="#6b7280" />
                </button>
              </div>

              {/* Step indicator */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {(['select', 'parsing', 'review'] as const).map((s, i) => {
                  const active = orcamentoFlow.step === s
                  const done = (['select', 'parsing', 'review'] as const).indexOf(orcamentoFlow.step) > i
                  return (
                    <div key={s} style={{
                      flex: 1, height: '4px', borderRadius: '2px',
                      background: active ? '#7c3aed' : done ? '#a78bfa' : '#e5e7eb',
                    }} />
                  )
                })}
              </div>

              {orcamentoFlow.error && (
                <div style={{
                  padding: '10px 12px', background: '#fee2e2', color: '#991b1b',
                  borderRadius: '8px', fontSize: '12px', marginBottom: '12px', border: '1px solid #fecaca',
                }}>
                  ⚠️ {orcamentoFlow.error}
                </div>
              )}

              {/* STEP: SELECT FILE */}
              {orcamentoFlow.step === 'select' && (
                <div>
                  <label style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: '8px', padding: '32px', border: '2px dashed #d1d5db', borderRadius: '12px',
                    cursor: 'pointer',
                    background: orcamentoFlow.file ? '#f0fdf4' : '#fafafa',
                    borderColor: orcamentoFlow.file ? '#10b981' : '#d1d5db',
                  }}>
                    <Upload size={32} color={orcamentoFlow.file ? '#10b981' : '#9ca3af'} />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: orcamentoFlow.file ? '#065f46' : '#374151' }}>
                      {orcamentoFlow.file ? orcamentoFlow.file.name : 'Clique para selecionar o PDF do orçamento'}
                    </span>
                    {orcamentoFlow.file ? (
                      <span style={{ fontSize: '12px', color: '#059669' }}>
                        {fmtFileSize(orcamentoFlow.file.size)} · pronto pra analisar
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>PDF até 20MB (nativo ou escaneado)</span>
                    )}
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={e => setOrcamentoFlow({ ...orcamentoFlow, file: e.target.files?.[0] || null, error: null })}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={closeOrcamentoFlow}
                      style={{ padding: '10px 20px', border: '1px solid #e5e7eb', borderRadius: '10px', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                      Cancelar
                    </button>
                    <button
                      className="btn-primary"
                      onClick={handleParseOrcamento}
                      disabled={!orcamentoFlow.file}
                      style={{ padding: '10px 20px', opacity: orcamentoFlow.file ? 1 : 0.5 }}>
                      🤖 Analisar com Gemini OCR
                    </button>
                  </div>
                </div>
              )}

              {/* STEP: PARSING */}
              {orcamentoFlow.step === 'parsing' && (
                <div style={{ padding: '48px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px', color: '#111827' }}>
                    Analisando PDF com Gemini...
                  </h4>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                    Lendo itens, valores, datas e cômodos. Pode levar 10-30 segundos.
                  </p>
                  <div style={{
                    marginTop: '20px', height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden', position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute', top: 0, left: 0, height: '100%', width: '30%',
                      background: 'linear-gradient(90deg, #7c3aed, #2563eb)',
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
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '8px', marginBottom: '12px', padding: '12px', background: '#faf5ff',
                    borderRadius: '10px', border: '1px solid #e9d5ff',
                  }}>
                    <div>
                      <p style={{ fontSize: '10px', color: '#7c3aed', margin: 0, fontWeight: 700 }}>CONFIANÇA</p>
                      <p style={{ fontSize: '13px', margin: '2px 0 0', fontWeight: 600, color: '#111827' }}>
                        {orcamentoFlow.parsed.confidence === 'alta' ? '🟢 Alta' : orcamentoFlow.parsed.confidence === 'media' ? '🟡 Média' : '🔴 Baixa'}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '10px', color: '#7c3aed', margin: 0, fontWeight: 700 }}>TOTAL DECLARADO</p>
                      <p style={{ fontSize: '13px', margin: '2px 0 0', fontWeight: 600, color: '#111827' }}>
                        {fmtBRL(orcamentoFlow.parsed.total)}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '10px', color: '#7c3aed', margin: 0, fontWeight: 700 }}>TOTAL CALCULADO</p>
                      <p style={{ fontSize: '13px', margin: '2px 0 0', fontWeight: 600, color: totalCalc > 0 && Math.abs(totalCalc - orcamentoFlow.parsed.total) / (orcamentoFlow.parsed.total || 1) > 0.02 ? '#dc2626' : '#111827' }}>
                        {fmtBRL(totalCalc)}
                      </p>
                    </div>
                    {orcamentoFlow.parsed.data_orcamento && (
                      <div>
                        <p style={{ fontSize: '10px', color: '#7c3aed', margin: 0, fontWeight: 700 }}>DATA</p>
                        <p style={{ fontSize: '13px', margin: '2px 0 0', fontWeight: 600, color: '#111827' }}>
                          {orcamentoFlow.parsed.data_orcamento}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Warnings */}
                  {orcamentoFlow.parsed.warnings.length > 0 && (
                    <div style={{
                      padding: '10px 12px', background: '#fef3c7', border: '1px solid #fde68a',
                      borderRadius: '8px', marginBottom: '12px',
                    }}>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#92400e', margin: '0 0 4px' }}>⚠️ Avisos do OCR</p>
                      {orcamentoFlow.parsed.warnings.map((w, i) => (
                        <p key={i} style={{ fontSize: '11px', color: '#92400e', margin: '2px 0' }}>• {w}</p>
                      ))}
                    </div>
                  )}

                  {/* Description */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                      DESCRIÇÃO DO ORÇAMENTO *
                    </label>
                    <input
                      value={orcamentoFlow.description}
                      onChange={e => setOrcamentoFlow({ ...orcamentoFlow, description: e.target.value })}
                      placeholder="Ex: Elétrica completa da cozinha"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* Items table (editable) */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151' }}>
                        ITENS EXTRAÍDOS ({orcamentoFlow.editedItems.length})
                      </label>
                      <button
                        onClick={addOrcItem}
                        style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 600, border: '1px solid #7c3aed', background: 'white', color: '#7c3aed', borderRadius: '6px', cursor: 'pointer' }}>
                        + Novo Item
                      </button>
                    </div>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden', maxHeight: '360px', overflowY: 'auto' }}>
                      {orcamentoFlow.editedItems.length === 0 ? (
                        <p style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#9ca3af', margin: 0 }}>
                          Nenhum item extraído. Adicione manualmente.
                        </p>
                      ) : orcamentoFlow.editedItems.map((item, i) => (
                        <div key={i} style={{
                          padding: '10px 12px',
                          borderBottom: i < orcamentoFlow.editedItems.length - 1 ? '1px solid #f3f4f6' : 'none',
                          background: i % 2 === 0 ? 'white' : '#fafafa',
                        }}>
                          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#7c3aed', minWidth: '18px', paddingTop: '8px' }}>
                              #{item.numero}
                            </span>
                            <input
                              value={item.descricao}
                              onChange={e => updateOrcItem(i, { descricao: e.target.value })}
                              placeholder="Descrição"
                              style={{ flex: 1, padding: '6px 8px', fontSize: '12px', border: '1px solid #e5e7eb', borderRadius: '6px', boxSizing: 'border-box' }}
                            />
                            <button
                              onClick={() => removeOrcItem(i)}
                              title="Remover"
                              style={{ padding: '6px', border: 'none', background: '#fee2e2', color: '#dc2626', borderRadius: '6px', cursor: 'pointer' }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '60px 70px 100px 100px 1fr 1fr', gap: '6px', marginLeft: '24px' }}>
                            <input
                              type="number"
                              step="0.01"
                              value={item.quantidade}
                              onChange={e => updateOrcItem(i, { quantidade: Number(e.target.value) || 0 })}
                              placeholder="Qtd"
                              style={{ padding: '6px', fontSize: '11px', border: '1px solid #e5e7eb', borderRadius: '6px', boxSizing: 'border-box' }}
                            />
                            <input
                              value={item.unidade ?? ''}
                              onChange={e => updateOrcItem(i, { unidade: e.target.value || null })}
                              placeholder="un"
                              style={{ padding: '6px', fontSize: '11px', border: '1px solid #e5e7eb', borderRadius: '6px', boxSizing: 'border-box' }}
                            />
                            <input
                              type="number"
                              step="0.01"
                              value={item.valor_unitario}
                              onChange={e => updateOrcItem(i, { valor_unitario: Number(e.target.value) || 0 })}
                              placeholder="V. Unit"
                              style={{ padding: '6px', fontSize: '11px', border: '1px solid #e5e7eb', borderRadius: '6px', boxSizing: 'border-box' }}
                            />
                            <input
                              type="number"
                              step="0.01"
                              value={item.valor_total}
                              onChange={e => updateOrcItem(i, { valor_total: Number(e.target.value) || 0 })}
                              placeholder="Total"
                              style={{ padding: '6px', fontSize: '11px', border: '1px solid #e5e7eb', borderRadius: '6px', boxSizing: 'border-box', fontWeight: 600 }}
                            />
                            <select
                              value={item.categoria ?? ''}
                              onChange={e => updateOrcItem(i, { categoria: e.target.value || null })}
                              style={{ padding: '6px', fontSize: '11px', border: '1px solid #e5e7eb', borderRadius: '6px', boxSizing: 'border-box' }}>
                              <option value="">Categoria</option>
                              {orcCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select
                              value={item.room_id ?? ''}
                              onChange={e => updateOrcItem(i, { room_id: e.target.value || null })}
                              style={{ padding: '6px', fontSize: '11px', border: '1px solid #e5e7eb', borderRadius: '6px', boxSizing: 'border-box' }}>
                              <option value="">{item.ambiente_sugerido ?? 'Cômodo'}</option>
                              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                    <button
                      onClick={closeOrcamentoFlow}
                      disabled={orcamentoFlow.saving}
                      style={{ padding: '10px 20px', border: '1px solid #e5e7eb', borderRadius: '10px', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                      Cancelar
                    </button>
                    <button
                      className="btn-primary"
                      onClick={handleSaveOrcamento}
                      disabled={orcamentoFlow.saving || !orcamentoFlow.description.trim()}
                      style={{
                        padding: '10px 20px',
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
        <div style={{ marginTop: '28px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#374151', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} /> Profissionais Cadastrados
          </h3>
          {professionals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
              <h3 style={{ fontSize: '18px', color: '#374151', marginBottom: '8px' }}>Nenhum profissional cadastrado</h3>
              <p style={{ color: '#6b7280' }}>Comece adicionando profissionais para seus orçamentos.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
              {professionals.map(pro => {
                const isExpanded = expandedProfessional === pro.id
                const status = getProfessionalStatus(pro.id)
                const proQuotes = quotes.filter(q => q.professional_id === pro.id)

                return (
                  <div key={pro.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {/* Header */}
                    <div
                      onClick={() => setExpandedProfessional(isExpanded ? null : pro.id)}
                      style={{
                        padding: '14px', cursor: 'pointer', background: '#F9FAFB', borderBottom: isExpanded ? '1px solid #E5E7EB' : 'none',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1F2937' }}>{pro.name}</h4>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: '#E5E7EB', color: '#374151', fontWeight: 600 }}>
                            {status.emoji} {status.status}
                          </span>
                        </div>
                        {pro.specialty && (
                          <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>{pro.specialty}</p>
                        )}
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9CA3AF' }}>
                          {proQuotes.length} orçamento{proQuotes.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {isExpanded ? <ChevronUp size={16} color="#9CA3AF" /> : <ChevronDown size={16} color="#9CA3AF" />}
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div style={{ padding: '14px', borderTop: '1px solid #E5E7EB' }}>
                        {/* Action Row: Subir Orçamento OCR + Edit */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => openOrcamentoFlow(pro.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px',
                              border: 'none', background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
                              color: 'white', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(124, 58, 237, 0.2)',
                            }}>
                            <Upload size={13} /> Subir Orçamento (OCR)
                          </button>
                          {editingProfessional === pro.id ? (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={handleSaveProfessional}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#10B981', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                <Check size={12} /> Salvar
                              </button>
                              <button onClick={() => { setEditingProfessional(null); setEditProfessionalForm({}) }}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#E5E7EB', color: '#6B7280', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                <X size={12} /> Cancelar
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => handleEditProfessional(pro)}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', background: 'white', color: '#374151', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                              <Edit3 size={12} /> Editar
                            </button>
                          )}
                        </div>

                        {/* Editable Professional Form */}
                        {editingProfessional === pro.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', padding: '12px', background: '#F0FDF4', borderRadius: '10px' }}>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '2px' }}>Nome</label>
                              <input value={editProfessionalForm.name || ''} onChange={e => setEditProfessionalForm({ ...editProfessionalForm, name: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '2px' }}>Telefone</label>
                              <input value={editProfessionalForm.phone || ''} onChange={e => setEditProfessionalForm({ ...editProfessionalForm, phone: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '2px' }}>Email</label>
                              <input type="email" value={editProfessionalForm.email || ''} onChange={e => setEditProfessionalForm({ ...editProfessionalForm, email: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '2px' }}>Especialidade</label>
                              <input value={editProfessionalForm.specialty || ''} onChange={e => setEditProfessionalForm({ ...editProfessionalForm, specialty: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '2px' }}>Indicado por</label>
                              <input value={editProfessionalForm.recommended_by || ''} onChange={e => setEditProfessionalForm({ ...editProfessionalForm, recommended_by: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }} />
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Contact Info */}
                            <div style={{ marginBottom: '12px' }}>
                              <h5 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: '#374151' }}>📞 Contato</h5>
                              {pro.phone && (
                                <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#6B7280' }}>
                                  <Phone size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                                  {pro.phone}
                                </p>
                              )}
                              {pro.email && (
                                <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#6B7280' }}>
                                  <Mail size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                                  {pro.email}
                                </p>
                              )}
                              {!pro.phone && !pro.email && (
                                <p style={{ margin: 0, fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic' }}>Sem informações de contato</p>
                              )}
                            </div>

                            {/* Recommended By */}
                            {pro.recommended_by && (
                              <div style={{ marginBottom: '12px' }}>
                                <h5 style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 700, color: '#374151' }}>👤 Indicado por</h5>
                                <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>{pro.recommended_by}</p>
                              </div>
                            )}
                          </>
                        )}

                        {/* Notes - Editable */}
                        {!editingProfessional && (
                          <div>
                            <h5 style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 700, color: '#374151' }}>📝 Observações</h5>
                            {editingNotes[pro.id] !== undefined ? (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <textarea
                                  value={editingNotes[pro.id]}
                                  onChange={e => setEditingNotes({ ...editingNotes, [pro.id]: e.target.value })}
                                  rows={2}
                                  style={{ flex: 1, fontSize: '12px', padding: '6px', borderRadius: '6px', border: '1px solid #E5E7EB' }}
                                />
                                <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
                                  <button
                                    onClick={() => handleSaveNotes(pro.id, editingNotes[pro.id])}
                                    style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: '#059669', color: 'white', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                                    <Check size={12} />
                                  </button>
                                  <button
                                    onClick={() => { const n = { ...editingNotes }; delete n[pro.id]; setEditingNotes(n) }}
                                    style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: '#E5E7EB', color: '#6B7280', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                                    <X size={12} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p
                                onClick={() => setEditingNotes({ ...editingNotes, [pro.id]: pro.notes || '' })}
                                style={{
                                  margin: 0, fontSize: '12px', color: pro.notes ? '#6B7280' : '#9CA3AF', fontStyle: pro.notes ? 'normal' : 'italic',
                                  cursor: 'pointer', padding: '6px', borderRadius: '4px', background: '#F9FAFB'
                                }}>
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
