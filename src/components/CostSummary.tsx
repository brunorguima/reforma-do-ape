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
    <div className="total-banner">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={20} /> Resumo de Custos
        </h3>
        <span style={{ fontSize: '12px', opacity: 0.8 }}>
          {itemCount} itens ({withoutPrice} sem preço)
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>Total Estimado</div>
          <div style={{ fontSize: '22px', fontWeight: 800 }}>{formatCurrency(totalEstimated)}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <Star size={12} /> Desejados
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700 }}>{formatCurrency(totalDesejado)}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <CheckCircle size={12} /> Aprovados
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700 }}>{formatCurrency(totalApproved)}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <ShoppingCart size={12} /> Comprados
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700 }}>{formatCurrency(totalPurchased)}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <Package size={12} /> Já Temos ({jaTemosCount})
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700 }}>{formatCurrency(totalJaTemos)}</div>
        </div>
      </div>
    </div>
  )
}
