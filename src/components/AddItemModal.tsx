'use client'
import { useState, useEffect } from 'react'
import type { Room, Category, Item } from '@/lib/supabase'
import type { UserID } from '@/lib/constants'
import { X, Plus, Trash2, Link, Image } from 'lucide-react'

interface AddItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (item: Partial<Item>) => void
  rooms: Room[]
  categories: Category[]
  currentUser: UserID
  editingItem?: Item | null
}

export default function AddItemModal({ isOpen, onClose, onSave, rooms, categories, currentUser, editingItem }: AddItemModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [roomId, setRoomId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [estimatedPrice, setEstimatedPrice] = useState('')
  const [status, setStatus] = useState<Item['status']>('desejado')
  const [referenceLinks, setReferenceLinks] = useState<string[]>([''])
  const [imageUrls, setImageUrls] = useState<string[]>([''])

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name)
      setDescription(editingItem.description || '')
      setRoomId(editingItem.room_id)
      setCategoryId(editingItem.category_id || '')
      setQuantity(editingItem.quantity)
      setEstimatedPrice(editingItem.estimated_price?.toString() || '')
      setStatus(editingItem.status)
      setReferenceLinks(editingItem.reference_links?.length ? editingItem.reference_links : [''])
      setImageUrls(editingItem.images?.map(img => img.url) || [''])
    } else {
      resetForm()
    }
  }, [editingItem, isOpen])

  const resetForm = () => {
    setName('')
    setDescription('')
    setRoomId(rooms[0]?.id || '')
    setCategoryId('')
    setQuantity(1)
    setEstimatedPrice('')
    setStatus('desejado')
    setReferenceLinks([''])
    setImageUrls([''])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const links = referenceLinks.filter(l => l.trim())
    const images = imageUrls.filter(u => u.trim())
    onSave({
      id: editingItem?.id,
      name,
      description: description || null,
      room_id: roomId,
      category_id: categoryId || null,
      quantity,
      estimated_price: estimatedPrice ? parseFloat(estimatedPrice) : null,
      status,
      reference_links: links,
      suggested_by: editingItem?.suggested_by || currentUser,
      created_by: editingItem?.created_by || currentUser,
      updated_by: currentUser,
      images: images.map(url => ({ url, uploaded_by: currentUser })) as any,
    })
    resetForm()
    onClose()
  }

  const addLink = () => setReferenceLinks([...referenceLinks, ''])
  const removeLink = (i: number) => setReferenceLinks(referenceLinks.filter((_, idx) => idx !== i))
  const updateLink = (i: number, val: string) => {
    const updated = [...referenceLinks]
    updated[i] = val
    setReferenceLinks(updated)
  }

  const addImage = () => setImageUrls([...imageUrls, ''])
  const removeImage = (i: number) => setImageUrls(imageUrls.filter((_, idx) => idx !== i))
  const updateImage = (i: number, val: string) => {
    const updated = [...imageUrls]
    updated[i] = val
    setImageUrls(updated)
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937' }}>
            {editingItem ? 'Editar Item' : 'Novo Item'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={20} color="#6b7280" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Name */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>Nome do item *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Sofá 3 lugares, Geladeira frost free..."
              required
            />
          </div>

          {/* Room + Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>Cômodo *</label>
              <select value={roomId} onChange={e => setRoomId(e.target.value)} required>
                <option value="">Selecione...</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.icon} {r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>Categoria</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                <option value="">Selecione...</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity + Price + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>Qtd</label>
              <input type="number" min={1} value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>Preço estimado (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={estimatedPrice}
                onChange={e => setEstimatedPrice(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as Item['status'])}>
                <option value="ja_temos">Já Temos</option>
                <option value="desejado">Desejado</option>
                <option value="aprovado">Aprovado</option>
                <option value="comprado">Comprado</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>Descrição</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalhes, medidas, cor, material..."
              rows={2}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Reference Links */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Link size={14} /> Links de referência
            </label>
            {referenceLinks.map((link, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                <input
                  value={link}
                  onChange={e => updateLink(i, e.target.value)}
                  placeholder="https://..."
                />
                {referenceLinks.length > 1 && (
                  <button type="button" onClick={() => removeLink(i)} style={{ padding: '8px', border: 'none', cursor: 'pointer', background: '#fef2f2', borderRadius: '8px' }}>
                    <Trash2 size={14} color="#ef4444" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addLink} style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={12} /> Adicionar link
            </button>
          </div>

          {/* Image URLs */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Image size={14} /> URLs de imagens
            </label>
            {imageUrls.map((url, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                <input
                  value={url}
                  onChange={e => updateImage(i, e.target.value)}
                  placeholder="https://imagem.com/foto.jpg"
                />
                {imageUrls.length > 1 && (
                  <button type="button" onClick={() => removeImage(i)} style={{ padding: '8px', border: 'none', cursor: 'pointer', background: '#fef2f2', borderRadius: '8px' }}>
                    <Trash2 size={14} color="#ef4444" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addImage} style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={12} /> Adicionar imagem
            </button>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>
              {editingItem ? 'Salvar alterações' : 'Adicionar item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
