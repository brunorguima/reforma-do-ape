'use client'
import { formatCurrency } from '@/lib/constants'
import { PAYMENT_METHODS } from './types'

interface PaymentModalProps {
  quoteId: string
  targetStatus: string
  currentAmount: number
  saving: boolean
  paymentForm: { payment_method: string; payment_details: string; negotiated_amount: string }
  onPaymentFormChange: (form: { payment_method: string; payment_details: string; negotiated_amount: string }) => void
  onConfirm: () => void
  onClose: () => void
}

export default function PaymentModal({
  currentAmount,
  saving,
  paymentForm,
  onPaymentFormChange,
  onConfirm,
  onClose,
}: PaymentModalProps) {
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
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
                <button key={m.value} onClick={() => onPaymentFormChange({ ...paymentForm, payment_method: m.value })}
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
              onChange={e => onPaymentFormChange({ ...paymentForm, negotiated_amount: e.target.value })}
            />
            {currentAmount > 0 && (
              <p className="text-[11px] text-[#6B7280] mt-1 mb-0">
                Valor original do orçamento: {formatCurrency(currentAmount)}
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
              onChange={e => onPaymentFormChange({ ...paymentForm, payment_details: e.target.value })}
              rows={2}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onClose}
            className="px-5 py-2.5 border border-[#e5e7eb] rounded-[10px] bg-white cursor-pointer font-semibold text-sm">
            Cancelar
          </button>
          <button className="btn-primary px-5 py-2.5" onClick={onConfirm} disabled={saving}
            style={{ opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Salvando...' : '🤝 Contratar'}
          </button>
        </div>
      </div>
    </div>
  )
}
