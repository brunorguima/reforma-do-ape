'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Upload, FileText, Loader2, Check, AlertCircle, Trash2, CreditCard, Plus } from 'lucide-react'
import { USERS, type UserID } from '@/lib/constants'
import PaymentMethodsModal, { type PaymentMethod, type PaymentMethodKind } from './PaymentMethodsModal'

const MATERIAL_CATEGORIES: { id: string; label: string; emoji: string }[] = [
  { id: 'eletrica', label: 'Elétrica', emoji: '⚡' },
  { id: 'hidraulica', label: 'Hidráulica', emoji: '🚿' },
  { id: 'acabamento', label: 'Acabamento', emoji: '✨' },
  { id: 'pintura', label: 'Pintura', emoji: '🎨' },
  { id: 'alvenaria', label: 'Alvenaria', emoji: '🧱' },
  { id: 'piso', label: 'Piso/Revestimento', emoji: '🏗️' },
  { id: 'iluminacao', label: 'Iluminação', emoji: '💡' },
  { id: 'marcenaria', label: 'Marcenaria', emoji: '🪚' },
  { id: 'ferragem', label: 'Ferragem', emoji: '🔩' },
  { id: 'limpeza', label: 'Limpeza', emoji: '🧹' },
  { id: 'ferramentas', label: 'Ferramentas', emoji: '🔧' },
  { id: 'outro', label: 'Outro', emoji: '📦' },
]

interface NfeItemEditable {
  numero: number
  codigo?: string
  descricao: string
  ncm?: string
  cfop?: string
  unidade?: string
  quantidade: number
  valor_unitario: number
  valor_total: number
  categoria_sugerida?: string
  category: string
  purchased_by: string
  import: boolean
}

interface NfeHeader {
  chave?: string
  numero?: string
  serie?: string
  modelo?: string
  emitente_nome?: string
  emitente_cnpj?: string
  data_emissao?: string
  natureza_operacao?: string
  valor_total?: number
  valor_produtos?: number
  valor_frete?: number
  valor_desconto?: number
  source?: string
  raw_data?: unknown
}

interface NfePaymentForm {
  tPag?: string
  kind: PaymentMethodKind | 'credito_loja' | 'vale' | 'cheque' | 'deposito' | 'outros'
  valor: number
  indPag?: string
  description?: string
}

const PAYMENT_KIND_LABELS: Record<string, { label: string; emoji: string }> = {
  credito: { label: 'Cartão de Crédito', emoji: '💳' },
  debito: { label: 'Cartão de Débito', emoji: '💳' },
  pix: { label: 'PIX', emoji: '⚡' },
  dinheiro: { label: 'Dinheiro', emoji: '💵' },
  boleto: { label: 'Boleto', emoji: '📄' },
  transferencia: { label: 'Transferência', emoji: '🏦' },
  credito_loja: { label: 'Crédito Loja', emoji: '🏪' },
  vale: { label: 'Vale', emoji: '🎫' },
  cheque: { label: 'Cheque', emoji: '📑' },
  deposito: { label: 'Depósito', emoji: '🏦' },
  outros: { label: 'Outros', emoji: '💰' },
}

/**
 * Client-side mirror of the server's computePaymentSchedule logic.
 * Lets the review step show the computed due_date immediately as the
 * user picks a method, before any round-trip to the backend.
 */
