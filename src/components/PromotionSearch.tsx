'use client'
import { useState } from 'react'
import type { PriceSuggestion } from '@/lib/supabase'
import { formatCurrency } from '@/lib/constants'
import { Search, Plus, ExternalLink, TrendingDown, Loader2, ShoppingBag, Recycle, Globe } from 'lucide-react'

interface SearchLink {
  store: string
  url: string
  isUsed: boolean
}

interface PromotionSearchProps {
  itemId: string
  itemName: string
  suggestions: PriceSuggestion[]
  onRefresh: () => void
}

export default function PromotionSearch({ itemId, itemName, suggestions, onRefresh }: PromotionSearchProps) {
  const [searching, setSearching] = useState(false)
  const [showManualAdd, setShowManualAdd] = useState(false)
  const [showSearchLinks, setShowSearchLinks] = useState(false)
  const [searchLinks, setSearchLinks] = useState<SearchLink[]>([])
  const [searchStats, setSearchStats] = useState<{ found: number; new_items: number; used_items: number } | null>(null)
  const [manualStore, setManualStore] = useState('')
  const [manualPrice, setManualPrice] = useState('')
  const [manualUrl, setManualUrl] = useState('')
  const [manualIsPromo, setManualIsPromo] = useState(false)

  const handleSearch = async () => {
    setSearching(true)
    setSearchStats(null)
    try {
      const res = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          search_query: itemName,
          include_new: true,
          include_used: true,
        }),
      })
      const data = await res.json()
      if (data.search_links) setSearchLinks(data.search_links)
      if (data.stats) setSearchStats(data.stats)
      onRefresh()
    } catch (err) {
      console.error('Error searching promotions:', err)
    } finally {
      setSearching(false)
    }
  }

  const handleGetLinks = async () => {
    try {
      const res = await fetch(`/api/promotions?q=${encodeURIComponent(itemName)}`)
      const data = await res.json()
      if (data.search_links) {
        setSearchLinks(data.search_links)
        setShowSearchLinks(true)
      }
    } catch (err) {
      console.error('Error getting links:', err)
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
  const newLinks = searchLinks.filter(l => !l.isUsed)
  const usedLinks = searchLinks.filter(l => l.isUsed)

  return (
    <div style={{ marginTop: '16px', padding: '16px', background: '#fefce8', borderRadius: '12px', border: '1px solid #fde68a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TrendingDown size={16} /> Precos e Promocoes
        </h4>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
            {searching ? <Loader2 size={12} /> : <Search size={12} />}
            {searching ? 'Buscando...' : 'Buscar precos'}
          </button>
          <button
            onClick={handleGetLinks}
            style={{
              fontSize: '12px', padding: '4px 12px', borderRadius: '8px', border: 'none',
              cursor: 'pointer', background: '#e0e7ff', color: '#4338ca', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '4px'
            }}
          >
            <Globe size={12} /> Links diretos
          </button>
          <button
            onClick={() => setShowManualAdd(!showManualAdd)}
            style={{
              fontSize: '12px', padding: '4px 12px', borderRadius: '8px', border: 'none',
              cursor: 'pointer', background: '#fde68a', color: '#92400e', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '4px'
            }}
          >
            <Plus size={12} /> Manual
          </button>
        </div>
      </div>

      {/* Search stats */}
      {searchStats && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '12px' }}>
          <span style={{ color: '#059669', fontWeight: 600 }}>
            {searchStats.found} resultados encontrados
          </span>
          <span style={{ color: '#2563eb' }}>
            <ShoppingBag size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {searchStats.new_items} novos
          </span>
          <span style={{ color: '#9333ea' }}>
            <Recycle size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {searchStats.used_items} usados
          </span>
        </div>
      )}

      {/* Search links for manual browsing */}
      {showSearchLinks && searchLinks.length > 0 && (
        <div style={{ marginBottom: '12px', padding: '12px', background: 'white', borderRadius: '8px' }}>
          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: 600 }}>
            Buscar manualmente nas lojas:
          </p>
          {newLinks.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <ShoppingBag size={11} /> NOVOS
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {newLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '11px', padding: '3px 8px', background: '#eff6ff',
                      borderRadius: '6px', color: '#2563eb', textDecoration: 'none',
                      display: 'flex', alignItems: 'center', gap: '3px'
                    }}
                  >
                    <ExternalLink size={9} /> {link.store}
                  </a>
                ))}
              </div>
            </div>
          )}
          {usedLinks.length > 0 && (
            <div>
              <span style={{ fontSize: '11px', color: '#9333ea', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <Recycle size={11} /> USADOS / SEMINOVOS
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {usedLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '11px', padding: '3px 8px', background: '#f5f3ff',
                      borderRadius: '6px', color: '#7c3aed', textDecoration: 'none',
                      display: 'flex', alignItems: 'center', gap: '3px'
                    }}
                  >
                    <ExternalLink size={9} /> {link.store}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual add form */}
      {showManualAdd && (
        <form onSubmit={handleManualAdd} style={{ marginBottom: '12px', padding: '12px', background: 'white', borderRadius: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <input
              value={manualStore}
              onChange={e => setManualStore(e.target.value)}
              placeholder="Nome da loja (ex: OLX, Enjoei...)"
              required
              style={{ fontSize: '13px' }}
            />
            <input
              type="number"
              step="0.01"
              value={manualPrice}
              onChange={e => setManualPrice(e.target.value)}
              placeholder="Preco (R$)"
              required
              style={{ fontSize: '13px' }}
            />
          </div>
          <input
            value={manualUrl}
            onChange={e => setManualUrl(e.target.value)}
            placeholder="URL do produto ou post do Instagram"
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
              Em promocao
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
          Nenhum preco cadastrado. Use "Buscar precos" para crawler automatico,
          "Links diretos" para buscar manualmente, ou "Manual" para adicionar um preco.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {sortedSuggestions.map((s) => {
            const isUsed = s.store_name.includes('usado') || s.store_name.includes('OLX') ||
              s.store_name.includes('Enjoei') || s.store_name.includes('FB ')
            return (
              <div
                key={s.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', background: 'white', borderRadius: '8px',
                  border: s.price === bestPrice ? '2px solid #10b981' : '1px solid #e5e7eb'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {s.price === bestPrice && (
                    <span style={{ fontSize: '10px', background: '#d1fae5', color: '#059669', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                      MELHOR
                    </span>
                  )}
                  {s.is_promotion && <span className="promo-tag">PROMO</span>}
                  {isUsed && (
                    <span style={{ fontSize: '10px', background: '#f5f3ff', color: '#7c3aed', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      USADO
                    </span>
                  )}
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
            )
          })}
        </div>
      )}
    </div>
  )
}
