'use client'

import { useEffect, useState } from 'react'
import { X, Plus, CreditCard, Pencil, Trash2, Save, Check } from 'lucide-react'
import type { UserID } from '@/lib/constants'

export type PaymentMethodKind =
  | 'credito' | 'debito' | 'pix' | 'dinheiro' | 'boleto' | 'transferencia'

export interface PaymentMethod {
  id: string
  name: string
  kind: PaymentMethodKind
  closing_day: number | null
  due_day: number | null
  brand: string | null
  issuer_bank: string | null
  last4: string | null
  holder: string | null
  consolidate_monthly: boolean
  default_due_offset_days: number | null
  is_active: boolean
  notes: string | null
  created_by: string
}

const KIND_OPTIONS: { id: PaymentMethodKind; label: string; emoji: string; description: string }[] = [
  { id: 'credito', label: 'Cartão de Crédito', emoji: '💳', description: 'Fecha em dia X, paga em dia Y' },
  { id: 'debito', label: 'Cartão de Débito', emoji: '💳', description: 'Cai na hora' },
  { id: 'pix', label: 'PIX', emoji: '⚡', description: 'Cai na hora' },
  { id: 'dinheiro', label: 'Dinheiro', emoji: '💵', description: 'Cai na hora' },
  { id: 'boleto', label: 'Boleto', emoji: '📄', description: 'Vence em X dias após a compra' },
  { id: 'transferencia', label: 'Transferência / TED', emoji: '🏦', description: 'Prazo customizável' },
]

// Bandeiras de cartão mais comuns no Brasil
const CARD_BRANDS = [
  'Visa',
  'Mastercard',
  'Elo',
  'American Express',
  'Hipercard',
  'Diners Club',
  'Discover',
  'Cabal',
  'Outro',
]

// Bancos emissores mais comuns no Brasil (foco em fintechs e top 10)
const ISSUER_BANKS = [
  'Nubank',
  'Itaú',
  'Bradesco',
  'Santander',
  'Banco do Brasil',
  'Caixa',
  'Inter',
  'C6 Bank',
  'BTG Pactual',
  'Next',
  'PicPay',
  'XP',
  'Will Bank',
  'Neon',
  'PagBank',
  'Mercado Pago',
  'Safra',
  'Sicoob',
  'Sicredi',
  'Original',
  'Outro',
]

// Gera array 1..31 para dropdowns de dia
const DAYS_1_31 = Array.from({ length: 31 }, (_, i) => i + 1)

interface Props {
  currentUser: UserID
  onClose: () => void
  onChanged?: () => void
}

