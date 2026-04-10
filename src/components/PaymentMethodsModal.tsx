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
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white', borderRadius: '16px', maxWidth: '680px', width: '100%',
          maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #E5E7EB',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: 'white',
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={20} /> Formas de Pagamento
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

        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {loading && <div style={{ textAlign: 'center', color: '#6B7280' }}>Carregando…</div>}

          {!loading && !editing && methods.length === 0 && (
            <div style={{
              padding: '24px', textAlign: 'center', background: '#F9FAFB',
              borderRadius: '12px', color: '#6B7280',
            }}>
              Nenhuma forma de pagamento cadastrada.
              <br />
              Adicione cartões, PIX, boleto consolidado etc.
            </div>
          )}

          {!loading && !editing && methods.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {methods.map((m) => {
                const ki = kindInfo(m.kind)
                return (
                  <div
                    key={m.id}
                    style={{
                      padding: '14px', borderRadius: '12px',
                      background: 'white', border: '1px solid #E5E7EB',
                      display: 'flex', gap: '12px', alignItems: 'center',
                    }}
                  >
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '10px',
                      background: '#EEF2FF', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '20px', flexShrink: 0,
                    }}>
                      {ki.emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                        {m.name}
                        {m.last4 && <span style={{ color: '#6B7280', fontWeight: 500, marginLeft: '6px' }}>•••• {m.last4}</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
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
                      style={{ background: '#F3F4F6', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}
                      title="Editar"
                    >
                      <Pencil size={14} color="#374151" />
                    </button>
                    <button
                      onClick={() => remove(m.id)}
                      style={{ background: '#FEE2E2', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Tipo</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '6px' }}>
                  {KIND_OPTIONS.map((opt) => {
                    const selected = editing.kind === opt.id
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setEditing({ ...editing, kind: opt.id })}
                        style={{
                          padding: '10px 8px', borderRadius: '10px', cursor: 'pointer',
                          background: selected ? '#6366F1' : '#F3F4F6',
                          color: selected ? 'white' : '#374151',
                          border: selected ? '2px solid #4338CA' : '1px solid #E5E7EB',
                          fontSize: '12px', fontWeight: 600,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                        }}
                      >
                        <div style={{ fontSize: '20px' }}>{opt.emoji}</div>
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Nome / Apelido</label>
                <input
                  style={inputStyle}
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Ex: Nubank Bruno, Leroy Merlin mensal"
                  autoFocus
                />
              </div>

              {editing.kind === 'credito' && (
                <div style={{
                  padding: '12px', background: '#EEF2FF', borderRadius: '10px',
                  border: '1px solid #C7D2FE',
                }}>
                  <div style={{ fontSize: '11px', color: '#4338CA', fontWeight: 700, marginBottom: '10px' }}>
                    📅 Datas do cartão
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={labelStyle}>Dia do fechamento</label>
                      <select
                        style={inputStyle}
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
                      <label style={labelStyle}>Dia do pagamento</label>
                      <select
                        style={inputStyle}
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                    <div>
                      <label style={labelStyle}>Bandeira</label>
                      <select
                        style={inputStyle}
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
                      <label style={labelStyle}>Banco emissor</label>
                      <select
                        style={inputStyle}
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
                  <div style={{ marginTop: '10px' }}>
                    <label style={labelStyle}>Final do cartão</label>
                    <input
                      style={inputStyle}
                      maxLength={4}
                      value={editing.last4 || ''}
                      onChange={(e) => setEditing({ ...editing, last4: e.target.value.replace(/\D/g, '') || null })}
                      placeholder="1234"
                    />
                  </div>
                </div>
              )}

              {editing.kind === 'debito' && (
                <div style={{
                  padding: '12px', background: '#ECFDF5', borderRadius: '10px',
                  border: '1px solid #A7F3D0',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={labelStyle}>Bandeira</label>
                      <select
                        style={inputStyle}
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
                      <label style={labelStyle}>Banco</label>
                      <select
                        style={inputStyle}
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
                  <label style={labelStyle}>Banco</label>
                  <select
                    style={inputStyle}
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
                <div style={{
                  padding: '12px', background: '#FEF3C7', borderRadius: '10px', border: '1px solid #FDE68A',
                }}>
                  <label style={labelStyle}>Prazo padrão (dias após emissão)</label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    style={inputStyle}
                    value={editing.default_due_offset_days ?? ''}
                    onChange={(e) => setEditing({ ...editing, default_due_offset_days: e.target.value ? Number(e.target.value) : null })}
                  />
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <input
                      type="checkbox"
                      id="consolidate"
                      checked={editing.consolidate_monthly}
                      onChange={(e) => setEditing({ ...editing, consolidate_monthly: e.target.checked })}
                      style={{ marginTop: '3px', width: '16px', height: '16px' }}
                    />
                    <label htmlFor="consolidate" style={{ fontSize: '12px', color: '#92400E', cursor: 'pointer' }}>
                      <strong>Fornecedor consolidado</strong>
                      <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>
                        Todas as notas desse fornecedor caem numa única fatura mensal no dia abaixo.
                      </div>
                    </label>
                  </div>
                  {editing.consolidate_monthly && (
                    <div style={{ marginTop: '10px' }}>
                      <label style={labelStyle}>Dia de pagamento mensal</label>
                      <select
                        style={inputStyle}
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
                <label style={labelStyle}>Titular</label>
                <input
                  style={inputStyle}
                  value={editing.holder || ''}
                  onChange={(e) => setEditing({ ...editing, holder: e.target.value || null })}
                  placeholder="Bruno, Graziela…"
                />
              </div>

              <div>
                <label style={labelStyle}>Notas (opcional)</label>
                <input
                  style={inputStyle}
                  value={editing.notes || ''}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value || null })}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setEditing(null); setCreating(false) }}
                  style={{
                    padding: '10px 16px', borderRadius: '10px', background: '#F3F4F6',
                    border: '1px solid #D1D5DB', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={save}
                  disabled={saving || !editing.name.trim()}
                  style={{
                    padding: '10px 20px', borderRadius: '10px',
                    background: saving || !editing.name.trim() ? '#9CA3AF' : '#6366F1',
                    color: 'white', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  {saving ? '...' : <><Check size={14} /> Salvar</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {!editing && (
          <div style={{
            padding: '12px 20px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB',
            display: 'flex', justifyContent: 'flex-end',
          }}>
            <button
              onClick={startCreate}
              style={{
                padding: '10px 18px', borderRadius: '10px',
                background: '#6366F1', color: 'white', border: 'none',
                cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <Plus size={14} /> Nova forma de pagamento
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '10px', fontWeight: 700, color: '#6B7280',
  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: '8px',
  border: '1px solid #D1D5DB', fontSize: '14px', background: 'white',
  boxSizing: 'border-box',
}

// Helper export used by NFeImportModal to display labels
export { Save }
