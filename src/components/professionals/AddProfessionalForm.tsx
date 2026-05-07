'use client'

interface AddProfessionalFormProps {
  formError: string
  saving: boolean
  newProfessional: { name: string; phone: string; email: string; specialty: string; notes: string; recommended_by: string }
  onNewProfessionalChange: (value: { name: string; phone: string; email: string; specialty: string; notes: string; recommended_by: string }) => void
  onSave: () => void
  onClose: () => void
}

export default function AddProfessionalForm({
  formError,
  saving,
  newProfessional,
  onNewProfessionalChange,
  onSave,
  onClose,
}: AddProfessionalFormProps) {
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-content">
        <h3 className="text-lg font-bold mb-4">Cadastrar Profissional</h3>
        {formError && (
          <div className="px-3.5 py-2.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-danger text-[13px] mb-3">
            {formError}
          </div>
        )}
        <div className="flex flex-col gap-3">
          <input placeholder="Nome do profissional *" value={newProfessional.name} onChange={e => onNewProfessionalChange({...newProfessional, name: e.target.value})} autoFocus style={{ borderColor: formError && !newProfessional.name.trim() ? '#DC2626' : undefined }} />
          <input placeholder="Telefone" type="tel" value={newProfessional.phone} onChange={e => onNewProfessionalChange({...newProfessional, phone: e.target.value})} />
          <input placeholder="Email" type="email" value={newProfessional.email} onChange={e => onNewProfessionalChange({...newProfessional, email: e.target.value})} />
          <input placeholder="Especialidade (ex: Eletricista, Pintor)" value={newProfessional.specialty} onChange={e => onNewProfessionalChange({...newProfessional, specialty: e.target.value})} />
          <input placeholder="Indicado por" value={newProfessional.recommended_by} onChange={e => onNewProfessionalChange({...newProfessional, recommended_by: e.target.value})} />
          <textarea placeholder="Observações" value={newProfessional.notes} onChange={e => onNewProfessionalChange({...newProfessional, notes: e.target.value})} rows={2} />
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 border border-[#e5e7eb] rounded-[10px] bg-white cursor-pointer font-semibold text-sm">Cancelar</button>
          <button className="btn-primary px-5 py-2.5" onClick={onSave} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  )
}
