'use client'
import { useState } from 'react'
import type { PriceSuggestion } from '@/lib/supabase'
import { formatCurrency } from '@/lib/constants'
import { Search, Plus, ExternalLink, Tag, TrendingDown, Loader2 } from 'lucide-react'

interface PromotionSearchProps {
  itemId: string
  itemName: string
  suggestions: PriceSuggestion[]
  onRefresh: () => void
}

export default function PromotionSearch({ itemId, itemName, suggestions, onRefresh }: PromotionSearchProps) {
  const [searching, setSearching] = useState(false)
  const [showManualAdd, setShowManualAdd] = useState(false)
  const [manualStore, setManualStore] = useState('')
  const [manualPrice, setManualPrice] = useState('')
  const [manualUrl, setManualUrl] = useState('')
  const [manualIsPromo, setManualIsPromo] = useState(false)

  const handleSearch = async () => {
    setSearching(true)
    try {
      await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, search_query: itemName }),
      })
      onRefresh()
    } catch (err) {
      console.error('Error searching promotions:', err)
    } finally {
      setSearching(false)
    }
  }

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetch('/api/promotions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          store_name: manualStore,
          price: parseFloat(manualPrice),
          url: manualUrl,
          is_promotion: manualIsPromo,
        }),
      })
      setManualStore('')
      setManualPrice('')
      setManualUrl('')
      setManualIsPromo(false)
      setShowManualAdd(false)
      onRefresh()
    } catch (err) {
      console.error('Error adding price:', err)
    }
  }

  const sortedSuggestions = [...suggestions].sort((a, b) => a.price - b.price)
  const bestPrice = sortedSuggestions[0]?.price

  return (
    <div style={{ marginTop: '16px', padding: '16px', background: '#fefce8', borderRadius: '12px', border: '1px solid #fde68a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TrendingDown size={16} /> Preços encontrados
        </h4>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={handleSearch}
            disabled={searching}
            style={{
              fontSize: '12px', padding: '4px 12px', borderRadius: '8px', border: 'none',
              cursor: searching ? 'not-allowed' : 'pointer',
              background: '#f59e0b', color: 'white', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '4px', opacity: searching ? 0.7 : 1
            }}
          >
            {searching ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
            Buscar preços
          </button>
          <button
            onClick={() => setShowManualAdd(!showManualAdd)}
            style={{
              fontSize: '12px', padding: '4px 12px', borderRadius: '8px', border: 'none',
              cursor: 'pointer', background: '#fde68a', color: '#92400e', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '4px'
            }}
          >
            <Plus size={12} /> Adicionar
          </button>
        </div>
      </div>

      {/* Manual add form */}
      {showManualAdd && (
        <form onSubmit={handleManualAdd} style={{ marginBottom: '12px', padding: '12px', background: 'white', borderRadius: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <input
              value={manualStore}
              onChange={e => setManualStore(e.target.value)}
              placeholder="Nome da loja"
              required
              style={{ fontSize: '13px' }}
            />
            <input
              type="number"
              step="0.01"
              value={manualPrice}
              onChange={e => setManualPrice(e.target.value)}
              placeholder="Preço (R$)"
              required
              style={{ fontSize: '13px' }}
            />
          </div>
          <input
            value={manualUrl}
            onChange={e => setManualUrl(e.target.value)}
            placeholder="URL do produto"
            required
            style={{ fontSize: '13px', marginBottom: '8px' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="checkbox"
                checked={manualIsPromo}
                onChange={e => setManualIsPromo(e.target.checked)}
                style={{ width: 'auto' }}
              />
              É promoção
            </label>
            <button type="submit" style={{ fontSize: '12px', padding: '6px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#f59e0b', color: 'white', fontWeight: 600 }}>
              Salvar
            </button>
          </div>
        </form>
      )}

      {/* Suggestions list */}
      {sortedSuggestions.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#92400e', textAlign: 'center', padding: '12px' }}>
          Nenhum preço cadastrado. Busque preços ou adicione manualmente.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {sortedSuggestions.map((s) => (
            <div
              key={s.id}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', background: 'white', borderRadius: '8px',
                border: s.price === bestPrice ? '2px solid #10b981' : '1px solid #e5e7eb'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {s.price === bestPrice && (
                  <span style={{ fontSize: '10px', background: '#d1fae5', color: '#059669', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    MELHOR
                  </span>
                )}
                {s.is_promotion && <span className="promo-tag">PROMO</span>}
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{s.store_name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: s.price === bestPrice ? '#059669' : '#374151' }}>
                  {formatCurrency(s.price)}
                </span>
                <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
