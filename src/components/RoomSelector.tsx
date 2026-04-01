'use client'
import type { Room } from '@/lib/supabase'

interface RoomSelectorProps {
  rooms: Room[]
  selectedRoom: string | null
  onRoomSelect: (roomId: string | null) => void
  itemCounts: Record<string, number>
  roomTotals: Record<string, number>
}

export default function RoomSelector({ rooms, selectedRoom, onRoomSelect, itemCounts, roomTotals }: RoomSelectorProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
      <div
        className={`room-card ${selectedRoom === null ? 'active' : ''}`}
        onClick={() => onRoomSelect(null)}
        style={{ textAlign: 'center' }}
      >
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>🏠</div>
        <div style={{ fontWeight: 700, fontSize: '14px', color: '#1f2937' }}>Todos</div>
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
          {Object.values(itemCounts).reduce((a, b) => a + b, 0)} itens
        </div>
      </div>
      {rooms.map((room) => (
        <div
          key={room.id}
          className={`room-card ${selectedRoom === room.id ? 'active' : ''}`}
          onClick={() => onRoomSelect(room.id)}
          style={{ textAlign: 'center' }}
        >
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>{room.icon}</div>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#1f2937' }}>{room.name}</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            {itemCounts[room.id] || 0} itens
          </div>
          {roomTotals[room.id] > 0 && (
            <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px', fontWeight: 600 }}>
              {formatCurrency(roomTotals[room.id])}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
