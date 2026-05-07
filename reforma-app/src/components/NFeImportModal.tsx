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
  uf?: string
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
  parse_warning?: string
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
    uf?: string
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
    parse_warning?: string
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
      uf: data.uf,
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
      parse_warning: data.parse_warning,
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
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="bg-surface-lowest rounded-radius-lg max-w-[1100px] w-full max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center bg-gradient-to-br from-success to-[#10B981] text-white">
          <h2 className="m-0 text-lg font-bold flex items-center gap-2">
            <FileText size={20} /> Importar NF-e
          </h2>
          <button
            onClick={onClose}
            className="bg-white/20 border-none rounded-radius-sm p-1.5 text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-auto flex-1 p-5">
          {error && (
            <div className="px-3.5 py-3 bg-danger-light border border-[#FCA5A5] rounded-[10px] text-[#991B1B] mb-3 flex items-center gap-2 text-[13px]">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {step === 'upload' && (
            <div>
              {/* Mode switcher */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setInputMode('file')}
                  className={`flex-1 px-3.5 py-2.5 rounded-[10px] cursor-pointer border-none font-semibold text-[13px] ${
                    inputMode === 'file' ? 'bg-success text-white' : 'bg-surface-container-low text-[#374151]'
                  }`}
                >
                  📎 PDF ou XML
                </button>
                <button
                  onClick={() => setInputMode('chave')}
                  className={`flex-1 px-3.5 py-2.5 rounded-[10px] cursor-pointer border-none font-semibold text-[13px] ${
                    inputMode === 'chave' ? 'bg-success text-white' : 'bg-surface-container-low text-[#374151]'
                  }`}
                >
                  🔑 Chave (44 dígitos)
                </button>
              </div>

              {inputMode === 'file' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#10B981] rounded-radius-md px-5 py-10 text-center cursor-pointer bg-[#F0FDF4]"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.xml,application/pdf,text/xml"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleFile(f)
                    }}
                  />
                  {loading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={32} className="animate-spin text-success" />
                      <div className="text-[#166534] text-sm">Lendo nota fiscal…</div>
                    </div>
                  ) : (
                    <>
                      <Upload size={32} className="text-success mb-2" />
                      <div className="text-sm font-semibold text-[#166534]">
                        Clique para enviar PDF da DANFE ou arquivo XML
                      </div>
                      <div className="text-xs text-on-surface-variant mt-1">
                        Formatos: .pdf (DANFE) ou .xml (NF-e oficial)
                      </div>
                    </>
                  )}
                </div>
              )}

              {inputMode === 'chave' && (
                <div>
                  <label className="block text-[13px] font-semibold text-[#374151] mb-1.5">
                    Chave de acesso (44 dígitos)
                  </label>
                  <input
                    type="text"
                    value={chaveInput}
                    onChange={(e) => setChaveInput(e.target.value)}
                    placeholder="0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000"
                    className="w-full p-3.5 rounded-[10px] border border-outline-variant text-sm font-mono"
                  />
                  <div className="text-[11px] text-on-surface-variant mt-1.5 leading-snug">
                    ⚠️ A consulta automática SEFAZ requer certificado. Com a chave, vamos
                    extrair CNPJ, número, série e modelo — você adiciona os itens manualmente.
                    Para puxar itens automaticamente, prefira enviar o PDF/XML.
                  </div>
                  <button
                    onClick={handleChave}
                    disabled={loading || chaveInput.replace(/\D/g, '').length !== 44}
                    className={`mt-3 px-5 py-3 rounded-[10px] text-white border-none font-semibold cursor-pointer text-sm w-full ${
                      loading || chaveInput.replace(/\D/g, '').length !== 44 ? 'bg-[#9CA3AF]' : 'bg-success'
                    }`}
                  >
                    {loading ? 'Processando…' : 'Extrair dados da chave'}
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'review' && (
            <div>
              {/* Parse warning banner */}
              {header.parse_warning && (
                <div className="px-3.5 py-3 bg-warning-light rounded-[10px] border border-[#FDE68A] mb-3 flex items-start gap-2.5 text-xs text-[#92400E]">
                  <div className="text-lg leading-none">⚠️</div>
                  <div className="flex-1 leading-snug">
                    <strong>Extração parcial</strong> — {header.parse_warning}
                  </div>
                </div>
              )}

              {/* Debug raw text panel (PDF source only) */}
              {header.source === 'pdf' && header.raw_data != null && (
                <details className="mb-3 px-3 py-2.5 bg-surface-container-low rounded-radius-sm border border-outline-variant text-[11px]">
                  <summary className="cursor-pointer font-semibold text-[#4B5563]">
                    🔍 Texto extraído do PDF (debug)
                  </summary>
                  <pre className="mt-2 max-h-60 overflow-auto p-2 bg-[#1F2937] text-[#D1FAE5] rounded-[6px] text-[10px] leading-tight whitespace-pre-wrap break-words">
                    {(() => {
                      const raw = header.raw_data as { lines?: string[]; full?: string } | undefined
                      if (raw?.full) return raw.full
                      if (raw?.lines) return raw.lines.join('\n')
                      return JSON.stringify(header.raw_data, null, 2)
                    })()}
                  </pre>
                  <div className="mt-1.5 text-on-surface-variant text-[10px]">
                    Copie esse texto e me mande se o parser não pegou algum campo — ajuda a melhorar.
                  </div>
                </details>
              )}

              {/* Header preview */}
              <div className="p-3.5 bg-[#F0FDF4] rounded-radius-md border border-[#BBF7D0] mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide mb-0.5">Emitente</label>
                    <input
                      className="w-full px-2.5 py-2 rounded-radius-sm border border-outline-variant text-[13px] bg-surface-lowest"
                      value={header.emitente_nome || ''}
                      onChange={(e) => setHeader({ ...header, emitente_nome: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide mb-0.5">CNPJ</label>
                    <input
                      className="w-full px-2.5 py-2 rounded-radius-sm border border-outline-variant text-[13px] bg-surface-lowest"
                      value={header.emitente_cnpj || ''}
                      onChange={(e) => setHeader({ ...header, emitente_cnpj: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide mb-0.5">Número / Série</label>
                    <div className="flex gap-1.5">
                      <input
                        className="w-full px-2.5 py-2 rounded-radius-sm border border-outline-variant text-[13px] bg-surface-lowest flex-2"
                        value={header.numero || ''}
                        onChange={(e) => setHeader({ ...header, numero: e.target.value })}
                        placeholder="nº"
                      />
                      <input
                        className="w-full px-2.5 py-2 rounded-radius-sm border border-outline-variant text-[13px] bg-surface-lowest flex-1"
                        value={header.serie || ''}
                        onChange={(e) => setHeader({ ...header, serie: e.target.value })}
                        placeholder="série"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide mb-0.5">Data Emissão</label>
                    <input
                      className="w-full px-2.5 py-2 rounded-radius-sm border border-outline-variant text-[13px] bg-surface-lowest"
                      type="date"
                      value={header.data_emissao?.substring(0, 10) || ''}
                      onChange={(e) =>
                        setHeader({ ...header, data_emissao: e.target.value ? `${e.target.value}T12:00:00-03:00` : undefined })
                      }
                    />
                  </div>
                  <div className="col-span-full">
                    <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide mb-0.5">Chave de Acesso</label>
                    <input
                      className="w-full px-2.5 py-2 rounded-radius-sm border border-outline-variant text-[11px] font-mono bg-surface-lowest"
                      value={header.chave || ''}
                      onChange={(e) => setHeader({ ...header, chave: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide mb-0.5">Valor Total</label>
                    <input
                      className="w-full px-2.5 py-2 rounded-radius-sm border border-outline-variant text-[13px] bg-surface-lowest"
                      type="number"
                      step="0.01"
                      value={header.valor_total ?? ''}
                      onChange={(e) => setHeader({ ...header, valor_total: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide mb-0.5">Desconto</label>
                    <input
                      className="w-full px-2.5 py-2 rounded-radius-sm border border-outline-variant text-[13px] bg-surface-lowest"
                      type="number"
                      step="0.01"
                      value={header.valor_desconto ?? ''}
                      onChange={(e) => setHeader({ ...header, valor_desconto: Number(e.target.value) || 0 })}
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide mb-0.5">Frete</label>
                    <input
                      className="w-full px-2.5 py-2 rounded-radius-sm border border-outline-variant text-[13px] bg-surface-lowest"
                      type="number"
                      step="0.01"
                      value={header.valor_frete ?? ''}
                      onChange={(e) => setHeader({ ...header, valor_frete: Number(e.target.value) || 0 })}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="col-span-full">
                    <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide mb-0.5">Natureza Operação</label>
                    <input
                      className="w-full px-2.5 py-2 rounded-radius-sm border border-outline-variant text-[13px] bg-surface-lowest"
                      value={header.natureza_operacao || ''}
                      onChange={(e) => setHeader({ ...header, natureza_operacao: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Payment section */}
              <div className="p-3.5 bg-gradient-to-br from-[#EEF2FF] to-[#F5F3FF] rounded-radius-md border border-[#C7D2FE] mb-4">
                <div className="flex justify-between items-center mb-2.5">
                  <div className="text-xs font-extrabold text-[#4338CA] uppercase tracking-wide flex items-center gap-1.5">
                    <CreditCard size={14} /> Forma de Pagamento
                  </div>
                  <button
                    onClick={() => setShowPaymentMethodsModal(true)}
                    className="px-3 py-1.5 rounded-radius-sm bg-surface-lowest border border-[#C7D2FE] cursor-pointer text-[11px] font-bold text-[#4338CA] flex items-center gap-1"
                  >
                    <Plus size={12} /> Gerenciar cartões
                  </button>
                </div>

                {/* Detected forms from NFe */}
                {formasPagamento.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide mb-1">
                      Detectado na nota
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {formasPagamento.map((f, i) => {
                        const info = PAYMENT_KIND_LABELS[f.kind] || PAYMENT_KIND_LABELS.outros
                        return (
                          <div key={i} className="px-2.5 py-1.5 rounded-full bg-surface-lowest border border-[#C7D2FE] text-[11px] font-semibold text-[#4338CA] flex items-center gap-1">
                            <span>{info.emoji}</span>
                            <span>{info.label}</span>
                            {f.valor > 0 && <span className="text-on-surface-variant">· {fmt(f.valor)}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Method picker */}
                <div className="mb-2.5">
                  <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide mb-0.5">Usar método cadastrado</label>
                  <select
                    value={selectedMethodId}
                    onChange={(e) => {
                      setSelectedMethodId(e.target.value)
                      setManualOverride(false)
                    }}
                    className="w-full px-3 py-2.5 rounded-radius-sm border border-outline-variant text-sm font-semibold bg-surface-lowest"
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
                    <div className="text-[11px] text-on-surface-variant mt-1.5">
                      Nenhuma forma de pagamento cadastrada.{' '}
                      <button
                        onClick={() => setShowPaymentMethodsModal(true)}
                        className="bg-transparent border-none text-[#4338CA] font-bold underline cursor-pointer text-[11px] p-0"
                      >
                        Cadastrar agora
                      </button>
                    </div>
                  )}
                </div>

                {/* Schedule preview (editable) */}
                {selectedMethodId && (
                  <div className="p-3 bg-surface-lowest rounded-[10px] border border-[#E0E7FF]">
                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide mb-0.5">Vencimento</label>
                        <input
                          type="date"
                          value={dueDateOverride}
                          onChange={(e) => { setDueDateOverride(e.target.value); setManualOverride(true) }}
                          className="w-full px-2.5 py-2 rounded-radius-sm border border-outline-variant text-[13px] bg-surface-lowest"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide mb-0.5">Data Paga</label>
                        <input
                          type="date"
                          value={paidDateOverride}
                          onChange={(e) => {
                            setPaidDateOverride(e.target.value)
                            setStatusOverride(e.target.value ? 'pago' : 'pendente')
                            setManualOverride(true)
                          }}
                          className="w-full px-2.5 py-2 rounded-radius-sm border border-outline-variant text-[13px] bg-surface-lowest"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide mb-0.5">Status</label>
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
                          className={`w-full px-2.5 py-2 rounded-radius-sm border border-outline-variant text-[13px] font-bold ${
                            statusOverride === 'pago'
                              ? 'text-[#065F46] bg-[#D1FAE5]'
                              : 'text-[#92400E] bg-warning-light'
                          }`}
                        >
                          <option value="pendente">⏳ Pendente</option>
                          <option value="pago">✓ Pago</option>
                        </select>
                      </div>
                    </div>
                    <div className="text-[11px] text-on-surface-variant mt-2 leading-normal">
                      {manualOverride ? (
                        <>
                          ✏️ Datas editadas manualmente.{' '}
                          <button
                            onClick={() => setManualOverride(false)}
                            className="bg-transparent border-none text-[#4338CA] font-bold underline cursor-pointer text-[11px] p-0"
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
              <div className="mb-3 flex justify-between items-center">
                <h3 className="m-0 text-sm font-bold text-[#374151]">
                  Itens ({selectedCount}/{items.length} selecionados)
                </h3>
                <button
                  onClick={addBlankItem}
                  className="px-3 py-1.5 rounded-radius-sm bg-surface-container-low border border-outline-variant cursor-pointer text-xs font-semibold"
                >
                  + Adicionar item
                </button>
              </div>

              {items.length === 0 ? (
                <div className="p-6 text-center bg-surface rounded-[10px] text-on-surface-variant text-[13px]">
                  Nenhum item identificado. Clique em &quot;Adicionar item&quot; para inserir manualmente.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {items.map((it, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-[10px] ${
                        it.import
                          ? 'bg-surface-lowest border border-[#A7F3D0] opacity-100'
                          : 'bg-surface border border-outline-variant opacity-60'
                      }`}
                    >
                      <div className="flex gap-2 items-start">
                        <input
                          type="checkbox"
                          checked={it.import}
                          onChange={(e) => updateItem(idx, { import: e.target.checked })}
                          className="mt-2.5 w-[18px] h-[18px] cursor-pointer"
                        />
                        <div className="flex-1 grid gap-1.5">
                          <input
                            className="w-full px-2.5 py-2 rounded-radius-sm border border-outline-variant text-[13px] bg-surface-lowest font-semibold"
                            value={it.descricao}
                            onChange={(e) => updateItem(idx, { descricao: e.target.value })}
                            placeholder="Descrição do produto"
                          />
                          <div className="grid grid-cols-4 gap-1.5">
                            <div>
                              <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide mb-0.5">Qtd</label>
                              <input
                                className="w-full px-2.5 py-2 rounded-radius-sm border border-outline-variant text-[13px] bg-surface-lowest"
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
                              <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide mb-0.5">V. Unit</label>
                              <input
                                className="w-full px-2.5 py-2 rounded-radius-sm border border-outline-variant text-[13px] bg-surface-lowest"
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
                              <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide mb-0.5">Total</label>
                              <input
                                className="w-full px-2.5 py-2 rounded-radius-sm border border-outline-variant text-[13px] bg-surface-lowest"
                                type="number"
                                step="0.01"
                                value={it.valor_total}
                                onChange={(e) => updateItem(idx, { valor_total: Number(e.target.value) || 0 })}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide mb-0.5">Un.</label>
                              <input
                                className="w-full px-2.5 py-2 rounded-radius-sm border border-outline-variant text-[13px] bg-surface-lowest"
                                value={it.unidade || ''}
                                onChange={(e) => updateItem(idx, { unidade: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide mb-0.5">Categoria</label>
                              <select
                                className="w-full px-2.5 py-2 rounded-radius-sm border border-outline-variant text-[13px] bg-surface-lowest"
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
                              <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide mb-0.5">Comprado por</label>
                              <select
                                className="w-full px-2.5 py-2 rounded-radius-sm border border-outline-variant text-[13px] bg-surface-lowest"
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
                          className="bg-danger-light border-none rounded-radius-sm p-2 text-danger cursor-pointer"
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
            <div className="px-5 py-16 text-center">
              <Loader2 size={40} className="animate-spin text-success mb-3" />
              <div className="text-base font-semibold text-[#374151]">
                Salvando NF-e e gerando materiais…
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="px-5 py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-[#D1FAE5] flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-success" />
              </div>
              <div className="text-lg font-bold text-[#166534] mb-1">
                NF-e importada!
              </div>
              <div className="text-[13px] text-on-surface-variant">
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
          <div className="px-5 py-3 border-t border-outline-variant bg-surface flex justify-between items-center">
            <div>
              <div className="text-[11px] text-on-surface-variant">Total a importar</div>
              <div className="text-lg font-extrabold text-success">{fmt(totalSelecionado)}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2.5 rounded-[10px] bg-surface-container-low border border-outline-variant cursor-pointer text-[13px] font-semibold"
              >
                ← Voltar
              </button>
              <button
                onClick={handleSave}
                disabled={selectedCount === 0}
                className={`px-5 py-2.5 rounded-[10px] text-white border-none cursor-pointer text-[13px] font-bold ${
                  selectedCount === 0 ? 'bg-[#9CA3AF]' : 'bg-success'
                }`}
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
