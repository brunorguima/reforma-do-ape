'use client'
import { formatCurrency } from '@/lib/constants'
import type { UserID } from '@/lib/constants'
import { ChevronDown, ChevronUp, TrendingDown, Clock, CreditCard, FileText, CheckCircle2, Edit3, Check, X, Phone, Mail } from 'lucide-react'
import type { Contract, BudgetItem, Payment, Quote } from './types'
import { PAYMENT_METHODS, STATUS_CONFIG, fmtBRL, fmtDate } from './types'

interface ContractFromTableProps {
  contract: Contract
  budgetItems: BudgetItem[]
  payments: Payment[]
  isExpanded: boolean
  onToggleExpand: () => void
  editingContract: string | null
  editContractForm: Partial<Contract>
  onEditContract: (contract: Contract) => void
  onSaveContract: () => void
  onCancelEditContract: () => void
  onEditContractFormChange: (form: Partial<Contract>) => void
  markingPaid: string | null
  onMarkPaid: (payment: Payment) => void
}

export function ContractFromTable({
  contract,
  budgetItems: cBudgetItems,
  payments: cPayments,
  isExpanded,
  onToggleExpand,
  editingContract,
  editContractForm,
  onEditContract,
  onSaveContract,
  onCancelEditContract,
  onEditContractFormChange,
  markingPaid,
  onMarkPaid,
}: ContractFromTableProps) {
  const totalPaidC = cPayments.filter(p => p.status === 'pago').reduce((s, p) => s + p.amount, 0)
  const economia = contract.original_total - contract.negotiated_total
  const percentPaid = contract.negotiated_total > 0 ? Math.round((totalPaidC / contract.negotiated_total) * 100) : 0
  const nextPayment = cPayments.find(p => p.status === 'pendente')
  const categories = [...new Set(cBudgetItems.map(b => b.category))]
  const daysUntilNext = nextPayment ? Math.ceil((new Date(nextPayment.due_date + 'T12:00:00').getTime() - Date.now()) / 86400000) : null

  return (
    <div className="rounded-[14px] border border-[#D1FAE5] overflow-hidden bg-white">
      {/* Contract Header */}
      <button
        onClick={onToggleExpand}
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
                <button onClick={onSaveContract}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md border-none bg-[#10B981] text-white text-xs font-semibold cursor-pointer">
                  <Check size={12} /> Salvar
                </button>
                <button onClick={onCancelEditContract}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md border-none bg-[#E5E7EB] text-[#6B7280] text-xs font-semibold cursor-pointer">
                  <X size={12} /> Cancelar
                </button>
              </div>
            ) : (
              <button onClick={() => onEditContract(contract)}
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
                  <input value={editContractForm.professional || ''} onChange={e => onEditContractFormChange({ ...editContractForm, professional: e.target.value })}
                    className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Função</label>
                  <input value={editContractForm.role || ''} onChange={e => onEditContractFormChange({ ...editContractForm, role: e.target.value })}
                    className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Valor Original</label>
                  <input type="number" value={editContractForm.original_total || ''} onChange={e => onEditContractFormChange({ ...editContractForm, original_total: Number(e.target.value) })}
                    className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Valor Negociado</label>
                  <input type="number" value={editContractForm.negotiated_total || ''} onChange={e => onEditContractFormChange({ ...editContractForm, negotiated_total: Number(e.target.value) })}
                    className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Início</label>
                  <input type="date" value={editContractForm.start_date || ''} onChange={e => onEditContractFormChange({ ...editContractForm, start_date: e.target.value })}
                    className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">1º Pagamento</label>
                  <input type="date" value={editContractForm.first_payment_date || ''} onChange={e => onEditContractFormChange({ ...editContractForm, first_payment_date: e.target.value })}
                    className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Observações</label>
                <textarea value={editContractForm.notes || ''} onChange={e => onEditContractFormChange({ ...editContractForm, notes: e.target.value })}
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
          {nextPayment && editingContract !== contract.id && (
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
              <button onClick={() => onMarkPaid(nextPayment)} disabled={markingPaid === nextPayment.id}
                className="px-3 py-1.5 rounded-lg border-none bg-[#10B981] text-white text-xs font-semibold cursor-pointer"
                style={{ opacity: markingPaid === nextPayment.id ? 0.5 : 1 }}>
                ✓ Paguei
              </button>
            </div>
          )}

          {/* Parcelas Timeline */}
          {editingContract !== contract.id && (
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
          {editingContract !== contract.id && (
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

          {editingContract !== contract.id && contract.notes && (
            <p className="text-[11px] text-[#9CA3AF] italic mt-2">📝 {contract.notes}</p>
          )}
        </div>
      )}
    </div>
  )
}

interface ContractFromQuoteProps {
  quote: Quote
  isExpanded: boolean
  onToggleExpand: () => void
  editingQuote: string | null
  editQuoteForm: Partial<Quote>
  onEditQuote: (quote: Quote) => void
  onSaveQuote: () => void
  onCancelEditQuote: () => void
  onEditQuoteFormChange: (form: Partial<Quote>) => void
}

export function ContractFromQuote({
  quote,
  isExpanded,
  editingQuote,
  editQuoteForm,
  onToggleExpand,
  onEditQuote,
  onSaveQuote,
  onCancelEditQuote,
  onEditQuoteFormChange,
}: ContractFromQuoteProps) {
  const amount = quote.negotiated_amount || Number(quote.amount)

  return (
    <div className="rounded-[14px] border border-[#D1FAE5] overflow-hidden bg-white">
      {/* Quote Header */}
      <button
        onClick={onToggleExpand}
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
                <button onClick={onSaveQuote}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md border-none bg-[#10B981] text-white text-xs font-semibold cursor-pointer">
                  <Check size={12} /> Salvar
                </button>
                <button onClick={onCancelEditQuote}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md border-none bg-[#E5E7EB] text-[#6B7280] text-xs font-semibold cursor-pointer">
                  <X size={12} /> Cancelar
                </button>
              </div>
            ) : (
              <button onClick={() => onEditQuote(quote)}
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
                <input value={editQuoteForm.description || ''} onChange={e => onEditQuoteFormChange({ ...editQuoteForm, description: e.target.value })}
                  className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Valor Original</label>
                  <input type="number" value={editQuoteForm.amount || ''} onChange={e => onEditQuoteFormChange({ ...editQuoteForm, amount: Number(e.target.value) })}
                    className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Valor Negociado</label>
                  <input type="number" value={editQuoteForm.negotiated_amount || ''} onChange={e => onEditQuoteFormChange({ ...editQuoteForm, negotiated_amount: Number(e.target.value) })}
                    className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Forma de Pagamento</label>
                  <select value={editQuoteForm.payment_method || ''} onChange={e => onEditQuoteFormChange({ ...editQuoteForm, payment_method: e.target.value })}
                    className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border">
                    <option value="">Selecione...</option>
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.emoji} {m.label}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Status</label>
                  <select value={editQuoteForm.status || ''} onChange={e => onEditQuoteFormChange({ ...editQuoteForm, status: e.target.value as Quote['status'] })}
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
                <textarea value={editQuoteForm.payment_details || ''} onChange={e => onEditQuoteFormChange({ ...editQuoteForm, payment_details: e.target.value })}
                  rows={2} className="w-full p-2 rounded-md border border-[#D1D5DB] text-[13px] box-border" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#6B7280] block mb-0.5">Observações</label>
                <textarea value={editQuoteForm.notes || ''} onChange={e => onEditQuoteFormChange({ ...editQuoteForm, notes: e.target.value })}
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
}
