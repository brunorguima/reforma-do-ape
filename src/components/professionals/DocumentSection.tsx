'use client'
import { USERS } from '@/lib/constants'
import type { UserID } from '@/lib/constants'
import { FileText, Upload, ExternalLink, Trash2 } from 'lucide-react'
import type { OrcamentoDoc } from './types'
import { fmtFileSize } from './types'

interface DocumentSectionProps {
  orcamentoDocs: OrcamentoDoc[]
  currentUser: UserID
  showAddDoc: boolean
  uploadingDoc: boolean
  newDoc: { title: string; description: string; file: File | null }
  onNewDocChange: (doc: { title: string; description: string; file: File | null }) => void
  onShowAddDoc: (show: boolean) => void
  onUploadDoc: () => void
  onDeleteDoc: (docId: string) => void
}

export default function DocumentSection({
  orcamentoDocs,
  currentUser,
  showAddDoc,
  uploadingDoc,
  newDoc,
  onNewDocChange,
  onShowAddDoc,
  onUploadDoc,
  onDeleteDoc,
}: DocumentSectionProps) {
  return (
    <>
      <div className="mb-5 bg-white rounded-[14px] p-4 border border-[#e5e7eb]">
        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FileText size={18} color="#7c3aed" />
            <h3 className="text-[15px] font-bold m-0 text-[#111827]">Memoriais & Documentos</h3>
            {orcamentoDocs.length > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-[10px] bg-[#ede9fe] text-[#7c3aed] font-semibold">
                {orcamentoDocs.length}
              </span>
            )}
          </div>
          <button
            onClick={() => onShowAddDoc(true)}
            className="text-xs px-3 py-1.5 border-[1.5px] border-[#7c3aed] rounded-lg bg-white text-[#7c3aed] cursor-pointer font-semibold inline-flex items-center gap-1">
            <Upload size={13} /> Enviar PDF
          </button>
        </div>
        {orcamentoDocs.length === 0 ? (
          <p className="text-[13px] text-[#9ca3af] m-0 py-3 text-center">
            Nenhum memorial ou documento. Envie PDFs de escopo para solicitar orçamentos competitivos.
          </p>
        ) : (
          <div className="grid gap-2">
            {orcamentoDocs.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 px-3 py-2.5 bg-[#faf5ff] rounded-[10px] border border-[#e9d5ff]">
                <div className="text-xl shrink-0">📄</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold m-0 text-[#111827] whitespace-nowrap overflow-hidden text-ellipsis">
                    {doc.title}
                  </p>
                  {doc.description && (
                    <p className="text-[11px] text-[#6b7280] mt-0.5 mb-0 whitespace-nowrap overflow-hidden text-ellipsis">
                      {doc.description}
                    </p>
                  )}
                  <p className="text-[10px] text-[#9ca3af] mt-0.5 mb-0">
                    {doc.file_size ? fmtFileSize(doc.file_size) + ' · ' : ''}{USERS.find(u => u.id === doc.created_by)?.name || doc.created_by} · {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#7c3aed] text-white no-underline text-[11px] font-semibold shrink-0">
                    <ExternalLink size={12} /> Abrir
                  </a>
                )}
                {(currentUser !== 'mari' || doc.created_by === 'mari') && (
                  <button
                    onClick={() => onDeleteDoc(doc.id)}
                    title="Excluir"
                    className="p-1.5 border-none rounded-lg bg-danger-light text-danger cursor-pointer shrink-0">
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
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onShowAddDoc(false) }}>
          <div className="modal-content">
            <h3 className="text-lg font-bold mb-4">Enviar Memorial / Documento</h3>
            <div className="flex flex-col gap-3">
              <input
                placeholder="Título do documento *"
                value={newDoc.title}
                onChange={e => onNewDocChange({ ...newDoc, title: e.target.value })}
                autoFocus
              />
              <textarea
                placeholder="Descrição (opcional)"
                value={newDoc.description}
                onChange={e => onNewDocChange({ ...newDoc, description: e.target.value })}
                rows={2}
              />
              <label className={`flex items-center gap-2 p-3 border-2 border-dashed rounded-[10px] cursor-pointer ${newDoc.file ? 'bg-[#f0fdf4] border-[#10b981]' : 'bg-[#fafafa] border-[#d1d5db]'}`}>
                <Upload size={18} color={newDoc.file ? '#10b981' : '#6b7280'} />
                <span className={`text-[13px] font-semibold ${newDoc.file ? 'text-[#065f46]' : 'text-[#6b7280]'}`}>
                  {newDoc.file ? newDoc.file.name : 'Selecionar arquivo PDF...'}
                </span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={e => onNewDocChange({ ...newDoc, file: e.target.files?.[0] || null })}
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button
                onClick={() => { onShowAddDoc(false); onNewDocChange({ title: '', description: '', file: null }) }}
                className="px-5 py-2.5 border border-[#e5e7eb] rounded-[10px] bg-white cursor-pointer font-semibold text-sm">
                Cancelar
              </button>
              <button
                className="btn-primary px-5 py-2.5"
                onClick={onUploadDoc}
                disabled={!newDoc.title.trim() || !newDoc.file || uploadingDoc}
                style={{
                  opacity: (!newDoc.title.trim() || !newDoc.file || uploadingDoc) ? 0.5 : 1,
                }}>
                {uploadingDoc ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
