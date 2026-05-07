'use client'
import type { Item } from '@/lib/supabase'
import { STATUS_CONFIG, formatCurrency } from '@/lib/constants'
import { TrendingUp, ShoppingCart, CheckCircle, Star, Package } from 'lucide-react'

interface CostSummaryProps {
  items: Item[]
}

export default function CostSummary({ items }: CostSummaryProps) {
  const totalEstimated = items.reduce((sum, item) => sum + ((item.estimated_price || 0) * item.quantity), 0)
  const totalApproved = items.filter(i => i.status === 'aprovado' || i.status === 'comprado').reduce((sum, item) => sum + ((item.estimated_price || 0) * item.quantity), 0)
  const totalPurchased = items.filter(i => i.status === 'comprado').reduce((sum, item) => sum + ((item.estimated_price || 0) * item.quantity), 0)
  const totalDesejado = items.filter(i => i.status === 'desejado').reduce((sum, item) => sum + ((item.estimated_price || 0) * item.quantity), 0)
  const totalJaTemos = items.filter(i => i.status === 'ja_temos').reduce((sum, item) => sum + ((item.estimated_price || 0) * item.quantity), 0)
  const jaTemosCount = items.filter(i => i.status === 'ja_temos').length
  const itemCount = items.length
  const withPrice = items.filter(i => i.estimated_price).length
  const withoutPrice = itemCount - withPrice

  return (
    <div className="bg-gradient-to-br from-primary to-secondary-light text-white rounded-2xl p-5 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <TrendingUp size={20} /> Resumo de Custos
        </h3>
        <span className="text-xs opacity-80">
          {itemCount} itens ({withoutPrice} sem preço)
        </span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
        <div className="bg-white/15 rounded-xl p-4 text-center backdrop-blur-sm">
          <div className="text-xs opacity-80 mb-1">Total Estimado</div>
          <div className="text-[22px] font-extrabold">{formatCurrency(totalEstimated)}</div>
        </div>
        <div className="bg-white/15 rounded-xl p-4 text-center backdrop-blur-sm">
          <div className="text-xs opacity-80 mb-1 flex items-center justify-center gap-1">
            <Star size={12} /> Desejados
          </div>
          <div className="text-lg font-bold">{formatCurrency(totalDesejado)}</div>
        </div>
        <div className="bg-white/15 rounded-xl p-4 text-center backdrop-blur-sm">
          <div className="text-xs opacity-80 mb-1 flex items-center justify-center gap-1">
            <CheckCircle size={12} /> Aprovados
          </div>
          <div className="text-lg font-bold">{formatCurrency(totalApproved)}</div>
        </div>
        <div className="bg-white/15 rounded-xl p-4 text-center backdrop-blur-sm">
          <div className="text-xs opacity-80 mb-1 flex items-center justify-center gap-1">
            <ShoppingCart size={12} /> Comprados
          </div>
          <div className="text-lg font-bold">{formatCurrency(totalPurchased)}</div>
        </div>
        <div className="bg-white/15 rounded-xl p-4 text-center backdrop-blur-sm">
          <div className="text-xs opacity-80 mb-1 flex items-center justify-center gap-1">
            <Package size={12} /> Já Temos ({jaTemosCount})
          </div>
          <div className="text-lg font-bold">{formatCurrency(totalJaTemos)}</div>
        </div>
      </div>
    </div>
  )
}
