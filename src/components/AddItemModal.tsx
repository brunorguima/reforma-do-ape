'use client'
import { useState, useEffect, useRef } from 'react'
import type { Room, Category, Item } from '@/lib/supabase'
import type { UserID } from '@/lib/constants'
import { X, Plus, Trash2, Link, Image, Search, Loader2, ShoppingBag, ExternalLink, Check } from 'lucide-react'

interface ProductResult {
  title: string
  price: number
  image: string
  url: string
  store: string
}

interface SearchLink {
  store: string
  url: string
}

interface SearchResponse {
  query: string
  results: ProductResult[]
  searchLinks?: SearchLink[]
  stats: { total: number; avgPrice: number; minPrice: number; maxPrice: number }
}

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

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProductResult[]>([])
  const [searchStats, setSearchStats] = useState<SearchResponse['stats'] | null>(null)
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchLinks, setSearchLinks] = useState<SearchLink[]>([])
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleSearch = async (q?: string) => {
    const query = q || searchQuery
    if (!query || query.length < 2) return
    setSearching(true)
    setSearchResults([])
    setSearchStats(null)
    setSearchLinks([])
    try {
      const res = await fetch(`/api/product-search?q=${encodeURIComponent(query)}`)
      const data: SearchResponse = await res.json()
      setSearchResults(data.results || [])
      setSearchStats(data.stats || null)
      setSearchLinks(data.searchLinks || [])
    } catch { /* ignore */ }
    finally { setSearching(false) }
  }

  const selectProduct = (product: ProductResult) => {
    setName(product.title)
    setEstimatedPrice(product.price > 0 ? product.price.toFixed(2) : '')
    if (product.image) setImageUrls([product.image])
    if (product.url) setReferenceLinks([product.url])
    setShowSearch(false)
    setSearchResults([])
    setSearchQuery('')
  }

  const fillAvgPrice = () => {
    if (searchStats?.avgPrice) {
      setEstimatedPrice(searchStats.avgPrice.toFixed(2))
    }
  }

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
      // Check for quick-search product from bottom bar
      try {
        const stored = sessionStorage.getItem('quickProduct')
        if (stored && isOpen) {
          const product = JSON.parse(stored)
          sessionStorage.removeItem('quickProduct')
          setName(product.title || '')
          setEstimatedPrice(product.price > 0 ? product.price.toFixed(2) : '')
          if (product.image) setImageUrls([product.image])
          if (product.url) setReferenceLinks([product.url])
        }
      } catch {}
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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#1f2937]">
            {editingItem ? 'Editar Item' : 'Novo Item'}
          </h2>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer p-1">
            <X size={20} color="#6b7280" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Search bar */}
          {!editingItem && (
            <div className="bg-[#F0F9FF] rounded-md p-3.5 border border-[#BAE6FD]">
              <div className="flex items-center gap-1.5 mb-2">
                <Search size={14} color="#0284C7" />
                <span className="text-[13px] font-bold text-[#0284C7]">Buscar na internet</span>
              </div>
              <div className="flex gap-2">
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch() } }}
                  placeholder="Ex: geladeira frost free 480L inox..."
                  className="flex-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleSearch()}
                  disabled={searching || searchQuery.length < 2}
                  className={`px-4 py-2 bg-[#0284C7] text-white border-none rounded-sm text-[13px] font-bold cursor-pointer flex items-center gap-1 whitespace-nowrap ${searching ? 'opacity-60' : 'opacity-100'}`}>
                  {searching ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
                  {searching ? 'Buscando...' : 'Buscar'}
                </button>
              </div>

              {/* Search results */}
              {(searchResults.length > 0 || searching || searchLinks.length > 0) && (
                <div className="mt-2.5 max-h-[280px] overflow-y-auto rounded-sm">
                  {searchStats && searchStats.total > 0 && (
                    <div className="flex gap-2 mb-2 text-[11px] flex-wrap">
                      <span className="px-2 py-[3px] bg-[#DBEAFE] rounded-[6px] text-[#1E40AF] font-semibold">
                        {searchStats.total} resultado{searchStats.total !== 1 ? 's' : ''}
                      </span>
                      <span className="px-2 py-[3px] bg-success-light rounded-[6px] text-[#065F46] font-semibold">
                        Média: R$ {searchStats.avgPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="px-2 py-[3px] bg-warning-light rounded-[6px] text-[#92400E] font-semibold">
                        Min: R$ {searchStats.minPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {searchResults.map((product, i) => (
                    <div
                      key={i}
                      onClick={() => selectProduct(product)}
                      className="flex gap-2.5 p-2.5 mb-1 bg-white rounded-sm cursor-pointer border border-[#E5E7EB] transition-all duration-150 relative hover:border-[#0284C7] hover:bg-[#F0F9FF]"
                    >
                      {product.image && (
                        <div className="relative shrink-0">
                          <img
                            src={product.image}
                            alt=""
                            className="w-14 h-14 object-contain rounded-[6px] bg-[#F9FAFB] cursor-zoom-in"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                            onMouseEnter={e => {
                              const img = e.target as HTMLImageElement
                              const zoom = document.createElement('div')
                              zoom.id = `modal-zoom-${i}`
                              zoom.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.25);background:white;padding:8px;'
                              const rect = img.getBoundingClientRect()
                              zoom.style.left = `${rect.right + 12}px`
                              zoom.style.top = `${rect.top - 60}px`
                              const zoomImg = document.createElement('img')
                              zoomImg.src = product.image
                              zoomImg.style.cssText = 'width:200px;height:200px;object-fit:contain;border-radius:8px;'
                              zoom.appendChild(zoomImg)
                              document.body.appendChild(zoom)
                            }}
                            onMouseLeave={() => {
                              const zoom = document.getElementById(`modal-zoom-${i}`)
                              if (zoom) zoom.remove()
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          title={product.title}
                          className="text-[13px] font-semibold text-[#1F2937] m-0 overflow-hidden text-ellipsis line-clamp-2"
                        >
                          {product.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-extrabold text-success">
                            R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-[#6B7280] bg-[#F3F4F6] px-1.5 py-[1px] rounded-[4px]">
                            {product.store}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {product.url && (
                          <a
                            href={product.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            title="Ver na loja"
                            className="flex items-center justify-center w-7 h-7 rounded-[6px] bg-[#F3F4F6] transition-colors duration-150 hover:bg-[#DBEAFE]"
                          >
                            <ExternalLink size={14} color="#0284C7" />
                          </a>
                        )}
                        <Check size={16} color="#0284C7" />
                      </div>
                    </div>
                  ))}
                  {searching && (
                    <div className="text-center p-5 text-[#6B7280]">
                      <Loader2 size={20} className="spin inline-block animate-spin" />
                      <p className="text-xs mt-2">Buscando em Mercado Livre, Amazon e Buscapé...</p>
                    </div>
                  )}
                  {!searching && searchResults.length === 0 && searchLinks.length > 0 && (
                    <div className="p-3 text-center">
                      <p className="text-[#6B7280] text-[13px] mb-2.5">
                        Nenhum resultado automático. Busque manualmente:
                      </p>
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {searchLinks.map((link, i) => (
                          <a
                            key={i}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-[#D1D5DB] rounded-sm text-xs font-semibold text-[#374151] no-underline transition-all duration-150"
                          >
                            <ExternalLink size={11} /> {link.store}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="text-[13px] font-semibold text-[#374151] mb-1 block">Nome do item *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Sofá 3 lugares, Geladeira frost free..."
              required
            />
          </div>

          {/* Room + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[13px] font-semibold text-[#374151] mb-1 block">Cômodo *</label>
              <select value={roomId} onChange={e => setRoomId(e.target.value)} required>
                <option value="">Selecione...</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.icon} {r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[13px] font-semibold text-[#374151] mb-1 block">Categoria</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                <option value="">Selecione...</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity + Price + Status */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[13px] font-semibold text-[#374151] mb-1 block">Qtd</label>
              <input type="number" min={1} value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-[#374151] mb-1 block">Preço estimado (R$)</label>
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
              <label className="text-[13px] font-semibold text-[#374151] mb-1 block">Status</label>
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
            <label className="text-[13px] font-semibold text-[#374151] mb-1 block">Descrição</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalhes, medidas, cor, material..."
              rows={2}
              className="resize-y"
            />
          </div>

          {/* Reference Links */}
          <div>
            <label className="text-[13px] font-semibold text-[#374151] mb-1 flex items-center gap-1">
              <Link size={14} /> Links de referência
            </label>
            {referenceLinks.map((link, i) => (
              <div key={i} className="flex gap-2 mb-1.5">
                <input
                  value={link}
                  onChange={e => updateLink(i, e.target.value)}
                  placeholder="https://..."
                />
                {referenceLinks.length > 1 && (
                  <button type="button" onClick={() => removeLink(i)} className="p-2 border-none cursor-pointer bg-[#fef2f2] rounded-sm">
                    <Trash2 size={14} color="#ef4444" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addLink} className="text-xs text-[#2563eb] bg-transparent border-none cursor-pointer font-semibold flex items-center gap-1">
              <Plus size={12} /> Adicionar link
            </button>
          </div>

          {/* Image URLs */}
          <div>
            <label className="text-[13px] font-semibold text-[#374151] mb-1 flex items-center gap-1">
              <Image size={14} /> URLs de imagens
            </label>
            {imageUrls.map((url, i) => (
              <div key={i} className="flex gap-2 mb-1.5">
                <input
                  value={url}
                  onChange={e => updateImage(i, e.target.value)}
                  placeholder="https://imagem.com/foto.jpg"
                />
                {imageUrls.length > 1 && (
                  <button type="button" onClick={() => removeImage(i)} className="p-2 border-none cursor-pointer bg-[#fef2f2] rounded-sm">
                    <Trash2 size={14} color="#ef4444" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addImage} className="text-xs text-[#2563eb] bg-transparent border-none cursor-pointer font-semibold flex items-center gap-1">
              <Plus size={12} /> Adicionar imagem
            </button>
          </div>

          {/* Submit */}
          <div className="flex gap-3 mt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary flex-1">
              {editingItem ? 'Salvar alterações' : 'Adicionar item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
