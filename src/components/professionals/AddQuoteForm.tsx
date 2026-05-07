'use client'
import type { Room } from '@/lib/supabase'
import type { Professional, ServiceCategory } from './types'

interface AddQuoteFormProps {
  formError: string
  saving: boolean
  professionals: Professional[]
  serviceCategories: ServiceCategory[]
  rooms: Room[]
  newQuote: { professional_id: string; service_category_id: string; room_id: string; description: string; amount: string; notes: string; scheduled_date: string }
  onNewQuoteChange: (value: { professional_id: string; service_category_id: string; room_id: string; description: string; amount: string; notes: string; scheduled_date: string }) => void
  onSave: () => void
  onClose: () => void
  onOpenAddProfessional: () => void
}

export default function AddQuoteForm({
  formError,
  saving,
  professionals,
  serviceCategories,
  rooms,
  newQuote,
  onNewQuoteChange,
  onSave,
  onClose,
  onOpenAddProfessional,
}: AddQuoteFormProps) {
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
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
            <button onClick={onOpenAddProfessional} className="block mt-2 text-[#2563EB] font-semibold bg-transparent border-none cursor-pointer p-0 text-[13px]">
              + Cadastrar Profissional
            </button>
          </div>
        )}
        <div className="flex flex-col gap-3">
          <select value={newQuote.professional_id} onChange={e => onNewQuoteChange({...newQuote, professional_id: e.target.value})} style={{ borderColor: formError && !newQuote.professional_id ? '#DC2626' : undefined }}>
            <option value="">Selecione o Profissional *</option>
            {professionals.map(p => <option key={p.id} value={p.id}>{p.name} {p.specialty ? `(${p.specialty})` : ''}</option>)}
          </select>
          <select value={newQuote.service_category_id} onChange={e => onNewQuoteChange({...newQuote, service_category_id: e.target.value})}>
            <option value="">Tipo de Serviço</option>
            {serviceCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <input placeholder="Descrição do serviço *" value={newQuote.description} onChange={e => onNewQuoteChange({...newQuote, description: e.target.value})} style={{ borderColor: formError && !newQuote.description.trim() ? '#DC2626' : undefined }} />
          <input type="number" placeholder="Valor (R$)" inputMode="decimal" value={newQuote.amount} onChange={e => onNewQuoteChange({...newQuote, amount: e.target.value})} />
          <select value={newQuote.room_id} onChange={e => onNewQuoteChange({...newQuote, room_id: e.target.value})}>
            <option value="">Cômodo (opcional)</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.icon} {r.name}</option>)}
          </select>
          <input type="date" placeholder="Data prevista" value={newQuote.scheduled_date} onChange={e => onNewQuoteChange({...newQuote, scheduled_date: e.target.value})} />
          <textarea placeholder="Observações" value={newQuote.notes} onChange={e => onNewQuoteChange({...newQuote, notes: e.target.value})} rows={2} />
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 border border-[#e5e7eb] rounded-[10px] bg-white cursor-pointer font-semibold text-sm">Cancelar</button>
          <button className="btn-primary px-5 py-2.5" onClick={onSave} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>{saving ? 'Salvando...' : 'Salvar Orçamento'}</button>
        </div>
      </div>
    </div>
  )
}