function previewSchedule(
  purchaseDateStr: string | undefined,
  method: PaymentMethod | null,
): { due_date: string; paid_date: string | null; status: 'pago' | 'pendente' } {
  const purchase = purchaseDateStr
    ? new Date(purchaseDateStr.substring(0, 10) + 'T12:00:00')
    : new Date()
  const purchaseISO = purchase.toISOString().substring(0, 10)

  if (!method) return { due_date: purchaseISO, paid_date: null, status: 'pendente' }

  if (method.kind === 'pix' || method.kind === 'debito' || method.kind === 'dinheiro') {
    return { due_date: purchaseISO, paid_date: purchaseISO, status: 'pago' }
  }
  if (method.consolidate_monthly) {
    const consolidateDay = method.due_day || 28
    const consolidated = new Date(purchase)
    consolidated.setDate(consolidateDay)
    if (purchase.getDate() > consolidateDay) {
      consolidated.setMonth(consolidated.getMonth() + 1)
    }
    return {
      due_date: consolidated.toISOString().substring(0, 10),
      paid_date: null,
      status: 'pendente',
    }
  }
  if (method.kind === 'credito') {
    const closing = method.closing_day || 28
    const due = method.due_day || 5
    const faturaMonth = new Date(purchase)
    if (purchase.getDate() > closing) {
      faturaMonth.setMonth(faturaMonth.getMonth() + 1)
    }
    const dueDate = new Date(faturaMonth)
    dueDate.setMonth(dueDate.getMonth() + 1)
    dueDate.setDate(due)
    return {
      due_date: dueDate.toISOString().substring(0, 10),
      paid_date: null,
      status: 'pendente',
    }
  }
  const offset = method.default_due_offset_days ?? 15
  const d = new Date(purchase)
  d.setDate(d.getDate() + offset)
  return { due_date: d.toISOString().substring(0, 10), paid_date: null, status: 'pendente' }
}

interface Props {
  currentUser: UserID
  onClose: () => void
  onSuccess: () => void
}

type Step = 'upload' | 'review' | 'saving' | 'done'

