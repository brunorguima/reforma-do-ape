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
    <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2.5">
      <div
        className={`room-card ${selectedRoom === null ? 'active' : ''}`}
        onClick={() => onRoomSelect(null)}
      >
        <div className="text-[28px] mb-2">🏠</div>
        <div className="font-bold text-sm text-on-surface">Todos</div>
        <div className="text-xs text-on-surface-variant mt-1">
          {Object.values(itemCounts).reduce((a, b) => a + b, 0)} itens
        </div>
      </div>
      {rooms.map((room) => (
        <div
          key={room.id}
          className={`room-card ${selectedRoom === room.id ? 'active' : ''}`}
          onClick={() => onRoomSelect(room.id)}
        >
          <div className="text-[28px] mb-2">{room.icon}</div>
          <div className="font-bold text-sm text-on-surface">{room.name}</div>
          <div className="text-xs text-on-surface-variant mt-1">
            {itemCounts[room.id] || 0} itens
          </div>
          {roomTotals[room.id] > 0 && (
            <div className="text-[11px] text-success mt-0.5 font-semibold">
              {formatCurrency(roomTotals[room.id])}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
