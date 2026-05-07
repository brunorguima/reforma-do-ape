'use client'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Bell, X, CheckCheck, ClipboardCheck, Package, DollarSign, AlertTriangle, Info } from 'lucide-react'

interface Notification {
  id: string
  project_id: string
  recipient_type: string
  title: string
  body: string
  type: 'info' | 'measurement' | 'material_request' | 'payment' | 'alert'
  reference_id?: string
  url?: string
  is_read: boolean
  created_at: string
}

const TYPE_ICONS = {
  info: Info,
  measurement: ClipboardCheck,
  material_request: Package,
  payment: DollarSign,
  alert: AlertTriangle,
}

const TYPE_STYLES = {
  info: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-600' },
  measurement: { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-600' },
  material_request: { bg: 'bg-primary/5', border: 'border-primary/10', text: 'text-primary' },
  payment: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600' },
  alert: { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-600' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'AGORA'
  if (mins < 60) return `${mins}MIN`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}H`
  const days = Math.floor(hours / 24)
  return `${days}D`
}

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const notifDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (notifDate.getTime() === today.getTime()) return 'Hoje'
  if (notifDate.getTime() === yesterday.getTime()) return 'Ontem'
  return 'Anteriores'
}

export default function NotificationBell({
  projectId,
  recipientType = 'owner',
}: {
  projectId?: string | null
  recipientType?: string
}) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.is_read).length

  const groupedNotifications = useMemo(() => {
    const groups: Record<string, Notification[]> = {}
    const order = ['Hoje', 'Ontem', 'Anteriores']
    for (const n of notifications) {
      const group = getDateGroup(n.created_at)
      if (!groups[group]) groups[group] = []
      groups[group].push(n)
    }
    return order.filter(g => groups[g]?.length).map(g => ({ label: g, items: groups[g] }))
  }, [notifications])

  const fetchNotifications = useCallback(async () => {
    if (!projectId) return
    try {
      const res = await fetch(
        `/api/notifications?project_id=${projectId}&recipient_type=${recipientType}&limit=20`
      )
      const data = await res.json()
      setNotifications(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching notifications:', err)
    }
  }, [projectId, recipientType])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const markAllRead = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all_read: true, project_id: projectId, recipient_type: recipientType }),
      })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const markRead = async (ids: string[]) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n))
    } catch {
      // ignore
    }
  }

  // Request browser notification permission
  const requestPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  return (
    <div ref={panelRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          requestPermission()
        }}
        className="p-2 rounded-full hover:bg-surface-container transition-colors active:scale-95 relative"
      >
        <Bell size={20} className="text-on-surface-variant" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] rounded-full bg-secondary text-white text-[10px] font-black flex items-center justify-center border-2 border-surface-lowest px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full right-0 w-[360px] max-h-[480px] bg-surface-lowest border border-outline-variant rounded-2xl shadow-xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-outline-variant flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[15px] text-on-surface">Notificações</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-black bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">
                  {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={loading}
                  className="text-[10px] font-black text-secondary uppercase tracking-widest px-2 py-1 rounded-lg hover:bg-secondary/5 transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <CheckCheck size={12} />
                  Marcar tudo
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-surface-container transition-colors"
              >
                <X size={16} className="text-outline" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center mb-3">
                  <Bell size={24} className="text-outline opacity-40" />
                </div>
                <p className="text-sm text-outline font-medium">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="p-3 space-y-4">
                {groupedNotifications.map(group => (
                  <div key={group.label}>
                    {/* Date section header */}
                    <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-2 px-1">
                      {group.label}
                    </p>

                    <div className="space-y-2">
                      {group.items.map(n => {
                        const IconComp = TYPE_ICONS[n.type] || Info
                        const styles = TYPE_STYLES[n.type] || TYPE_STYLES.info

                        return (
                          <div
                            key={n.id}
                            onClick={() => {
                              if (!n.is_read) markRead([n.id])
                              if (n.url) {
                                window.location.hash = n.url
                                setIsOpen(false)
                              }
                            }}
                            className={`
                              bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 flex gap-4 shadow-sm
                              transition-colors
                              ${n.url ? 'cursor-pointer hover:bg-surface-container-low' : ''}
                              ${!n.is_read ? 'bg-secondary/[0.03]' : ''}
                            `}
                          >
                            {/* Type icon */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${styles.bg} border ${styles.border} ${styles.text}`}>
                              <IconComp size={18} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-[13px] text-on-surface mb-0.5 ${n.is_read ? 'font-medium' : 'font-bold'}`}>
                                {n.title}
                              </p>
                              <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">
                                {n.body}
                              </p>
                              <p className="text-[10px] font-bold text-outline uppercase tracking-wider mt-2">
                                {timeAgo(n.created_at)}
                              </p>
                            </div>

                            {/* Unread indicator */}
                            {!n.is_read && (
                              <div className="w-2 h-2 bg-secondary rounded-full shrink-0 mt-1.5" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