export default function NFeImportModal({ currentUser, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [inputMode, setInputMode] = useState<'file' | 'chave'>('file')
  const [chaveInput, setChaveInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [header, setHeader] = useState<NfeHeader>({})
  const [items, setItems] = useState<NfeItemEditable[]>([])
  const [savedCount, setSavedCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- Payment form state ---
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedMethodId, setSelectedMethodId] = useState<string>('')
  const [formasPagamento, setFormasPagamento] = useState<NfePaymentForm[]>([])
  const [dueDateOverride, setDueDateOverride] = useState<string>('')
  const [paidDateOverride, setPaidDateOverride] = useState<string>('')
  const [statusOverride, setStatusOverride] = useState<'pago' | 'pendente'>('pendente')
  const [manualOverride, setManualOverride] = useState(false)
  const [showPaymentMethodsModal, setShowPaymentMethodsModal] = useState(false)

  const loadPaymentMethods = useCallback(async () => {
    try {
      const res = await fetch('/api/payment-methods')
      const data = await res.json()
      if (Array.isArray(data)) setPaymentMethods(data)
    } catch (e) {
      console.error('Falha ao carregar formas de pagamento', e)
    }
  }, [])

  useEffect(() => {
    loadPaymentMethods()
  }, [loadPaymentMethods])

  const selectedMethod = paymentMethods.find((m) => m.id === selectedMethodId) || null

  // Auto-compute due/paid/status whenever inputs change (unless user manually overrode)
  useEffect(() => {
    if (manualOverride) return
    const preview = previewSchedule(header.data_emissao, selectedMethod)
    setDueDateOverride(preview.due_date)
    setPaidDateOverride(preview.paid_date || '')
    setStatusOverride(preview.status)
  }, [selectedMethodId, header.data_emissao, selectedMethod, manualOverride])

  const handleFile = async (file: File) => {
    setLoading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/nfe/parse', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao parsear')
      applyParsed(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const handleChave = async () => {
    setLoading(true)
    setError(null)
    try {
      const clean = chaveInput.replace(/\D/g, '')
      if (clean.length !== 44) {
        throw new Error('Chave de acesso deve ter 44 dígitos')
      }
      const res = await fetch('/api/nfe/parse', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chave: clean }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha')
      applyParsed(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  interface ParseResponse {
    chave?: string
    numero?: string
    serie?: string
    modelo?: string
    emitente_nome?: string
    emitente_cnpj?: string
    data_emissao?: string
    natureza_operacao?: string
    valor_total?: number
    valor_produtos?: number
    valor_frete?: number
    valor_desconto?: number
    source?: string
    raw?: unknown
    formas_pagamento?: NfePaymentForm[]
    itens?: Array<{
      numero: number
      codigo?: string
      descricao: string
      ncm?: string
      cfop?: string
      unidade?: string
      quantidade: number
      valor_unitario: number
      valor_total: number
      categoria_sugerida?: string
    }>
  }

  /**
   * Given a list of detected forms from the NFe, try to pick the best saved
   * method. Preference: exact kind match → first method of that kind → none.
   */
  const autoPickMethod = (formas: NfePaymentForm[], methods: PaymentMethod[]): string => {
    if (formas.length === 0 || methods.length === 0) return ''
    // Biggest value form wins
    const sorted = [...formas].sort((a, b) => (b.valor || 0) - (a.valor || 0))
    for (const f of sorted) {
      const match = methods.find((m) => m.kind === f.kind)
      if (match) return match.id
    }
    return ''
  }

  const applyParsed = (data: ParseResponse) => {
    setHeader({
      chave: data.chave,
      numero: data.numero,
      serie: data.serie,
      modelo: data.modelo,
      emitente_nome: data.emitente_nome,
      emitente_cnpj: data.emitente_cnpj,
      data_emissao: data.data_emissao,
      natureza_operacao: data.natureza_operacao,
      valor_total: data.valor_total,
      valor_produtos: data.valor_produtos,
      valor_frete: data.valor_frete,
      valor_desconto: data.valor_desconto,
      source: data.source,
      raw_data: data.raw,
    })
    const parsedItems: NfeItemEditable[] = (data.itens || []).map((it) => ({
      numero: it.numero,
      codigo: it.codigo,
      descricao: it.descricao,
      ncm: it.ncm,
      cfop: it.cfop,
      unidade: it.unidade,
      quantidade: Number(it.quantidade) || 0,
      valor_unitario: Number(it.valor_unitario) || 0,
      valor_total: Number(it.valor_total) || 0,
      categoria_sugerida: it.categoria_sugerida,
      category: it.categoria_sugerida || 'outro',
      purchased_by: currentUser,
      import: true,
    }))
    setItems(parsedItems)

    // Capture detected payment forms & auto-pick a registered method
    const formas = data.formas_pagamento || []
    setFormasPagamento(formas)
    setManualOverride(false)
    const picked = autoPickMethod(formas, paymentMethods)
    setSelectedMethodId(picked)

    setStep('review')
  }

  const updateItem = (idx: number, patch: Partial<NfeItemEditable>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const addBlankItem = () => {
    setItems((prev) => [
      ...prev,
      {
        numero: prev.length + 1,
        descricao: '',
        quantidade: 1,
        valor_unitario: 0,
        valor_total: 0,
        category: 'outro',
        purchased_by: currentUser,
        import: true,
      },
    ])
  }

  const handleSave = async () => {
    setStep('saving')
    setError(null)
    try {
      const payload = {
        ...header,
        created_by: currentUser,
        itens: items,
        payment_forms: formasPagamento.length > 0 ? formasPagamento : null,
        payment_method_id: selectedMethodId || null,
        payment_due_date: selectedMethodId ? dueDateOverride || null : null,
        payment_paid_date: selectedMethodId ? (paidDateOverride || null) : null,
        payment_status_override: selectedMethodId ? statusOverride : null,
        create_payment: !!selectedMethodId,
      }
      const res = await fetch('/api/nfe/imports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar')
      setSavedCount(data.materials_created || 0)
      setStep('done')
      setTimeout(() => {
        onSuccess()
      }, 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
      setStep('review')
    }
  }

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const totalSelecionado = items
    .filter((it) => it.import)
    .reduce((s, it) => s + (Number(it.valor_total) || 0), 0)
  const selectedCount = items.filter((it) => it.import).length

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white', borderRadius: '16px', maxWidth: '1100px', width: '100%',
          maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #E5E7EB',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'linear-gradient(135deg, #059669, #10B981)', color: 'white',
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} /> Importar NF-e
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px',
              padding: '6px', color: 'white', cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflow: 'auto', flex: 1, padding: '20px' }}>
          {error && (
            <div style={{
              padding: '12px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5',
              borderRadius: '10px', color: '#991B1B', marginBottom: '12px',
              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px',
            }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {step === 'upload' && (
            <div>
              {/* Mode switcher */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button
                  onClick={() => setInputMode('file')}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                    background: inputMode === 'file' ? '#059669' : '#F3F4F6',
                    color: inputMode === 'file' ? 'white' : '#374151',
                    border: 'none', fontWeight: 600, fontSize: '13px',
                  }}
                >
                  📎 PDF ou XML
                </button>
                <button
                  onClick={() => setInputMode('chave')}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                    background: inputMode === 'chave' ? '#059669' : '#F3F4F6',
                    color: inputMode === 'chave' ? 'white' : '#374151',
                    border: 'none', fontWeight: 600, fontSize: '13px',
                  }}
                >
                  🔑 Chave (44 dígitos)
                </button>
              </div>

              {inputMode === 'file' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #10B981', borderRadius: '12px', padding: '40px 20px',
                    textAlign: 'center', cursor: 'pointer', background: '#F0FDF4',
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.xml,application/pdf,text/xml"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleFile(f)
                    }}
                  />
                  {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Loader2 size={32} className="animate-spin" style={{ color: '#059669' }} />
                      <div style={{ color: '#166534', fontSize: '14px' }}>Lendo nota fiscal…</div>
                    </div>
                  ) : (
                    <>
                      <Upload size={32} style={{ color: '#059669', marginBottom: '8px' }} />
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#166534' }}>
                        Clique para enviar PDF da DANFE ou arquivo XML
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                        Formatos: .pdf (DANFE) ou .xml (NF-e oficial)
                      </div>
                    </>
                  )}
                </div>
              )}

              {inputMode === 'chave' && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Chave de acesso (44 dígitos)
                  </label>
                  <input
                    type="text"
                    value={chaveInput}
                    onChange={(e) => setChaveInput(e.target.value)}
                    placeholder="0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000"
                    style={{
                      width: '100%', padding: '14px', borderRadius: '10px',
                      border: '1px solid #D1D5DB', fontSize: '14px', fontFamily: 'monospace',
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px', lineHeight: 1.4 }}>
                    ⚠️ A consulta automática SEFAZ requer certificado. Com a chave, vamos
                    extrair CNPJ, número, série e modelo — você adiciona os itens manualmente.
                    Para puxar itens automaticamente, prefira enviar o PDF/XML.
                  </div>
                  <button
                    onClick={handleChave}
                    disabled={loading || chaveInput.replace(/\D/g, '').length !== 44}
                    style={{
                      marginTop: '12px', padding: '12px 20px', borderRadius: '10px',
                      background: loading || chaveInput.replace(/\D/g, '').length !== 44 ? '#9CA3AF' : '#059669',
                      color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer',
                      fontSize: '14px', width: '100%',
                    }}
                  >
                    {loading ? 'Processando…' : 'Extrair dados da chave'}
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'review' && (
            <div>
              {/* Header preview */}
              <div style={{
                padding: '14px', background: '#F0FDF4', borderRadius: '12px',
                border: '1px solid #BBF7D0', marginBottom: '16px',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Emitente</label>
                    <input
                      style={inputStyle}
                      value={header.emitente_nome || ''}
                      onChange={(e) => setHeader({ ...header, emitente_nome: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>CNPJ</label>
                    <input
                      style={inputStyle}
                      value={header.emitente_cnpj || ''}
                      onChange={(e) => setHeader({ ...header, emitente_cnpj: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Número / Série</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        style={{ ...inputStyle, flex: 2 }}
                        value={header.numero || ''}
                        onChange={(e) => setHeader({ ...header, numero: e.target.value })}
                        placeholder="nº"
                      />
                      <input
                        style={{ ...inputStyle, flex: 1 }}
                        value={header.serie || ''}
                        onChange={(e) => setHeader({ ...header, serie: e.target.value })}
                        placeholder="série"
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Data Emissão</label>
                    <input
                      style={inputStyle}
                      type="date"
                      value={header.data_emissao?.substring(0, 10) || ''}
                      onChange={(e) =>
                        setHeader({ ...header, data_emissao: e.target.value ? `${e.target.value}T12:00:00-03:00` : undefined })
                      }
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Chave de Acesso</label>
                    <input
                      style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '11px' }}
                      value={header.chave || ''}
                      onChange={(e) => setHeader({ ...header, chave: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Valor Total</label>
                    <input
                      style={inputStyle}
                      type="number"
                      step="0.01"
                      value={header.valor_total ?? ''}
                      onChange={(e) => setHeader({ ...header, valor_total: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Natureza Operação</label>
                    <input
                      style={inputStyle}
                      value={header.natureza_operacao || ''}
                      onChange={(e) => setHeader({ ...header, natureza_operacao: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Payment section */}
              <div style={{
                padding: '14px', background: 'linear-gradient(135deg, #EEF2FF, #F5F3FF)',
                borderRadius: '12px', border: '1px solid #C7D2FE', marginBottom: '16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#4338CA', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CreditCard size={14} /> Forma de Pagamento
                  </div>
                  <button
                    onClick={() => setShowPaymentMethodsModal(true)}
                    style={{
                      padding: '6px 12px', borderRadius: '8px', background: 'white',
                      border: '1px solid #C7D2FE', cursor: 'pointer',
                      fontSize: '11px', fontWeight: 700, color: '#4338CA',
                      display: 'flex', alignItems: 'center', gap: '4px',
                    }}
                  >
                    <Plus size={12} /> Gerenciar cartões
                  </button>
                </div>

                {/* Detected forms from NFe */}
                {formasPagamento.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                      Detectado na nota
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {formasPagamento.map((f, i) => {
                        const info = PAYMENT_KIND_LABELS[f.kind] || PAYMENT_KIND_LABELS.outros
                        return (
                          <div key={i} style={{
                            padding: '6px 10px', borderRadius: '999px',
                            background: 'white', border: '1px solid #C7D2FE',
                            fontSize: '11px', fontWeight: 600, color: '#4338CA',
                            display: 'flex', alignItems: 'center', gap: '4px',
                          }}>
                            <span>{info.emoji}</span>
                            <span>{info.label}</span>
                            {f.valor > 0 && <span style={{ color: '#6B7280' }}>· {fmt(f.valor)}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Method picker */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={labelStyle}>Usar método cadastrado</label>
                  <select
                    value={selectedMethodId}
                    onChange={(e) => {
                      setSelectedMethodId(e.target.value)
                      setManualOverride(false)
                    }}
                    style={{
                      ...inputStyle, fontSize: '14px', padding: '10px 12px',
                      fontWeight: 600, background: 'white',
                    }}
                  >
                    <option value="">— Não criar lançamento no Financeiro —</option>
                    {paymentMethods.map((m) => {
                      const info = PAYMENT_KIND_LABELS[m.kind] || PAYMENT_KIND_LABELS.outros
                      return (
                        <option key={m.id} value={m.id}>
                          {info.emoji} {m.name}
                          {m.last4 ? ` •••• ${m.last4}` : ''}
                          {m.kind === 'credito' && m.closing_day && m.due_day
                            ? ` (fecha ${m.closing_day} · vence ${m.due_day})`
                            : ''}
                          {m.consolidate_monthly ? ` (mensal dia ${m.due_day ?? '?'})` : ''}
                        </option>
                      )
                    })}
                  </select>
                  {paymentMethods.length === 0 && (
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px' }}>
                      Nenhuma forma de pagamento cadastrada.{' '}
                      <button
                        onClick={() => setShowPaymentMethodsModal(true)}
                        style={{ background: 'none', border: 'none', color: '#4338CA', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', fontSize: '11px', padding: 0 }}
                      >
                        Cadastrar agora
                      </button>
                    </div>
                  )}
                </div>

                {/* Schedule preview (editable) */}
                {selectedMethodId && (
                  <div style={{
                    padding: '12px', background: 'white', borderRadius: '10px',
                    border: '1px solid #E0E7FF',
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={labelStyle}>Vencimento</label>
                        <input
                          type="date"
                          value={dueDateOverride}
                          onChange={(e) => { setDueDateOverride(e.target.value); setManualOverride(true) }}
                          style={{ ...inputStyle, fontSize: '13px', padding: '8px 10px' }}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Data Paga</label>
                        <input
                          type="date"
                          value={paidDateOverride}
                          onChange={(e) => {
                            setPaidDateOverride(e.target.value)
                            setStatusOverride(e.target.value ? 'pago' : 'pendente')
                            setManualOverride(true)
                          }}
                          style={{ ...inputStyle, fontSize: '13px', padding: '8px 10px' }}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Status</label>
                        <select
                          value={statusOverride}
                          onChange={(e) => {
                            const v = e.target.value as 'pago' | 'pendente'
                            setStatusOverride(v)
                            if (v === 'pago' && !paidDateOverride) {
                              setPaidDateOverride(new Date().toISOString().substring(0, 10))
                            }
                            if (v === 'pendente') setPaidDateOverride('')
                            setManualOverride(true)
                          }}
                          style={{ ...inputStyle, fontSize: '13px', padding: '8px 10px', fontWeight: 700,
                            color: statusOverride === 'pago' ? '#065F46' : '#92400E',
                            background: statusOverride === 'pago' ? '#D1FAE5' : '#FEF3C7',
                          }}
                        >
                          <option value="pendente">⏳ Pendente</option>
                          <option value="pago">✓ Pago</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '8px', lineHeight: 1.5 }}>
                      {manualOverride ? (
                        <>
                          ✏️ Datas editadas manualmente.{' '}
                          <button
                            onClick={() => setManualOverride(false)}
                            style={{ background: 'none', border: 'none', color: '#4338CA', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', fontSize: '11px', padding: 0 }}
                          >
                            Recalcular automaticamente
                          </button>
                        </>
                      ) : (
                        <>🤖 Calculado automaticamente pela regra da forma de pagamento. Você pode editar.</>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Items table */}
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#374151' }}>
                  Itens ({selectedCount}/{items.length} selecionados)
                </h3>
                <button
                  onClick={addBlankItem}
                  style={{
                    padding: '6px 12px', borderRadius: '8px', background: '#F3F4F6',
                    border: '1px solid #D1D5DB', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                  }}
                >
                  + Adicionar item
                </button>
              </div>

              {items.length === 0 ? (
                <div style={{
                  padding: '24px', textAlign: 'center', background: '#F9FAFB',
                  borderRadius: '10px', color: '#6B7280', fontSize: '13px',
                }}>
                  Nenhum item identificado. Clique em &quot;Adicionar item&quot; para inserir manualmente.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {items.map((it, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px', borderRadius: '10px',
                        background: it.import ? 'white' : '#F9FAFB',
                        border: it.import ? '1px solid #A7F3D0' : '1px solid #E5E7EB',
                        opacity: it.import ? 1 : 0.6,
                      }}
                    >
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <input
                          type="checkbox"
                          checked={it.import}
                          onChange={(e) => updateItem(idx, { import: e.target.checked })}
                          style={{ marginTop: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1, display: 'grid', gap: '6px' }}>
                          <input
                            style={{ ...inputStyle, fontWeight: 600 }}
                            value={it.descricao}
                            onChange={(e) => updateItem(idx, { descricao: e.target.value })}
                            placeholder="Descrição do produto"
                          />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px' }}>
                            <div>
                              <label style={labelStyle}>Qtd</label>
                              <input
                                style={inputStyle}
                                type="number"
                                step="0.001"
                                value={it.quantidade}
                                onChange={(e) => {
                                  const q = Number(e.target.value) || 0
                                  updateItem(idx, { quantidade: q, valor_total: q * it.valor_unitario })
                                }}
                              />
                            </div>
                            <div>
                              <label style={labelStyle}>V. Unit</label>
                              <input
                                style={inputStyle}
                                type="number"
                                step="0.01"
                                value={it.valor_unitario}
                                onChange={(e) => {
                                  const vu = Number(e.target.value) || 0
                                  updateItem(idx, { valor_unitario: vu, valor_total: vu * it.quantidade })
                                }}
                              />
                            </div>
                            <div>
                              <label style={labelStyle}>Total</label>
                              <input
                                style={inputStyle}
                                type="number"
                                step="0.01"
                                value={it.valor_total}
                                onChange={(e) => updateItem(idx, { valor_total: Number(e.target.value) || 0 })}
                              />
                            </div>
                            <div>
                              <label style={labelStyle}>Un.</label>
                              <input
                                style={inputStyle}
                                value={it.unidade || ''}
                                onChange={(e) => updateItem(idx, { unidade: e.target.value })}
                              />
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            <div>
                              <label style={labelStyle}>Categoria</label>
                              <select
                                style={inputStyle}
                                value={it.category}
                                onChange={(e) => updateItem(idx, { category: e.target.value })}
                              >
                                {MATERIAL_CATEGORIES.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.emoji} {c.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label style={labelStyle}>Comprado por</label>
                              <select
                                style={inputStyle}
                                value={it.purchased_by}
                                onChange={(e) => updateItem(idx, { purchased_by: e.target.value })}
                              >
                                {USERS.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeItem(idx)}
                          style={{
                            background: '#FEE2E2', border: 'none', borderRadius: '8px',
                            padding: '8px', color: '#DC2626', cursor: 'pointer',
                          }}
                          title="Remover"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'saving' && (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <Loader2 size={40} className="animate-spin" style={{ color: '#059669', marginBottom: '12px' }} />
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#374151' }}>
                Salvando NF-e e gerando materiais…
              </div>
            </div>
          )}

          {step === 'done' && (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div
                style={{
                  width: '64px', height: '64px', borderRadius: '50%', background: '#D1FAE5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <Check size={32} style={{ color: '#059669' }} />
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
                NF-e importada!
              </div>
              <div style={{ fontSize: '13px', color: '#6B7280' }}>
                {savedCount} {savedCount === 1 ? 'material criado' : 'materiais criados'} com sucesso
              </div>
            </div>
          )}
        </div>

        {/* Nested Payment Methods Modal */}
        {showPaymentMethodsModal && (
          <PaymentMethodsModal
            currentUser={currentUser}
            onClose={() => setShowPaymentMethodsModal(false)}
            onChanged={() => { loadPaymentMethods() }}
          />
        )}

        {/* Footer */}
        {step === 'review' && (
          <div style={{
            padding: '12px 20px', borderTop: '1px solid #E5E7EB',
            background: '#F9FAFB',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#6B7280' }}>Total a importar</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669' }}>{fmt(totalSelecionado)}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setStep('upload')}
                style={{
                  padding: '10px 16px', borderRadius: '10px', background: '#F3F4F6',
                  border: '1px solid #D1D5DB', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                }}
              >
                ← Voltar
              </button>
              <button
                onClick={handleSave}
                disabled={selectedCount === 0}
                style={{
                  padding: '10px 20px', borderRadius: '10px',
                  background: selectedCount === 0 ? '#9CA3AF' : '#059669',
                  color: 'white', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                }}
              >
                ✓ Importar {selectedCount} {selectedCount === 1 ? 'item' : 'itens'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '10px', fontWeight: 600, color: '#6B7280',
  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: '8px',
  border: '1px solid #D1D5DB', fontSize: '13px', background: 'white',
}
