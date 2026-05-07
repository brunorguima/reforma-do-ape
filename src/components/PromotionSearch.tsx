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
    <div className="mt-4 p-4 bg-[#fefce8] rounded-md border border-[#fde68a]">
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <h4 className="text-sm font-bold text-[#92400e] flex items-center gap-1.5">
          <TrendingDown size={16} /> Precos e Promocoes
        </h4>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={handleSearch}
            disabled={searching}
            className={`text-xs px-3 py-1 rounded-sm border-none font-semibold flex items-center gap-1 bg-[#f59e0b] text-white ${searching ? 'cursor-not-allowed opacity-70' : 'cursor-pointer opacity-100'}`}
          >
            {searching ? <Loader2 size={12} /> : <Search size={12} />}
            {searching ? 'Buscando...' : 'Buscar precos'}
          </button>
          <button
            onClick={handleGetLinks}
            className="text-xs px-3 py-1 rounded-sm border-none cursor-pointer bg-[#e0e7ff] text-[#4338ca] font-semibold flex items-center gap-1"
          >
            <Globe size={12} /> Links diretos
          </button>
          <button
            onClick={() => setShowManualAdd(!showManualAdd)}
            className="text-xs px-3 py-1 rounded-sm border-none cursor-pointer bg-[#fde68a] text-[#92400e] font-semibold flex items-center gap-1"
          >
            <Plus size={12} /> Manual
          </button>
        </div>
      </div>

      {/* Search stats */}
      {searchStats && (
        <div className="flex gap-3 mb-3 text-xs">
          <span className="text-success font-semibold">
            {searchStats.found} resultados encontrados
          </span>
          <span className="text-[#2563eb]">
            <ShoppingBag size={11} className="inline align-middle" /> {searchStats.new_items} novos
          </span>
          <span className="text-[#9333ea]">
            <Recycle size={11} className="inline align-middle" /> {searchStats.used_items} usados
          </span>
        </div>
      )}

      {/* Search links for manual browsing */}
      {showSearchLinks && searchLinks.length > 0 && (
        <div className="mb-3 p-3 bg-white rounded-sm">
          <p className="text-xs text-[#6b7280] mb-2 font-semibold">
            Buscar manualmente nas lojas:
          </p>
          {newLinks.length > 0 && (
            <div className="mb-2">
              <span className="text-[11px] text-[#2563eb] font-bold flex items-center gap-1 mb-1">
                <ShoppingBag size={11} /> NOVOS
              </span>
              <div className="flex gap-1.5 flex-wrap">
                {newLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] px-2 py-[3px] bg-[#eff6ff] rounded-[6px] text-[#2563eb] no-underline flex items-center gap-[3px]"
                  >
                    <ExternalLink size={9} /> {link.store}
                  </a>
                ))}
              </div>
            </div>
          )}
          {usedLinks.length > 0 && (
            <div>
              <span className="text-[11px] text-[#9333ea] font-bold flex items-center gap-1 mb-1">
                <Recycle size={11} /> USADOS / SEMINOVOS
              </span>
              <div className="flex gap-1.5 flex-wrap">
                {usedLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] px-2 py-[3px] bg-[#f5f3ff] rounded-[6px] text-[#7c3aed] no-underline flex items-center gap-[3px]"
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
        <form onSubmit={handleManualAdd} className="mb-3 p-3 bg-white rounded-sm">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input
              value={manualStore}
              onChange={e => setManualStore(e.target.value)}
              placeholder="Nome da loja (ex: OLX, Enjoei...)"
              required
              className="text-[13px]"
            />
            <input
              type="number"
              step="0.01"
              value={manualPrice}
              onChange={e => setManualPrice(e.target.value)}
              placeholder="Preco (R$)"
              required
              className="text-[13px]"
            />
          </div>
          <input
            value={manualUrl}
            onChange={e => setManualUrl(e.target.value)}
            placeholder="URL do produto ou post do Instagram"
            required
            className="text-[13px] mb-2"
          />
          <div className="flex justify-between items-center">
            <label className="text-xs text-[#6b7280] flex items-center gap-1">
              <input
                type="checkbox"
                checked={manualIsPromo}
                onChange={e => setManualIsPromo(e.target.checked)}
                className="w-auto"
              />
              Em promocao
            </label>
            <button type="submit" className="text-xs px-4 py-1.5 rounded-sm border-none cursor-pointer bg-[#f59e0b] text-white font-semibold">
              Salvar
            </button>
          </div>
        </form>
      )}

      {/* Suggestions list */}
      {sortedSuggestions.length === 0 ? (
        <p className="text-[13px] text-[#92400e] text-center p-3">
          Nenhum preco cadastrado. Use "Buscar precos" para crawler automatico,
          "Links diretos" para buscar manualmente, ou "Manual" para adicionar um preco.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {sortedSuggestions.map((s) => {
            const isUsed = s.store_name.includes('usado') || s.store_name.includes('OLX') ||
              s.store_name.includes('Enjoei') || s.store_name.includes('FB ')
            return (
              <div
                key={s.id}
                className={`flex justify-between items-center px-3 py-2 bg-white rounded-sm ${s.price === bestPrice ? 'border-2 border-[#10b981]' : 'border border-[#e5e7eb]'}`}
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  {s.price === bestPrice && (
                    <span className="text-[10px] bg-success-light text-success px-1.5 py-0.5 rounded-[4px] font-bold">
                      MELHOR
                    </span>
                  )}
                  {s.is_promotion && <span className="promo-tag">PROMO</span>}
                  {isUsed && (
                    <span className="text-[10px] bg-[#f5f3ff] text-[#7c3aed] px-1.5 py-0.5 rounded-[4px] font-semibold">
                      USADO
                    </span>
                  )}
                  <span className="text-[13px] font-semibold text-[#374151]">{s.store_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${s.price === bestPrice ? 'text-success' : 'text-[#374151]'}`}>
                    {formatCurrency(s.price)}
                  </span>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[#2563eb]">
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
