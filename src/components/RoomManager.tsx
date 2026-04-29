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
      <div className="modal-content" style={{ maxWidth: 480 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={18} color="var(--accent)" />
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Gerenciar Cômodos</h2>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        {/* Existing rooms list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {rooms.map((room) => (
            <div
              key={room.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: editingId === room.id ? 'var(--accent-light)' : 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: editingId === room.id ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                transition: 'all var(--transition)',
              }}
            >
              <GripVertical size={14} color="var(--text-muted)" style={{ flexShrink: 0, cursor: 'grab' }} />

              {editingId === room.id ? (
                <>
                  {/* Icon picker button */}
                  <button
                    onClick={() => setShowIconPicker(showIconPicker === room.id ? null : room.id)}
                    style={{
                      fontSize: 22, background: 'white', border: '1.5px solid var(--border)',
                      borderRadius: 'var(--radius-sm)', padding: '4px 8px', cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {editIcon}
                  </button>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                    autoFocus
                    style={{ flex: 1, padding: '6px 10px', fontSize: 14 }}
                  />
                  <button onClick={saveEdit} disabled={saving} className="btn-ghost" style={{ color: 'var(--success)', padding: 4 }}>
                    <Check size={18} />
                  </button>
                  <button onClick={cancelEdit} className="btn-ghost" style={{ color: 'var(--text-muted)', padding: 4 }}>
                    <X size={18} />
                  </button>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{room.icon}</span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{room.name}</span>
                  <button onClick={() => startEdit(room)} className="btn-ghost" style={{ padding: 4 }}>
                    <Pencil size={14} />
                  </button>
                  {confirmDelete === room.id ? (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}>Excluir?</span>
                      <button onClick={() => deleteRoom(room.id)} disabled={saving} className="btn-ghost" style={{ color: 'var(--danger)', padding: 4 }}>
                        <Check size={14} />
                      </button>
                      <button onClick={() => setConfirmDelete(null)} className="btn-ghost" style={{ padding: 4 }}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setConfirmDelete(room.id); setEditingId(null) }} className="btn-ghost" style={{ padding: 4 }}>
                      <Trash2 size={14} color="var(--text-muted)" />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}

          {/* Inline icon picker dropdown */}
          {showIconPicker && editingId && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 6, padding: 10,
              background: 'white', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)',
            }}>
              {ROOM_ICONS.map(icon => (
                <button
                  key={icon}
                  onClick={() => { setEditIcon(icon); setShowIconPicker(null) }}
                  style={{
                    fontSize: 20, padding: '6px 8px', background: editIcon === icon ? 'var(--accent-light)' : 'transparent',
                    border: editIcon === icon ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all var(--transition)',
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          )}

          {rooms.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '16px 0' }}>
              Nenhum cômodo cadastrado. Adicione o primeiro abaixo.
            </p>
          )}
        </div>

        {/* Add new room */}
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          padding: 12, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)',
          border: '1.5px dashed var(--border)',
        }}>
          {/* New room icon picker */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowIconPicker(showIconPicker === 'new' ? null : 'new')}
              style={{
                fontSize: 22, background: 'white', border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-sm)', padding: '4px 8px', cursor: 'pointer',
              }}
            >
              {newIcon}
            </button>
            {showIconPicker === 'new' && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 0, marginBottom: 6,
                display: 'flex', flexWrap: 'wrap', gap: 4, padding: 8,
                background: 'white', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
                width: 220, zIndex: 10,
              }}>
                {ROOM_ICONS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => { setNewIcon(icon); setShowIconPicker(null) }}
                    style={{
                      fontSize: 18, padding: '4px 6px', background: newIcon === icon ? 'var(--accent-light)' : 'transparent',
                      border: newIcon === icon ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                      borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    }}
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
            style={{ flex: 1, padding: '8px 10px', fontSize: 14 }}
          />
          <button
            onClick={addRoom}
            disabled={saving || !newName.trim()}
            className="btn-primary"
            style={{ padding: '8px 14px', opacity: !newName.trim() ? 0.5 : 1 }}
          >
            <Plus size={16} />
            Adicionar
          </button>
        </div>
      </div>
    </div>
  )
}
