'use client'
import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
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
import WelcomeScreen from '@/components/WelcomeScreen'
import MeasurementPanel from '@/components/MeasurementPanel'
import MeasurementApprovalPanel from '@/components/MeasurementApprovalPanel'
import MaterialRequestPanel from '@/components/MaterialRequestPanel'
import DashboardPanel from '@/components/DashboardPanel'
import FeedPanel from '@/components/FeedPanel'
import NotificationBell from '@/components/NotificationBell'
import { Plus, Search, Filter, Home, RefreshCw, Sofa, Wrench, HardHat, DollarSign, ShoppingBag, Loader2, ExternalLink, Check, ClipboardCheck, LayoutDashboard, Package, Camera } from 'lucide-react'

interface Project {
  id: string
  name: string
  slug: string
  description: string
  project_type: string
  owners: string[]
  is_active: boolean
}

type TabType = 'home' | 'orcamentos' | 'obra' | 'financeiro' | 'mobilia' | 'medicoes' | 'pedidos' | 'feed'

const NAV_ITEMS: { key: TabType; label: string; icon: React.ReactNode }[] = [
  { key: 'home', label: 'Home', icon: <LayoutDashboard size={20} /> },
  { key: 'feed', label: 'Diário', icon: <Camera size={20} /> },
  { key: 'orcamentos', label: 'Orçamentos', icon: <Wrench size={20} /> },
  { key: 'obra', label: 'Obra', icon: <HardHat size={20} /> },
  { key: 'medicoes', label: 'Aprovações', icon: <ClipboardCheck size={20} /> },
  { key: 'pedidos', label: 'Pedidos', icon: <Package size={20} /> },
  { key: 'financeiro', label: 'Financeiro', icon: <DollarSign size={20} /> },
  { key: 'mobilia', label: 'Mobília', icon: <Sofa size={20} /> },
]

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>('home')

  // Restore tab from URL hash on mount + listen for back/forward
  useEffect(() => {
    const validTabs: TabType[] = ['home', 'feed', 'orcamentos', 'obra', 'financeiro', 'mobilia', 'medicoes', 'pedidos']
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
  const [professionalId, setProfessionalId] = useState<string | null>(null)
  const [projectIds, setProjectIds] = useState<string[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)

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
            // Save professional context
            if (data.professional_id) {
              setProfessionalId(data.professional_id)
              localStorage.setItem('reforma-professional-id', data.professional_id)
            }
            if (data.project_ids && data.project_ids.length > 0) {
              const pIds: string[] = data.project_ids
              setProjectIds(pIds)
              localStorage.setItem('reforma-project-ids', JSON.stringify(pIds))
              const savedProjId = localStorage.getItem('reforma-active-project')
              if (savedProjId && pIds.includes(savedProjId)) {
                setActiveProjectId(savedProjId)
              } else {
                setActiveProjectId(pIds[0])
              }
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
      const savedProfId = localStorage.getItem('reforma-professional-id')
      if (savedProfId) setProfessionalId(savedProfId)
      const savedProjIds = localStorage.getItem('reforma-project-ids')
      if (savedProjIds) {
        try {
          const pIds = JSON.parse(savedProjIds) as string[]
          setProjectIds(pIds)
          const savedActiveProjId = localStorage.getItem('reforma-active-project')
          if (savedActiveProjId && pIds.includes(savedActiveProjId)) {
            setActiveProjectId(savedActiveProjId)
          } else {
            setActiveProjectId(pIds[0])
          }
          fetch(`/api/projects?ids=${pIds.join(',')}`)
            .then(r => r.json())
            .then(p => setProjects(Array.isArray(p) ? p : []))
            .catch(() => {})
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
                setProjectIds(pIds)
                setActiveProjectId(pIds[0])
                localStorage.setItem('reforma-project-ids', JSON.stringify(pIds))
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

  // Tab navigation handler
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    window.location.hash = tab
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
      alert('Sem permissão para deletar itens de outros usuários')
      return
    }
    if (!confirm('Tem certeza que deseja excluir este item?')) return
    try {
      // Log deletion
      await fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete', entity_type: 'item', entity_id: itemId,
          entity_description: `Item "${item?.name}" deletado`,
          old_values: item ? { name: item.name, status: item.status, estimated_price: item.estimated_price } : null,
          performed_by: currentUser,
        }),
      })
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
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="text-5xl mb-4">🏠</div>
          <p className="text-slate-500 text-base">Carregando...</p>
        </div>
      </div>
    )
  }

  const greeting = USER_GREETINGS[currentUser]
  const currentUserObj = USERS.find(u => u.id === currentUser)

  const handleWelcomeDismiss = () => {
    setShowWelcome(false)
    localStorage.setItem('reforma-welcome-seen', 'true')
  }

  // Professional view — completely different UI
  if (userRole === 'professional' && professionalId && projectIds.length > 0) {
    return (
      <div className="app-container">
        <header className="mb-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <HardHat size={28} className="text-warning" />
              <div>
                <h1 className="text-xl font-extrabold text-on-surface m-0">Meus Serviços</h1>
                <p className="text-xs text-on-surface-variant m-0">Aprovações e pagamentos</p>
              </div>
            </div>
            <button
              onClick={() => { localStorage.clear(); window.location.reload() }}
              className="px-3.5 py-2 rounded-sm border border-outline-variant bg-surface-lowest cursor-pointer text-[13px] text-on-surface-variant"
            >
              Sair
            </button>
          </div>
          {greeting && (
            <div className="mt-3 px-4 py-3 rounded-md bg-gradient-to-br from-warning/10 to-warning/5 border-l-4 border-warning">
              <p className="text-base font-bold text-on-surface m-0 mb-0.5">
                {greeting.greeting}
              </p>
              <p className="text-[13px] text-on-surface-variant m-0">{greeting.subtitle}</p>
            </div>
          )}
        </header>
        <MeasurementPanel professionalId={professionalId} projectId={projectIds[0]} />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {showWelcome && (
        <WelcomeScreen
          userRole={userRole}
          userId={currentUser}
          onDismiss={handleWelcomeDismiss}
        />
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-white border-r border-slate-100 z-30">
        {/* Logo / App Name */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white">
            <Home size={20} />
          </div>
          <div className="min-w-0 flex-1">
            {projects.length > 1 ? (
              <select
                className="text-sm font-extrabold text-slate-900 bg-transparent border-none outline-none cursor-pointer w-full truncate"
                value={activeProjectId || ''}
                onChange={e => handleProjectChange(e.target.value)}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            ) : (
              <h1 className="text-sm font-extrabold text-slate-900 truncate">
                {projects[0]?.name || APP_NAME}
              </h1>
            )}
            <p className="text-[11px] text-slate-400 truncate">{APP_SUBTITLE}</p>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const isActive = activeTab === item.key
            return (
              <button
                key={item.key}
                onClick={() => handleTabChange(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* User Selector at Bottom */}
        <div className="px-4 py-4 border-t border-slate-100">
          <UserSelector currentUser={currentUser} onUserChange={handleUserChange} allowedUsers={allowedUsers} />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 pb-24 md:pb-6">
        {/* Top Header (inside main content) */}
        <header className="sticky top-0 z-20 bg-slate-50/80 backdrop-blur-xl border-b border-slate-100 px-4 md:px-8 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile logo */}
              <div className="flex md:hidden items-center justify-center w-9 h-9 rounded-lg bg-blue-600 text-white flex-shrink-0">
                <Home size={18} />
              </div>
              <div className="min-w-0">
                {greeting ? (
                  <>
                    <h2 className="text-lg font-extrabold text-slate-900 truncate">{greeting.greeting}</h2>
                    <p className="text-xs text-slate-500 truncate">{greeting.subtitle}</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-lg font-extrabold text-slate-900 truncate md:hidden">
                      {projects.length > 1 ? (
                        <select
                          className="font-extrabold text-slate-900 bg-transparent border-none outline-none cursor-pointer"
                          value={activeProjectId || ''}
                          onChange={e => handleProjectChange(e.target.value)}
                        >
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      ) : (projects[0]?.name || APP_NAME)}
                    </h2>
                    <p className="text-xs text-slate-500 truncate md:hidden">{APP_SUBTITLE}</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <NotificationBell projectId={activeProjectId} recipientType={userRole === 'professional' ? 'professional' : 'owner'} onNavigate={(tab) => handleTabChange(tab as TabType)} />
              <button
                onClick={handleRefresh}
                className="p-2 rounded-xl bg-white border border-slate-100 hover:bg-slate-50 transition-colors"
                title="Atualizar"
              >
                <RefreshCw size={18} className={`text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              {/* Mobile user selector */}
              <div className="md:hidden">
                <UserSelector currentUser={currentUser} onUserChange={handleUserChange} allowedUsers={allowedUsers} />
              </div>
            </div>
          </div>
        </header>

        {/* Tab Content */}
        <div className="px-4 md:px-8 py-6">
          <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
          >
          {activeTab === 'home' ? (
            <DashboardPanel onNavigate={(tab: string) => handleTabChange(tab as TabType)} projectId={activeProjectId || undefined} />
          ) : activeTab === 'feed' ? (
            <FeedPanel projectId={activeProjectId} currentUser={currentUser === 'bruno' ? 'Bruno' : currentUser === 'graziela' ? 'Graziela' : currentUser === 'mari' ? 'Mari' : currentUser} />
          ) : activeTab === 'orcamentos' ? (
            <ProfessionalsPanel currentUser={currentUser} rooms={rooms} projectId={activeProjectId} />
          ) : activeTab === 'obra' ? (
            <ObraPanel currentUser={currentUser} projectId={activeProjectId} />
          ) : activeTab === 'medicoes' ? (
            <MeasurementApprovalPanel projectId={activeProjectId} />
          ) : activeTab === 'pedidos' ? (
            <MaterialRequestPanel projectId={activeProjectId} />
          ) : activeTab === 'financeiro' ? (
            <FinanceiroPanel currentUser={currentUser} projectId={activeProjectId} />
          ) : (
            <>
              {/* Cost Summary */}
              <div className="mb-6">
                <CostSummary items={items} />
              </div>

              {/* Room Selector */}
              <div className="mb-6">
                <h2 className="text-base font-bold text-slate-700 mb-3">Cômodos</h2>
                <RoomSelector
                  rooms={rooms}
                  selectedRoom={selectedRoom}
                  onRoomSelect={setSelectedRoom}
                  itemCounts={itemCounts}
                  roomTotals={roomTotals}
                />
              </div>

              {/* Search and Filter Bar */}
              <div className="flex gap-3 mb-5 flex-wrap">
                <div className="flex-1 min-w-[200px] relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                  <input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar itens..."
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-on-surface-variant" />
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="w-auto min-w-[140px]"
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
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-on-surface-variant">
                  {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'itens'}
                  {selectedRoom && rooms.find(r => r.id === selectedRoom) && (
                    <span> em <strong>{rooms.find(r => r.id === selectedRoom)?.name}</strong></span>
                  )}
                </p>
              </div>

              {/* Items Grid */}
              {filteredItems.length === 0 ? (
                <div className="text-center py-15 px-5">
                  <div className="text-5xl mb-4">📦</div>
                  <h3 className="text-lg text-on-surface mb-2">Nenhum item encontrado</h3>
                  <p className="text-on-surface-variant mb-5">
                    {searchTerm ? 'Tente outra busca' : 'Comece adicionando itens que vocês desejam para o apartamento!'}
                  </p>
                  <button className="btn-primary" onClick={() => { setEditingItem(null); setIsModalOpen(true) }}>
                    <Plus size={16} className="inline mr-1 align-middle" />
                    Adicionar primeiro item
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
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
              <div className={`fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-outline-variant shadow-[0_-4px_20px_rgba(0,0,0,0.1)] transition-all duration-300 ${quickExpanded ? 'p-0' : 'px-4 py-3'}`}>
                {/* Expanded results panel */}
                {quickExpanded && (
                  <div className="max-h-[60vh] overflow-y-auto px-4 pt-3 bg-surface-container-low">
                    {/* Stats badges */}
                    {quickStats && quickStats.total > 0 && (
                      <div className="flex gap-2 mb-2.5 flex-wrap items-center">
                        <span className="px-2.5 py-1 bg-secondary-container/20 rounded-lg text-secondary font-bold text-xs">
                          {quickStats.total} resultado{quickStats.total !== 1 ? 's' : ''}
                        </span>
                        <span className="px-2.5 py-1 bg-success-light rounded-lg text-success font-bold text-xs">
                          Média: R$ {quickStats.avgPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="px-2.5 py-1 bg-warning-light rounded-lg text-warning font-bold text-xs">
                          Min: R$ {quickStats.minPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <button
                          onClick={() => setQuickExpanded(false)}
                          className="ml-auto bg-transparent border-none cursor-pointer text-on-surface-variant text-xs font-semibold"
                        >
                          Fechar ▼
                        </button>
                      </div>
                    )}

                    {/* Loading */}
                    {quickSearching && (
                      <div className="text-center py-6 text-on-surface-variant">
                        <Loader2 size={22} className="spin inline-block" />
                        <p className="text-[13px] mt-2">Buscando em Amazon, Zoom e Buscapé...</p>
                      </div>
                    )}

                    {/* Results grid */}
                    {!quickSearching && quickResults.length > 0 && (
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-2 pb-2">
                        {quickResults.map((product, i) => (
                          <div
                            key={i}
                            onClick={() => handleQuickSelect(product)}
                            className="flex gap-2.5 p-2.5 bg-white rounded-[10px] cursor-pointer border border-outline-variant hover:border-secondary hover:bg-secondary/5 transition-all relative"
                          >
                            {product.image && (
                              <div className="relative shrink-0">
                                <img
                                  src={product.image}
                                  alt=""
                                  className="w-[52px] h-[52px] object-contain rounded-lg bg-surface-container-low cursor-zoom-in transition-transform duration-200"
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
                            <div className="flex-1 min-w-0">
                              <p title={product.title} className="text-[13px] font-semibold text-on-surface m-0 overflow-hidden text-ellipsis whitespace-nowrap">
                                {product.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[15px] font-extrabold text-success">
                                  R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-[10px] text-on-surface-variant bg-surface-container-low px-1.5 py-0.5 rounded">
                                  {product.store}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {product.url && (
                                <a
                                  href={product.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  title="Ver na loja"
                                  className="flex items-center justify-center w-7 h-7 rounded-md bg-surface-container-low hover:bg-secondary-container/20 transition-colors"
                                >
                                  <ExternalLink size={14} className="text-secondary" />
                                </a>
                              )}
                              <Plus size={18} className="text-secondary" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* No results - show manual links */}
                    {!quickSearching && quickResults.length === 0 && quickSearchLinks.length > 0 && (
                      <div className="p-4 text-center">
                        <p className="text-on-surface-variant text-[13px] mb-2.5">Nenhum resultado automático. Busque manualmente:</p>
                        <div className="flex flex-wrap gap-1.5 justify-center pb-2">
                          {quickSearchLinks.map((link, i) => (
                            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-outline-variant rounded-lg text-xs font-semibold text-on-surface no-underline hover:bg-surface-container-low transition-colors">
                              <ExternalLink size={11} /> {link.store}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom search input bar */}
                <div className={`flex gap-2 items-center bg-white ${quickExpanded ? 'px-4 py-2.5' : ''}`}>
                  <div className="flex-1 flex items-center gap-2 bg-surface-container-low rounded-xl px-3.5 py-2.5 border-2 border-transparent focus-within:border-secondary focus-within:bg-white transition-all">
                    <ShoppingBag size={18} className="text-on-surface-variant" />
                    <input
                      value={quickSearch}
                      onChange={e => setQuickSearch(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleQuickSearch() } }}
                      onFocus={() => { if (quickResults.length > 0 || quickSearchLinks.length > 0) setQuickExpanded(true) }}
                      placeholder="Buscar produto na internet e adicionar..."
                      className="flex-1 border-none bg-transparent outline-none text-sm text-on-surface p-0"
                    />
                    {quickSearch && (
                      <button onClick={() => { setQuickSearch(''); setQuickResults([]); setQuickStats(null); setQuickExpanded(false); setQuickSearchLinks([]) }}
                        className="bg-transparent border-none cursor-pointer p-0.5 text-outline">
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleQuickSearch}
                    disabled={quickSearching || quickSearch.length < 2}
                    className={`px-4 py-2.5 text-white border-none rounded-xl text-sm font-bold cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-md ${
                      quickSearching ? 'bg-secondary-container' : 'bg-gradient-to-br from-secondary to-primary-light'
                    }`}
                  >
                    {quickSearching ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
                    Buscar
                  </button>
                  <button
                    onClick={() => { setEditingItem(null); setIsModalOpen(true); setQuickExpanded(false) }}
                    className="p-2.5 bg-surface-container-low text-on-surface border border-outline-variant rounded-xl cursor-pointer flex items-center hover:bg-surface-container-high transition-colors"
                    title="Adicionar manualmente"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              {/* Spacer for fixed bottom bar */}
              <div className="h-20" />

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
          </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-t border-slate-200 safe-area-bottom">
        <div className="grid grid-cols-6 h-16">
          {NAV_ITEMS.map(item => {
            const isActive = activeTab === item.key
            return (
              <button
                key={item.key}
                onClick={() => handleTabChange(item.key)}
                className={`flex flex-col items-center justify-center gap-0.5 transition-colors duration-150 ${
                  isActive ? 'text-blue-600' : 'text-slate-400'
                }`}
              >
                {item.icon}
                <span className="text-[10px] font-semibold leading-tight">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