export default function PaymentMethodsModal({ currentUser, onClose, onChanged }: Props) {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<PaymentMethod | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadMethods = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/payment-methods')
      const data = await res.json()
      setMethods(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMethods()
  }, [])

  const startCreate = () => {
    setEditing({
      id: '',
      name: '',
      kind: 'credito',
      closing_day: 20,
      due_day: 5,
      brand: null,
      issuer_bank: null,
      last4: null,
      holder: currentUser === 'graziela' ? 'Graziela' : 'Bruno',
      consolidate_monthly: false,
      default_due_offset_days: 15,
      is_active: true,
      notes: null,
      created_by: currentUser,
    })
    setCreating(true)
  }

  const save = async () => {
    if (!editing) return
    if (!editing.name.trim()) return
    setSaving(true)
    try {
      if (creating) {
        const res = await fetch('/api/payment-methods', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...editing, created_by: currentUser }),
        })
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error || 'Falha ao salvar')
        }
      } else {
        const res = await fetch(`/api/payment-methods/${editing.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(editing),
        })
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error || 'Falha ao salvar')
        }
      }
      setEditing(null)
      setCreating(false)
      await loadMethods()
      onChanged?.()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Desativar essa forma de pagamento?')) return
    await fetch(`/api/payment-methods/${id}`, { method: 'DELETE' })
    await loadMethods()
    onChanged?.()
  }

  const kindInfo = (k: PaymentMethodKind) => KIND_OPTIONS.find((o) => o.id === k) || KIND_OPTIONS[0]

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[1100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-[680px] w-full max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex justify-between items-center text-white" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
          <h2 className="m-0 text-lg font-bold flex items-center gap-2">
            <CreditCard size={20} /> Formas de Pagamento
          </h2>
          <button
            onClick={onClose}
            className="bg-white/20 border-none rounded-sm p-1.5 text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {loading && <div className="text-center text-[#6B7280]">Carregando…</div>}

          {!loading && !editing && methods.length === 0 && (
            <div className="p-6 text-center bg-[#F9FAFB] rounded-md text-[#6B7280]">
              Nenhuma forma de pagamento cadastrada.
              <br />
              Adicione cartões, PIX, boleto consolidado etc.
            </div>
          )}

          {!loading && !editing && methods.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {methods.map((m) => {
                const ki = kindInfo(m.kind)
                return (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-md bg-white border border-[#E5E7EB] flex gap-3 items-center"
                  >
                    <div className="w-11 h-11 rounded-[10px] bg-[#EEF2FF] flex items-center justify-center text-xl shrink-0">
                      {ki.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-[#111827]">
                        {m.name}
                        {m.last4 && <span className="text-[#6B7280] font-medium ml-1.5">•••• {m.last4}</span>}
                      </div>
                      <div className="text-[11px] text-[#6B7280] mt-0.5">
                        {ki.label}
                        {m.brand && <> · {m.brand}</>}
                        {m.issuer_bank && <> · {m.issuer_bank}</>}
                        {m.kind === 'credito' && m.closing_day && m.due_day && (
                          <> · fecha dia {m.closing_day} · vence dia {m.due_day}</>
                        )}
                        {m.kind === 'boleto' && m.default_due_offset_days != null && (
                          <> · vence em {m.default_due_offset_days} dias</>
                        )}
                        {m.consolidate_monthly && <> · pago mensalmente dia {m.due_day ?? '?'}</>}
                        {m.holder && <> · {m.holder}</>}
                      </div>
                    </div>
                    <button
                      onClick={() => { setEditing(m); setCreating(false) }}
                      className="bg-[#F3F4F6] border-none rounded-sm p-2 cursor-pointer"
                      title="Editar"
                    >
                      <Pencil size={14} color="#374151" />
                    </button>
                    <button
                      onClick={() => remove(m.id)}
                      className="bg-danger-light border-none rounded-sm p-2 cursor-pointer"
                      title="Desativar"
                    >
                      <Trash2 size={14} color="#DC2626" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {editing && (
            <div className="flex flex-col gap-3.5">
              <div>
                <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wide mb-1">Tipo</label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {KIND_OPTIONS.map((opt) => {
                    const selected = editing.kind === opt.id
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setEditing({ ...editing, kind: opt.id })}
                        className={`px-2 py-2.5 rounded-[10px] cursor-pointer text-xs font-semibold flex flex-col items-center gap-1 ${
                          selected
                            ? 'bg-[#6366F1] text-white border-2 border-[#4338CA]'
                            : 'bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]'
                        }`}
                      >
                        <div className="text-xl">{opt.emoji}</div>
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wide mb-1">Nome / Apelido</label>
                <input
                  className="w-full px-3 py-2.5 rounded-sm border border-[#D1D5DB] text-sm bg-white box-border"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Ex: Nubank Bruno, Leroy Merlin mensal"
                  autoFocus
                />
              </div>

              {editing.kind === 'credito' && (
                <div className="p-3 bg-[#EEF2FF] rounded-[10px] border border-[#C7D2FE]">
                  <div className="text-[11px] text-[#4338CA] font-bold mb-2.5">
                    📅 Datas do cartão
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wide mb-1">Dia do fechamento</label>
                      <select
                        className="w-full px-3 py-2.5 rounded-sm border border-[#D1D5DB] text-sm bg-white box-border"
                        value={editing.closing_day ?? ''}
                        onChange={(e) => setEditing({ ...editing, closing_day: e.target.value ? Number(e.target.value) : null })}
                      >
                        <option value="">—</option>
                        {DAYS_1_31.map((d) => (
                          <option key={d} value={d}>Dia {d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wide mb-1">Dia do pagamento</label>
                      <select
                        className="w-full px-3 py-2.5 rounded-sm border border-[#D1D5DB] text-sm bg-white box-border"
                        value={editing.due_day ?? ''}
                        onChange={(e) => setEditing({ ...editing, due_day: e.target.value ? Number(e.target.value) : null })}
                      >
                        <option value="">—</option>
                        {DAYS_1_31.map((d) => (
                          <option key={d} value={d}>Dia {d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 mt-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wide mb-1">Bandeira</label>
                      <select
                        className="w-full px-3 py-2.5 rounded-sm border border-[#D1D5DB] text-sm bg-white box-border"
                        value={editing.brand || ''}
                        onChange={(e) => setEditing({ ...editing, brand: e.target.value || null })}
                      >
                        <option value="">Selecione…</option>
                        {CARD_BRANDS.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wide mb-1">Banco emissor</label>
                      <select
                        className="w-full px-3 py-2.5 rounded-sm border border-[#D1D5DB] text-sm bg-white box-border"
                        value={editing.issuer_bank || ''}
                        onChange={(e) => setEditing({ ...editing, issuer_bank: e.target.value || null })}
                      >
                        <option value="">Selecione…</option>
                        {ISSUER_BANKS.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wide mb-1">Final do cartão</label>
                    <input
                      className="w-full px-3 py-2.5 rounded-sm border border-[#D1D5DB] text-sm bg-white box-border"
                      maxLength={4}
                      value={editing.last4 || ''}
                      onChange={(e) => setEditing({ ...editing, last4: e.target.value.replace(/\D/g, '') || null })}
                      placeholder="1234"
                    />
                  </div>
                </div>
              )}

              {editing.kind === 'debito' && (
                <div className="p-3 bg-[#ECFDF5] rounded-[10px] border border-[#A7F3D0]">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wide mb-1">Bandeira</label>
                      <select
                        className="w-full px-3 py-2.5 rounded-sm border border-[#D1D5DB] text-sm bg-white box-border"
                        value={editing.brand || ''}
                        onChange={(e) => setEditing({ ...editing, brand: e.target.value || null })}
                      >
                        <option value="">Selecione…</option>
                        {CARD_BRANDS.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wide mb-1">Banco</label>
                      <select
                        className="w-full px-3 py-2.5 rounded-sm border border-[#D1D5DB] text-sm bg-white box-border"
                        value={editing.issuer_bank || ''}
                        onChange={(e) => setEditing({ ...editing, issuer_bank: e.target.value || null })}
                      >
                        <option value="">Selecione…</option>
                        {ISSUER_BANKS.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {(editing.kind === 'pix' || editing.kind === 'transferencia') && (
                <div>
                  <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wide mb-1">Banco</label>
                  <select
                    className="w-full px-3 py-2.5 rounded-sm border border-[#D1D5DB] text-sm bg-white box-border"
                    value={editing.issuer_bank || ''}
                    onChange={(e) => setEditing({ ...editing, issuer_bank: e.target.value || null })}
                  >
                    <option value="">Selecione…</option>
                    {ISSUER_BANKS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              )}

              {editing.kind === 'boleto' && (
                <div className="p-3 bg-warning-light rounded-[10px] border border-[#FDE68A]">
                  <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wide mb-1">Prazo padrão (dias após emissão)</label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    className="w-full px-3 py-2.5 rounded-sm border border-[#D1D5DB] text-sm bg-white box-border"
                    value={editing.default_due_offset_days ?? ''}
                    onChange={(e) => setEditing({ ...editing, default_due_offset_days: e.target.value ? Number(e.target.value) : null })}
                  />
                  <div className="mt-3 flex gap-2 items-start">
                    <input
                      type="checkbox"
                      id="consolidate"
                      checked={editing.consolidate_monthly}
                      onChange={(e) => setEditing({ ...editing, consolidate_monthly: e.target.checked })}
                      className="mt-0.5 w-4 h-4"
                    />
                    <label htmlFor="consolidate" className="text-xs text-[#92400E] cursor-pointer">
                      <strong>Fornecedor consolidado</strong>
                      <div className="text-[11px] opacity-80 mt-0.5">
                        Todas as notas desse fornecedor caem numa única fatura mensal no dia abaixo.
                      </div>
                    </label>
                  </div>
                  {editing.consolidate_monthly && (
                    <div className="mt-2.5">
                      <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wide mb-1">Dia de pagamento mensal</label>
                      <select
                        className="w-full px-3 py-2.5 rounded-sm border border-[#D1D5DB] text-sm bg-white box-border"
                        value={editing.due_day ?? ''}
                        onChange={(e) => setEditing({ ...editing, due_day: e.target.value ? Number(e.target.value) : null })}
                      >
                        <option value="">—</option>
                        {DAYS_1_31.map((d) => (
                          <option key={d} value={d}>Dia {d}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wide mb-1">Titular</label>
                <input
                  className="w-full px-3 py-2.5 rounded-sm border border-[#D1D5DB] text-sm bg-white box-border"
                  value={editing.holder || ''}
                  onChange={(e) => setEditing({ ...editing, holder: e.target.value || null })}
                  placeholder="Bruno, Graziela…"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wide mb-1">Notas (opcional)</label>
                <input
                  className="w-full px-3 py-2.5 rounded-sm border border-[#D1D5DB] text-sm bg-white box-border"
                  value={editing.notes || ''}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value || null })}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setEditing(null); setCreating(false) }}
                  className="px-4 py-2.5 rounded-[10px] bg-[#F3F4F6] border border-[#D1D5DB] cursor-pointer text-[13px] font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={save}
                  disabled={saving || !editing.name.trim()}
                  className={`px-5 py-2.5 rounded-[10px] text-white border-none cursor-pointer text-[13px] font-bold flex items-center gap-1.5 ${
                    saving || !editing.name.trim() ? 'bg-[#9CA3AF]' : 'bg-[#6366F1]'
                  }`}
                >
                  {saving ? '...' : <><Check size={14} /> Salvar</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {!editing && (
          <div className="px-5 py-3 border-t border-[#E5E7EB] bg-[#F9FAFB] flex justify-end">
            <button
              onClick={startCreate}
              className="px-4.5 py-2.5 rounded-[10px] bg-[#6366F1] text-white border-none cursor-pointer text-[13px] font-bold flex items-center gap-1.5"
            >
              <Plus size={14} /> Nova forma de pagamento
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper export used by NFeImportModal to display labels
export { Save }
