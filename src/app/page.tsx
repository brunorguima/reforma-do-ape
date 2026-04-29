'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Room, Category, Item } from '@/lib/supabase'
import type { UserID } from '@/lib/constants'
import { USERS, USER_GREETINGS, APP_NAME, APP_SUBTITLE, ACCESS_KEY_USER_MAP } from '@/lib/constants'
import { apiUrl, withProjectId } from '@/lib/project-client'
import UserSelector from '@/components/UserSelector'
import RoomSelector from '@/components/RoomSelector'
import ItemCard from '@/components/ItemCard'
import AddItemModal from '@/components/AddItemModal'
import CostSummary from '@/components/CostSummary'
import ProfessionalsPanel from '@/components/ProfessionalsPanel'
import ObraPanel from '@/components/ObraPanel'
import FinanceiroPanel from '@/components/FinanceiroPanel'
import DocumentsPanel from '@/components/DocumentsPanel'
import WelcomeScreen from '@/components/WelcomeScreen'
import { Plus, Search, Filter, RefreshCw, Sofa, Wrench, HardHat, DollarSign, ShoppingBag, Loader2, ExternalLink, Check, FolderOpen, ChevronDown, Settings } from 'lucide-react'
import { ToastProvider, useToast } from '@/components/Toast'
import RoomManager from '@/components/RoomManager'
import ConfirmModal from '@/components/ConfirmModal'

interface Project {
  id: string
  name: string
  slug: string
  description: string
  project_type: string
  owners: string[]
  is_active: boolean
}

type TabType = 'orcamentos' | 'obra' | 'financeiro' | 'mobilia' | 'documentos'

export default function HomePage() {
  return (
    <ToastProvider>
      <HomeContent />
    </ToastProvider>
  )
}

