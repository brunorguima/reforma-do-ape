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
  const bestPrice = item.price_suggestions?.length
    ? Math.min(...item.price_suggestions.map(p => p.price))
    : null
  const hasPromo = item.price_suggestions?.some(p => p.is_promotion)

  return (
    <div className="card" style={{ padding: '20px', position: 'relative' }}>
      {/* Status badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            className="status-badge"
            style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
          >
            {statusConfig.label}
          </span>
          {item.category && (
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              {item.category.icon} {item.category.name}
            </span>
          )}
          {hasPromo && <span className="promo-tag">🔥 PROMOÇÃO</span>}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => onEdit(item)}
            style={{ padding: '6px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#f3f4f6' }}
            title="Editar"
          >
            <Pencil size={14} color="#6b7280" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            style={{ padding: '6px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#fef2f2' }}
            title="Excluir"
          >
            <Trash2 size={14} color="#ef4444" />
          </button>
        </div>
      </div>

      {/* Item name and quantity */}
      <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1f2937', marginBottom: '4px' }}>
        {item.name}
        {item.quantity > 1 && (
          <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 400 }}> (x{item.quantity})</span>
        )}
      </h3>

      {item.description && (
        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>{item.description}</p>
      )}

      {/* Images */}
      {item.images && item.images.length > 0 && (
        <div className="image-grid" style={{ marginBottom: '12px' }}>
          {item.images.map((img) => (
            <img key={img.id} src={img.url} alt={img.caption || item.name} />
          ))}
        </div>
      )}

      {/* Price section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
        {item.estimated_price && (
          <span className="price-tag">
            {formatCurrency(item.estimated_price * item.quantity)}
          </span>
        )}
        {bestPrice && bestPrice < (item.estimated_price || Infinity) && (
          <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
            Melhor: {formatCurrency(bestPrice)}
          </span>
        )}
      </div>

      {/* Reference links */}
      {item.reference_links && item.reference_links.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
          {item.reference_links.map((link, i) => (
            <a
              key={i}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                fontSize: '12px', color: '#2563eb', textDecoration: 'none',
                padding: '2px 8px', background: '#eff6ff', borderRadius: '6px'
              }}
            >
              <ExternalLink size={10} /> Ref {i + 1}
            </a>
          ))}
        </div>
      )}

      {/* Footer: suggested by + status actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>
          Sugerido por{' '}
          <span style={{ color: suggestedByUser?.color || '#6b7280', fontWeight: 600 }}>
            {suggestedByUser?.name || item.suggested_by}
          </span>
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {item.status !== 'aprovado' && (
            <button
              onClick={() => onStatusChange(item.id, 'aprovado')}
              style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#d1fae5', color: '#059669', fontWeight: 600 }}
            >
              ✓ Aprovar
            </button>
          )}
          {item.status !== 'comprado' && (
            <button
              onClick={() => onStatusChange(item.id, 'comprado')}
              style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#dbeafe', color: '#2563eb', fontWeight: 600 }}
            >
              <ShoppingCart size={10} style={{ display: 'inline', marginRight: '2px' }} /> Comprado
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
