'use client'
import { useState } from 'react'
import { Plus, GripVertical, Pencil, Trash2, Check, X, Settings } from 'lucide-react'
import type { Room } from '@/lib/supabase'

interface RoomManagerProps {
  rooms: Room[]
  projectId: string | null
  onRoomsChange: () => void
  onClose: () => void
}

const ROOM_ICONS = ['🛋️', '🛏️', '🍳', '🚿', '🚽', '👔', '🪴', '🏠', '🧹', '🎮', '🧒', '📚', '🍽️', '👶', '🧺', '🚪', '🏗️']

export default function RoomManager({ rooms, projectId, onRoomsChange, onClose }: RoomManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('🏠')
  const [showIconPicker, setShowIconPicker] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const startEdit = (room: Room) => {
    setEditingId(room.id)
    setEditName(room.name)
    setEditIcon(room.icon)
    setShowIconPicker(null)
    setConfirmDelete(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditIcon('')
  }

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return
    setSaving(true)
    try {
      await fetch('/api/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, name: editName.trim(), icon: editIcon }),
      })
      onRoomsChange()
      setEditingId(null)
    } catch (err) {
      console.error('Error updating room:', err)
    } finally {
      setSaving(false)
    }
  }

  const addRoom = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          icon: newIcon,
          order_index: rooms.length,
          project_id: projectId,
        }),
      })
      onRoomsChange()
      setNewName('')
      setNewIcon('🏠')
    } catch (err) {
      console.error('Error adding room:', err)
    } finally {
      setSaving(false)
    }
  }

  const deleteRoom = async (id: string) => {
    setSaving(true)
    try {
      await fetch(`/api/rooms?id=${id}`, { method: 'DELETE' })
      onRoomsChange()
      setConfirmDelete(null)
    } catch (err) {
      console.error('Error deleting room:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-content max-w-[480px]">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-secondary" />
            <h2 className="text-[17px] font-bold text-on-surface m-0">Gerenciar Cômodos</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X size={18} />
          </button>
        </div>

        {/* Existing rooms list */}
        <div className="flex flex-col gap-1.5 mb-5">
          {rooms.map((room) => (
            <div
              key={room.id}
              className={`flex items-center gap-2.5 py-2.5 px-3 rounded-radius-md transition-all ${
                editingId === room.id
                  ? 'bg-secondary-container border-[1.5px] border-secondary'
                  : 'bg-surface-container-low border-[1.5px] border-transparent'
              }`}
            >
              <GripVertical size={14} className="text-on-surface-variant shrink-0 cursor-grab" />

              {editingId === room.id ? (
                <>
                  {/* Icon picker button */}
                  <button
                    onClick={() => setShowIconPicker(showIconPicker === room.id ? null : room.id)}
                    className="text-[22px] bg-surface-lowest border-[1.5px] border-outline-variant rounded-radius-sm px-2 py-1 cursor-pointer shrink-0"
                  >
                    {editIcon}
                  </button>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                    autoFocus
                    className="flex-1 py-1.5 px-2.5 text-sm"
                  />
                  <button onClick={saveEdit} disabled={saving} className="btn-ghost text-success p-1">
                    <Check size={18} />
                  </button>
                  <button onClick={cancelEdit} className="btn-ghost text-on-surface-variant p-1">
                    <X size={18} />
                  </button>
                </>
              ) : (
                <>
                  <span className="text-[22px] shrink-0">{room.icon}</span>
                  <span className="flex-1 text-sm font-semibold text-on-surface">{room.name}</span>
                  <button onClick={() => startEdit(room)} className="btn-ghost p-1">
                    <Pencil size={14} />
                  </button>
                  {confirmDelete === room.id ? (
                    <div className="flex gap-1 items-center">
                      <span className="text-[11px] text-danger font-semibold">Excluir?</span>
                      <button onClick={() => deleteRoom(room.id)} disabled={saving} className="btn-ghost text-danger p-1">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setConfirmDelete(null)} className="btn-ghost p-1">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setConfirmDelete(room.id); setEditingId(null) }} className="btn-ghost p-1">
                      <Trash2 size={14} className="text-on-surface-variant" />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}

          {/* Inline icon picker dropdown */}
          {showIconPicker && editingId && (
            <div className="flex flex-wrap gap-1.5 p-2.5 bg-surface-lowest rounded-radius-md border border-outline-variant shadow-md">
              {ROOM_ICONS.map(icon => (
                <button
                  key={icon}
                  onClick={() => { setEditIcon(icon); setShowIconPicker(null) }}
                  className={`text-xl py-1.5 px-2 rounded-radius-sm cursor-pointer transition-all ${
                    editIcon === icon
                      ? 'bg-secondary-container border-[1.5px] border-secondary'
                      : 'bg-transparent border-[1.5px] border-transparent'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          )}

          {rooms.length === 0 && (
            <p className="text-center text-on-surface-variant text-[13px] py-4">
              Nenhum cômodo cadastrado. Adicione o primeiro abaixo.
            </p>
          )}
        </div>

        {/* Add new room */}
        <div className="flex gap-2 items-center p-3 bg-surface-container-low rounded-radius-md border-[1.5px] border-dashed border-outline-variant">
          {/* New room icon picker */}
          <div className="relative">
            <button
              onClick={() => setShowIconPicker(showIconPicker === 'new' ? null : 'new')}
              className="text-[22px] bg-surface-lowest border-[1.5px] border-outline-variant rounded-radius-sm px-2 py-1 cursor-pointer"
            >
              {newIcon}
            </button>
            {showIconPicker === 'new' && (
              <div className="absolute bottom-full left-0 mb-1.5 flex flex-wrap gap-1 p-2 bg-surface-lowest rounded-radius-md border border-outline-variant shadow-lg w-[220px] z-10">
                {ROOM_ICONS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => { setNewIcon(icon); setShowIconPicker(null) }}
                    className={`text-lg py-1 px-1.5 rounded-radius-sm cursor-pointer ${
                      newIcon === icon
                        ? 'bg-secondary-container border-[1.5px] border-secondary'
                        : 'bg-transparent border-[1.5px] border-transparent'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addRoom() }}
            placeholder="Nome do novo cômodo..."
            className="flex-1 py-2 px-2.5 text-sm"
          />
          <button
            onClick={addRoom}
            disabled={saving || !newName.trim()}
            className={`btn-primary py-2 px-3.5 ${!newName.trim() ? 'opacity-50' : ''}`}
          >
            <Plus size={16} />
            Adicionar
          </button>
        </div>
      </div>
    </div>
  )
}
