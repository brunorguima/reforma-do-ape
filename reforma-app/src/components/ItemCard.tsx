'use client'
import type { Item } from '@/lib/supabase'
import { STATUS_CONFIG, formatCurrency, USERS } from '@/lib/constants'
import { Pencil, Trash2, ExternalLink, Tag, ShoppingCart } from 'lucide-react'

interface ItemCardProps {
  item: Item
  onEdit: (item: Item) => void
  onDelete: (itemId: string) => void
  onStatusChange: (itemId: string, status: Item['status']) => void
}

export default function ItemCard({ item, onEdit, onDelete, onStatusChange }: ItemCardProps) {
  const statusConfig = STATUS_CONFIG[item.status]
  const suggestedByUser = USERS.find(u => u.id === item.suggested_by)
  const bestPrice = item.price_suggestions && item.price_suggestions.length > 0
    ? Math.min(...item.price_suggestions.map(p => p.price ?? 0))
    : null
  const hasPromo = item.price_suggestions?.some(p => p.is_promotion)

  return (
    <div className="card p-5 relative">
      {/* Status badge */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="status-badge"
            style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
          >
            {statusConfig.label}
          </span>
          {item.category && (
            <span className="text-xs text-on-surface-variant">
              {item.category.icon} {item.category.name}
            </span>
          )}
          {hasPromo && <span className="promo-tag">🔥 PROMOÇÃO</span>}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(item)}
            className="p-1.5 rounded-lg border-none cursor-pointer bg-surface-container-low hover:bg-surface-container-high transition-colors"
            title="Editar"
          >
            <Pencil size={14} className="text-on-surface-variant" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-1.5 rounded-lg border-none cursor-pointer bg-danger-light hover:bg-danger/10 transition-colors"
            title="Excluir"
          >
            <Trash2 size={14} className="text-danger" />
          </button>
        </div>
      </div>

      {/* Item name and quantity */}
      <h3 className="text-lg font-bold text-on-surface mb-1">
        {item.name}
        {item.quantity > 1 && (
          <span className="text-sm text-on-surface-variant font-normal"> (x{item.quantity})</span>
        )}
      </h3>

      {item.description && (
        <p className="text-[13px] text-on-surface-variant mb-2">{item.description}</p>
      )}

      {/* Images */}
      {item.images && item.images.length > 0 && (
        <div className="image-grid mb-3">
          {item.images.map((img) => (
            <img key={img.id} src={img.url} alt={img.caption || item.name} />
          ))}
        </div>
      )}

      {/* Price section */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {item.estimated_price && (
          <span className="price-tag">
            {formatCurrency(item.estimated_price * item.quantity)}
          </span>
        )}
        {bestPrice && bestPrice < (item.estimated_price || Infinity) && (
          <span className="text-xs text-success font-semibold">
            Melhor: {formatCurrency(bestPrice)}
          </span>
        )}
      </div>

      {/* Reference links */}
      {item.reference_links && item.reference_links.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-2">
          {item.reference_links.map((link, i) => (
            <a
              key={i}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-secondary no-underline px-2 py-0.5 bg-secondary-container/20 rounded-md hover:bg-secondary-container/30 transition-colors"
            >
              <ExternalLink size={10} /> Ref {i + 1}
            </a>
          ))}
        </div>
      )}

      {/* Footer: suggested by + status actions */}
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-outline-variant/30">
        <span className="text-[11px] text-outline">
          Sugerido por{' '}
          <span style={{ color: suggestedByUser?.color || '#6b7280' }} className="font-semibold">
            {suggestedByUser?.name || item.suggested_by}
          </span>
        </span>
        <div className="flex gap-1">
          {item.status !== 'ja_temos' && item.status !== 'aprovado' && (
            <button
              onClick={() => onStatusChange(item.id, 'aprovado')}
              className="text-[11px] px-2.5 py-1 rounded-md border-none cursor-pointer bg-success-light text-success font-semibold hover:bg-success/20 transition-colors"
            >
              ✓ Aprovar
            </button>
          )}
          {item.status !== 'ja_temos' && item.status !== 'comprado' && (
            <button
              onClick={() => onStatusChange(item.id, 'comprado')}
              className="text-[11px] px-2.5 py-1 rounded-md border-none cursor-pointer bg-secondary-container/20 text-secondary font-semibold hover:bg-secondary-container/30 transition-colors"
            >
              <ShoppingCart size={10} className="inline mr-0.5" /> Comprado
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
