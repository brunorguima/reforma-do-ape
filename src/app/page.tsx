'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Room, Category, Item } from '@/lib/supabase'
import type { UserID } from '@/lib/constants'
import { USERS } from '@/lib/constants'
import UserSelector from '@/components/UserSelector'
import RoomSelector from '@/components/RoomSelector'
import ItemCard from '@/components/ItemCard'
import AddItemModal from '@/components/AddItemModal'
import CostSummary from '@/components/CostSummary'
import ProfessionalsPanel from '@/components/ProfessionalsPanel'
import { Plus, Search, Filter, Home, RefreshCw, Sofa, Wrench } from 'lucide-react'

type TabType = 'mobilia' | 'profissionais'

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>('mobilia')
  const [currentUser, setCurrentUser] = useState<UserID>('bruno')
  const [rooms, setRooms] = useState<Room[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Load saved user
  useEffect(() => {
    const saved = localStorage.getItem('reforma-current-user') as UserID
    if (saved && USERS.some(u => u.id === saved)) {
      setCurrentUser(saved)
    }
  }, [])

  const handleUserChange = (user: UserID) => {
    setCurrentUser(user)
    localStorage.setItem('reforma-current-user', user)
  }

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [roomsRes, catsRes, itemsRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/categories'),
        fetch('/api/items'),
      ])
      const [roomsData, catsData, itemsData] = await Promise.all([
        roomsRes.json(),
        catsRes.json(),
        itemsRes.json(),
      ])
      setRooms(Array.isArray(roomsData) ? roomsData : [])
      setCategories(Array.isArray(catsData) ? catsData : [])
      setItems(Array.isArray(itemsData) ? itemsData : [])
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  // CRUD operations
  const handleSaveItem = async (itemData: Partial<Item>) => {
    try {
      const { images, ...rest } = itemData as any
      const payload = { ...rest, images }

      if (itemData.id) {
        await fetch(`/api/items/${itemData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      fetchData()
    } catch (err) {
      console.error('Error saving item:', err)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return
    try {
      await fetch(`/api/items/${itemId}?user=${currentUser}`, { method: 'DELETE' })
      fetchData()
    } catch (err) {
      console.error('Error deleting item:', err)
    }
  }

  const handleStatusChange = async (itemId: string, status: Item['status']) => {
    try {
      await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, updated_by: currentUser }),
      })
      fetchData()
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  const handleEditItem = (item: Item) => {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  // Filter items
  const filteredItems = items.filter(item => {
    if (selectedRoom && item.room_id !== selectedRoom) return false
    if (filterStatus && item.status !== filterStatus) return false
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return (
        item.name.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term) ||
        item.category?.name?.toLowerCase().includes(term)
      )
    }
    return true
  })

  // Compute counts and totals
  const itemCounts: Record<string, number> = {}
  const roomTotals: Record<string, number> = {}
  items.forEach(item => {
    itemCounts[item.room_id] = (itemCounts[item.room_id] || 0) + 1
    roomTotals[item.room_id] = (roomTotals[item.room_id] || 0) + ((item.estimated_price || 0) * item.quantity)
  })

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</div>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Home size={28} color="#2563eb" />
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1f2937', margin: 0 }}>Reforma do Apê</h1>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Controle completo da reforma</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleRefresh}
            style={{ padding: '8px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: '#f3f4f6' }}
            title="Atualizar"
          >
            <RefreshCw size={18} color="#6b7280" className={refreshing ? 'animate-spin' : ''} />
          </button>
          <UserSelector currentUser={currentUser} onUserChange={handleUserChange} />
        </div>
      </header>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: '#f3f4f6', borderRadius: '12px', padding: '4px' }}>
        <button
          onClick={() => setActiveTab('mobilia')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px 16px',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            transition: 'all 0.2s',
            background: activeTab === 'mobilia' ? 'white' : 'transparent',
            color: activeTab === 'mobilia' ? '#2563eb' : '#6b7280',
            boxShadow: activeTab === 'mobilia' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          <Sofa size={18} />
          Mobília
        </button>
        <button
          onClick={() => setActiveTab('profissionais')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px 16px',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            transition: 'all 0.2s',
            background: activeTab === 'profissionais' ? 'white' : 'transparent',
            color: activeTab === 'profissionais' ? '#7c3aed' : '#6b7280',
            boxShadow: activeTab === 'profissionais' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          <Wrench size={18} />
          Profissionais
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'mobilia' ? (
        <>
          {/* Cost Summary */}
          <div style={{ marginBottom: '24px' }}>
            <CostSummary items={items} />
          </div>

          {/* Room Selector */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>Cômodos</h2>
            <RoomSelector
              rooms={rooms}
              selectedRoom={selectedRoom}
              onRoomSelect={setSelectedRoom}
              itemCounts={itemCounts}
              roomTotals={roomTotals}
            />
          </div>

          {/* Search and Filter Bar */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
              <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar itens..."
                style={{ paddingLeft: '36px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={16} color="#6b7280" />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                style={{ width: 'auto', minWidth: '140px' }}
              >
                <option value="">Todos os status</option>
                <option value="desejado">🟡 Desejado</option>
                <option value="aprovado">🟢 Aprovado</option>
                <option value="comprado">🔵 Comprado</option>
              </select>
            </div>
          </div>

          {/* Items count */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'itens'}
              {selectedRoom && rooms.find(r => r.id === selectedRoom) && (
                <span> em <strong>{rooms.find(r => r.id === selectedRoom)?.name}</strong></span>
              )}
            </p>
          </div>

          {/* Items Grid */}
          {filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
              <h3 style={{ fontSize: '18px', color: '#374151', marginBottom: '8px' }}>Nenhum item encontrado</h3>
              <p style={{ color: '#6b7280', marginBottom: '20px' }}>
                {searchTerm ? 'Tente outra busca' : 'Comece adicionando itens que vocês desejam para o apartamento!'}
              </p>
              <button className="btn-primary" onClick={() => { setEditingItem(null); setIsModalOpen(true) }}>
                <Plus size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                Adicionar primeiro item
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
              {filteredItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItem}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}

          {/* Floating Add Button */}
          <button
            onClick={() => { setEditingItem(null); setIsModalOpen(true) }}
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s',
              zIndex: 40,
            }}
            title="Adicionar novo item"
          >
            <Plus size={28} />
          </button>

          {/* Add/Edit Modal */}
          <AddItemModal
            isOpen={isModalOpen}
            onClose={() => { setIsModalOpen(false); setEditingItem(null) }}
            onSave={handleSaveItem}
            rooms={rooms}
            categories={categories}
            currentUser={currentUser}
            editingItem={editingItem}
          />
        </>
      ) : (
        <ProfessionalsPanel currentUser={currentUser} rooms={rooms} />
      )}
    </div>
  )
}
