'use client'
import type { Room } from '@/lib/supabase'
import { Upload, Trash2, X } from 'lucide-react'
import type { Professional, Quote, OrcamentoFlow, OrcamentoParsedItem } from './types'
import { ORC_CATEGORIES, fmtBRL, fmtFileSize } from './types'

interface OcrProSelectModalProps {
  professionals: Professional[]
  quotes: Quote[]
  onSelect: (proId: string) => void
  onClose: () => void
}

export function OcrProSelectModal({ professionals, quotes, onSelect, onClose }: OcrProSelectModalProps) {
  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
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
            onClick={onClose}
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
                  onClick={() => onSelect(pro.id)}
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
  )
}

interface OcrModalProps {
  orcamentoFlow: OrcamentoFlow
  professionals: Professional[]
  rooms: Room[]
  onClose: () => void
  onFileChange: (file: File | null) => void
  onParse: () => void
  onSave: () => void
  onUpdateItem: (index: number, patch: Partial<OrcamentoParsedItem>) => void
  onRemoveItem: (index: number) => void
  onAddItem: () => void
  onDescriptionChange: (desc: string) => void
}

export function OcrModal({
  orcamentoFlow,
  professionals,
  rooms,
  onClose,
  onFileChange,
  onParse,
  onSave,
  onUpdateItem,
  onRemoveItem,
  onAddItem,
  onDescriptionChange,
}: OcrModalProps) {
  const pro = professionals.find(p => p.id === orcamentoFlow.proId)
  const totalCalc = orcamentoFlow.editedItems.reduce((s, it) => s + (Number(it.valor_total) || 0), 0)

  return (
    <div
      className="modal-overlay items-start pt-6 pb-6 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget && !orcamentoFlow.saving && orcamentoFlow.step !== 'parsing') onClose() }}
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
            onClick={onClose}
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
                onChange={e => onFileChange(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
            <div className="flex gap-2 mt-4 justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 border border-[#e5e7eb] rounded-[10px] bg-white cursor-pointer font-semibold text-sm">
                Cancelar
              </button>
              <button
                className="btn-primary px-5 py-2.5"
                onClick={onParse}
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
                onChange={e => onDescriptionChange(e.target.value)}
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
                  onClick={onAddItem}
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
                        onChange={e => onUpdateItem(i, { descricao: e.target.value })}
                        placeholder="Descrição"
                        className="flex-1 px-2 py-1.5 text-xs border border-[#e5e7eb] rounded-md box-border"
                      />
                      <button
                        onClick={() => onRemoveItem(i)}
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
                        onChange={e => onUpdateItem(i, { quantidade: Number(e.target.value) || 0 })}
                        placeholder="Qtd"
                        className="p-1.5 text-[11px] border border-[#e5e7eb] rounded-md box-border"
                      />
                      <input
                        value={item.unidade ?? ''}
                        onChange={e => onUpdateItem(i, { unidade: e.target.value || null })}
                        placeholder="un"
                        className="p-1.5 text-[11px] border border-[#e5e7eb] rounded-md box-border"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={item.valor_unitario}
                        onChange={e => onUpdateItem(i, { valor_unitario: Number(e.target.value) || 0 })}
                        placeholder="V. Unit"
                        className="p-1.5 text-[11px] border border-[#e5e7eb] rounded-md box-border"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={item.valor_total}
                        onChange={e => onUpdateItem(i, { valor_total: Number(e.target.value) || 0 })}
                        placeholder="Total"
                        className="p-1.5 text-[11px] border border-[#e5e7eb] rounded-md box-border font-semibold"
                      />
                      <select
                        value={item.categoria ?? ''}
                        onChange={e => onUpdateItem(i, { categoria: e.target.value || null })}
                        className="p-1.5 text-[11px] border border-[#e5e7eb] rounded-md box-border">
                        <option value="">Categoria</option>
                        {ORC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select
                        value={item.room_id ?? ''}
                        onChange={e => onUpdateItem(i, { room_id: e.target.value || null })}
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
                onClick={onClose}
                disabled={orcamentoFlow.saving}
                className="px-5 py-2.5 border border-[#e5e7eb] rounded-[10px] bg-white cursor-pointer font-semibold text-sm">
                Cancelar
              </button>
              <button
                className="btn-primary px-5 py-2.5"
                onClick={onSave}
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
}