function HomeContent() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('orcamentos')
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [allowedProjectIds, setAllowedProjectIds] = useState<string[]>([])

  // Restore tab from URL hash on mount + listen for back/forward
  useEffect(() => {
    const validTabs: TabType[] = ['orcamentos', 'obra', 'financeiro', 'mobilia', 'documentos']
    const readHash = () => {
      const hash = window.location.hash.replace('#', '') as TabType
      if (validTabs.includes(hash)) setActiveTab(hash)
    }
    readHash()
    window.addEventListener('hashchange', readHash)
    return () => window.removeEventListener('hashchange', readHash)
  }, [])
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

  const [userRole, setUserRole] = useState<string>('owner')
  const [allowedUsers, setAllowedUsers] = useState<UserID[]>(['bruno', 'graziela', 'mari'])
  const [showWelcome, setShowWelcome] = useState(false)

  const [showRoomManager, setShowRoomManager] = useState(false)
  const [confirmState, setConfirmState] = useState<{ open: boolean; itemId: string; itemName: string }>({ open: false, itemId: '', itemName: '' })

  // Quick search bar state
  const [quickSearch, setQuickSearch] = useState('')
  const [quickResults, setQuickResults] = useState<{title:string;price:number;image:string;url:string;store:string}[]>([])
  const [quickStats, setQuickStats] = useState<{total:number;avgPrice:number;minPrice:number;maxPrice:number}|null>(null)
  const [quickSearching, setQuickSearching] = useState(false)
  const [quickExpanded, setQuickExpanded] = useState(false)
  const [quickSearchLinks, setQuickSearchLinks] = useState<{store:string;url:string}[]>([])

  const handleQuickSearch = async () => {
    if (!quickSearch || quickSearch.length < 2) return
    setQuickSearching(true)
    setQuickResults([])
    setQuickStats(null)
    setQuickSearchLinks([])
    setQuickExpanded(true)
    try {
      const res = await fetch(`/api/product-search?q=${encodeURIComponent(quickSearch)}`)
      const data = await res.json()
      setQuickResults(data.results || [])
      setQuickStats(data.stats || null)
      setQuickSearchLinks(data.searchLinks || [])
    } catch { /* ignore */ }
    finally { setQuickSearching(false) }
  }

  const handleQuickSelect = (product: {title:string;price:number;image:string;url:string;store:string}) => {
    setEditingItem(null)
    setIsModalOpen(true)
    setQuickExpanded(false)
    // Store selected product in sessionStorage so AddItemModal can pick it up
    sessionStorage.setItem('quickProduct', JSON.stringify(product))
  }

  // Load saved user or validate access key from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const key = params.get('key')

    if (key) {
      // Validate access key
      fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_key: key }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.user_id) {
            const keyConfig = ACCESS_KEY_USER_MAP[data.user_id]
            if (keyConfig) {
              setAllowedUsers(keyConfig.users)
              setCurrentUser(keyConfig.users[0])
              setUserRole(keyConfig.role)
              // Show welcome screen for designers on first visit
              if (keyConfig.role === 'designer' && !localStorage.getItem('reforma-welcome-seen')) {
                setShowWelcome(true)
              }
              localStorage.setItem('reforma-current-user', keyConfig.users[0])
              localStorage.setItem('reforma-allowed-users', JSON.stringify(keyConfig.users))
            } else {
              // Direct user_id match (e.g. 'mari')
              const uid = data.user_id as UserID
              setCurrentUser(uid)
              setAllowedUsers([uid])
              setUserRole(data.role)
              // Show welcome screen for designers on first visit
              if (data.role === 'designer' && !localStorage.getItem('reforma-welcome-seen')) {
                setShowWelcome(true)
              }
              localStorage.setItem('reforma-current-user', uid)
              localStorage.setItem('reforma-allowed-users', JSON.stringify([uid]))
            }
            // Multi-project: save allowed project IDs
            const pIds: string[] = data.project_ids || []
            setAllowedProjectIds(pIds)
            localStorage.setItem('reforma-project-ids', JSON.stringify(pIds))
            // Auto-select first project or restore saved
            const savedProjId = localStorage.getItem('reforma-active-project')
            if (savedProjId && pIds.includes(savedProjId)) {
              setActiveProjectId(savedProjId)
            } else if (pIds.length > 0) {
              setActiveProjectId(pIds[0])
              localStorage.setItem('reforma-active-project', pIds[0])
            }
            // Fetch project details
            if (pIds.length > 0) {
              fetch(`/api/projects?ids=${pIds.join(',')}`)
                .then(r => r.json())
                .then(p => setProjects(Array.isArray(p) ? p : []))
                .catch(() => {})
            }
            localStorage.setItem('reforma-access-key', key)
            localStorage.setItem('reforma-user-role', data.role)
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname)
          }
        })
        .catch(() => {})
    } else {
      const saved = localStorage.getItem('reforma-current-user') as UserID
      const savedRole = localStorage.getItem('reforma-user-role')
      const savedAllowed = localStorage.getItem('reforma-allowed-users')
      if (savedAllowed) {
        try {
          const parsed = JSON.parse(savedAllowed) as UserID[]
          setAllowedUsers(parsed)
          // Only restore saved user if they're in the allowed list
          if (saved && parsed.includes(saved)) {
            setCurrentUser(saved)
          } else {
            // Default to first allowed user (owners default to bruno)
            setCurrentUser(parsed[0] || 'bruno')
          }
        } catch {
          // Corrupt data — reset to owner defaults
          setCurrentUser('bruno')
          setAllowedUsers(['bruno', 'graziela', 'mari'])
        }
      } else if (saved && USERS.some(u => u.id === saved)) {
        setCurrentUser(saved)
      } else {
        // No saved state at all — default to bruno (owner)
        setCurrentUser('bruno')
        setAllowedUsers(['bruno', 'graziela', 'mari'])
      }
      if (savedRole) {
        setUserRole(savedRole)
      }
      // Restore project state from localStorage
      const savedProjIds = localStorage.getItem('reforma-project-ids')
      const savedActiveProjId = localStorage.getItem('reforma-active-project')
      if (savedProjIds) {
        try {
          const pIds = JSON.parse(savedProjIds) as string[]
          setAllowedProjectIds(pIds)
          if (savedActiveProjId && pIds.includes(savedActiveProjId)) {
            setActiveProjectId(savedActiveProjId)
          } else if (pIds.length > 0) {
            setActiveProjectId(pIds[0])
          }
          if (pIds.length > 0) {
            fetch(`/api/projects?ids=${pIds.join(',')}`)
              .then(r => r.json())
              .then(p => setProjects(Array.isArray(p) ? p : []))
              .catch(() => {})
          }
        } catch { /* ignore */ }
      } else {
        // No project_ids in localStorage — re-auth with saved key to fetch them
        const savedKey = localStorage.getItem('reforma-access-key')
        if (savedKey) {
          fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_key: savedKey }),
          })
            .then(r => r.json())
            .then(data => {
              if (data.project_ids && data.project_ids.length > 0) {
                const pIds: string[] = data.project_ids
                setAllowedProjectIds(pIds)
                localStorage.setItem('reforma-project-ids', JSON.stringify(pIds))
                setActiveProjectId(pIds[0])
                localStorage.setItem('reforma-active-project', pIds[0])
                fetch(`/api/projects?ids=${pIds.join(',')}`)
                  .then(r => r.json())
                  .then(p => setProjects(Array.isArray(p) ? p : []))
                  .catch(() => {})
              }
            })
            .catch(() => {})
        }
      }
    }
  }, [])

  const handleUserChange = (user: UserID) => {
    setCurrentUser(user)
    localStorage.setItem('reforma-current-user', user)
  }

  const handleProjectChange = (projectId: string) => {
    setActiveProjectId(projectId)
    localStorage.setItem('reforma-active-project', projectId)
  }

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [roomsRes, catsRes, itemsRes] = await Promise.all([
        fetch(apiUrl('/api/rooms', activeProjectId)),
        fetch(apiUrl('/api/categories', activeProjectId)),
        fetch(apiUrl('/api/items', activeProjectId)),
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
  }, [activeProjectId])

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
          body: JSON.stringify(withProjectId(payload, activeProjectId)),
        })
      } else {
        await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(withProjectId(payload, activeProjectId)),
        })
      }
      fetchData()
    } catch (err) {
      console.error('Error saving item:', err)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    // Mari can only delete her own items
    if (currentUser === 'mari' && item?.created_by !== 'mari') {
      toast('Sem permissão para deletar itens de outros usuários', 'error')
      return
    }
    setConfirmState({ open: true, itemId, itemName: item?.name || '' })
  }

  const executeDelete = async () => {
    const { itemId } = confirmState
    const item = items.find(i => i.id === itemId)
    setConfirmState({ open: false, itemId: '', itemName: '' })
    try {
      await fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withProjectId({
          action: 'delete', entity_type: 'item', entity_id: itemId,
          entity_description: `Item "${item?.name}" deletado`,
          old_values: item ? { name: item.name, status: item.status, estimated_price: item.estimated_price } : null,
          performed_by: currentUser,
        }, activeProjectId)),
      })
      await fetch(`/api/items/${itemId}?user=${currentUser}`, { method: 'DELETE' })
      toast(`"${item?.name}" excluído`, 'success')
      fetchData()
    } catch (err) {
      console.error('Error deleting item:', err)
      toast('Erro ao excluir item', 'error')
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

  const activeProject = projects.find(p => p.id === activeProjectId)
  const projectColor = activeProject?.project_type === 'construcao' ? '#f59e0b' : '#6366f1'

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%', margin: '0 auto 16px' }} />
          <div className="skeleton" style={{ width: 160, height: 14, borderRadius: 7, margin: '0 auto' }} />
        </div>
      </div>
    )
  }

  const currentUserObj = USERS.find(u => u.id === currentUser)

  const handleWelcomeDismiss = () => {
    setShowWelcome(false)
    localStorage.setItem('reforma-welcome-seen', 'true')
  }

  return (
    <>
      {showWelcome && (
        <WelcomeScreen
          userRole={userRole}
          userId={currentUser}
          onDismiss={handleWelcomeDismiss}
        />
      )}

      {/* === HEADER === */}
      <header className="app-header">
        <div className="app-header-left">
          <span className="app-logo">Reforma App</span>

          {/* Project Selector Pill */}
          {projects.length > 1 ? (
            <div className="project-pill" style={{ background: projectColor }}>
              <select
                value={activeProjectId || ''}
                onChange={e => handleProjectChange(e.target.value)}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown size={12} />
            </div>
          ) : activeProject && (
            <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>{activeProject.name}</span>
          )}
        </div>

        <div className="app-header-right">
          <button
            onClick={handleRefresh}
            style={{ padding: 6, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center' }}
            title="Atualizar"
          >
            <RefreshCw size={15} color="rgba(255,255,255,0.7)" className={refreshing ? 'animate-spin' : ''} />
          </button>
          <UserSelector currentUser={currentUser} onUserChange={handleUserChange} allowedUsers={allowedUsers} />
        </div>
      </header>

      <div className="app-container">

      {/* === TAB NAVIGATION === */}
      <nav className="tab-nav">
        {([
          { key: 'orcamentos' as TabType, label: 'Orçamentos', icon: <Wrench size={16} /> },
          { key: 'obra' as TabType, label: 'Obra', icon: <HardHat size={16} /> },
          { key: 'financeiro' as TabType, label: 'Financeiro', icon: <DollarSign size={16} /> },
          { key: 'documentos' as TabType, label: 'Documentos', icon: <FolderOpen size={16} /> },
          { key: 'mobilia' as TabType, label: 'Mobília', icon: <Sofa size={16} /> },
        ]).map(tab => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab.key); window.location.hash = tab.key; }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      {activeTab === 'orcamentos' ? (
        <ProfessionalsPanel currentUser={currentUser} rooms={rooms} projectId={activeProjectId} />
      ) : activeTab === 'obra' ? (
        <ObraPanel currentUser={currentUser} projectId={activeProjectId} />
      ) : activeTab === 'financeiro' ? (
        <FinanceiroPanel currentUser={currentUser} projectId={activeProjectId} />
      ) : activeTab === 'documentos' ? (
        <DocumentsPanel currentUser={currentUser} rooms={rooms} projectId={activeProjectId} />
      ) : (
        <>
          {/* Cost Summary */}
          <div style={{ marginBottom: '24px' }}>
            <CostSummary items={items} />
          </div>

          {/* Room Selector */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Cômodos</h2>
              <button className="btn-ghost" onClick={() => setShowRoomManager(true)} style={{ gap: 4 }}>
                <Settings size={14} />
                Gerenciar
              </button>
            </div>
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
                <option value="ja_temos">🟣 Já Temos</option>
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

          {/* Floating Quick Search Bar */}
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 40,
            background: 'white',
            borderTop: '1px solid #E5E7EB',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
            padding: quickExpanded ? '0' : '12px 16px',
            transition: 'all 0.3s',
          }}>
            {/* Expanded results panel */}
            {quickExpanded && (
              <div style={{
                maxHeight: '60vh',
                overflowY: 'auto',
                padding: '12px 16px 0',
                background: '#F9FAFB',
              }}>
                {/* Stats badges */}
                {quickStats && quickStats.total > 0 && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ padding: '4px 10px', background: '#DBEAFE', borderRadius: '8px', color: '#1E40AF', fontWeight: 700, fontSize: '12px' }}>
                      {quickStats.total} resultado{quickStats.total !== 1 ? 's' : ''}
                    </span>
                    <span style={{ padding: '4px 10px', background: '#D1FAE5', borderRadius: '8px', color: '#065F46', fontWeight: 700, fontSize: '12px' }}>
                      Média: R$ {quickStats.avgPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span style={{ padding: '4px 10px', background: '#FEF3C7', borderRadius: '8px', color: '#92400E', fontWeight: 700, fontSize: '12px' }}>
                      Min: R$ {quickStats.minPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      onClick={() => setQuickExpanded(false)}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: '12px', fontWeight: 600 }}
                    >
                      Fechar ▼
                    </button>
                  </div>
                )}

                {/* Loading */}
                {quickSearching && (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#6B7280' }}>
                    <Loader2 size={22} className="spin" style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                    <p style={{ fontSize: '13px', marginTop: '8px' }}>Buscando em Amazon, Zoom e Buscapé...</p>
                  </div>
                )}

                {/* Results grid */}
                {!quickSearching && quickResults.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '8px', paddingBottom: '8px' }}>
                    {quickResults.map((product, i) => (
                      <div
                        key={i}
                        onClick={() => handleQuickSelect(product)}
                        style={{
                          display: 'flex', gap: '10px', padding: '10px',
                          background: 'white', borderRadius: '10px', cursor: 'pointer',
                          border: '1px solid #E5E7EB', transition: 'all 0.15s',
                          position: 'relative',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2563EB'; (e.currentTarget as HTMLElement).style.background = '#F0F7FF' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLElement).style.background = 'white' }}
                      >
                        {product.image && (
                          <div style={{ position: 'relative', flexShrink: 0 }} className="img-zoom-container">
                            <img
                              src={product.image}
                              alt=""
                              style={{ width: '52px', height: '52px', objectFit: 'contain', borderRadius: '8px', background: '#F3F4F6', cursor: 'zoom-in', transition: 'transform 0.2s' }}
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                              onMouseEnter={e => {
                                const img = e.target as HTMLImageElement
                                const zoom = document.createElement('div')
                                zoom.id = `zoom-${i}`
                                zoom.style.cssText = `position:fixed;z-index:9999;pointer-events:none;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.25);background:white;padding:8px;`
                                const rect = img.getBoundingClientRect()
                                zoom.style.left = `${rect.left - 160}px`
                                zoom.style.bottom = `${window.innerHeight - rect.top + 8}px`
                                const zoomImg = document.createElement('img')
                                zoomImg.src = product.image
                                zoomImg.style.cssText = 'width:200px;height:200px;object-fit:contain;border-radius:8px;'
                                zoom.appendChild(zoomImg)
                                document.body.appendChild(zoom)
                              }}
                              onMouseLeave={() => {
                                const zoom = document.getElementById(`zoom-${i}`)
                                if (zoom) zoom.remove()
                              }}
                            />
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            title={product.title}
                            style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {product.title}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <span style={{ fontSize: '15px', fontWeight: 800, color: '#059669' }}>
                              R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <span style={{ fontSize: '10px', color: '#6B7280', background: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>
                              {product.store}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          {product.url && (
                            <a
                              href={product.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              title="Ver na loja"
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: '#F3F4F6', transition: 'background 0.15s' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#DBEAFE' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#F3F4F6' }}
                            >
                              <ExternalLink size={14} color="#2563EB" />
                            </a>
                          )}
                          <Plus size={18} color="#2563EB" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* No results - show manual links */}
                {!quickSearching && quickResults.length === 0 && quickSearchLinks.length > 0 && (
                  <div style={{ padding: '16px', textAlign: 'center' }}>
                    <p style={{ color: '#6B7280', fontSize: '13px', marginBottom: '10px' }}>Nenhum resultado automático. Busque manualmente:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', paddingBottom: '8px' }}>
                      {quickSearchLinks.map((link, i) => (
                        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: 'white', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#374151', textDecoration: 'none' }}>
                          <ExternalLink size={11} /> {link.store}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom search input bar */}
            <div style={{
              display: 'flex', gap: '8px', alignItems: 'center',
              padding: quickExpanded ? '10px 16px' : '0',
              background: 'white',
            }}>
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#F3F4F6',
                borderRadius: '12px',
                padding: '10px 14px',
                border: '2px solid transparent',
                transition: 'all 0.2s',
              }}
              onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2563EB'; (e.currentTarget as HTMLElement).style.background = 'white' }}
              onBlur={e => { if (!quickExpanded) { (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; (e.currentTarget as HTMLElement).style.background = '#F3F4F6' } }}
              >
                <ShoppingBag size={18} color="#6B7280" />
                <input
                  value={quickSearch}
                  onChange={e => setQuickSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleQuickSearch() } }}
                  onFocus={() => { if (quickResults.length > 0 || quickSearchLinks.length > 0) setQuickExpanded(true) }}
                  placeholder="Buscar produto na internet e adicionar..."
                  style={{
                    flex: 1, border: 'none', background: 'transparent', outline: 'none',
                    fontSize: '14px', color: '#1F2937', padding: 0,
                  }}
                />
                {quickSearch && (
                  <button onClick={() => { setQuickSearch(''); setQuickResults([]); setQuickStats(null); setQuickExpanded(false); setQuickSearchLinks([]) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#9CA3AF' }}>
                    ✕
                  </button>
                )}
              </div>
              <button
                onClick={handleQuickSearch}
                disabled={quickSearching || quickSearch.length < 2}
                style={{
                  padding: '10px 18px',
                  background: quickSearching ? '#93C5FD' : 'linear-gradient(135deg, #2563EB, #7C3AED)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: quickSearching ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                }}
              >
                {quickSearching ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
                Buscar
              </button>
              <button
                onClick={() => { setEditingItem(null); setIsModalOpen(true); setQuickExpanded(false) }}
                style={{
                  padding: '10px',
                  background: '#F3F4F6',
                  color: '#374151',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Adicionar manualmente"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Spacer for fixed bottom bar */}
          <div style={{ height: '80px' }} />

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
      )}
    </div>

      {/* Room Manager Modal */}
      {showRoomManager && (
        <RoomManager
          rooms={rooms}
          projectId={activeProjectId}
          onRoomsChange={() => { fetchData(); }}
          onClose={() => setShowRoomManager(false)}
        />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmState.open}
        title="Excluir item"
        message={`Tem certeza que deseja excluir "${confirmState.itemName}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        danger
        onConfirm={executeDelete}
        onCancel={() => setConfirmState({ open: false, itemId: '', itemName: '' })}
      />
    </>
  )
}
