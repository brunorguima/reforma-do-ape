'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, X, Check, CheckCheck, ClipboardCheck, Package, DollarSign, AlertTriangle, Info } from 'lucide-react'

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

const TYPE_COLORS = {
  info: { bg: '#DBEAFE', color: '#2563EB' },
  measurement: { bg: '#FEF3C7', color: '#D97706' },
  material_request: { bg: '#E0E7FF', color: '#4F46E5' },
  payment: { bg: '#D1FAE5', color: '#059669' },
  alert: { bg: '#FEE2E2', color: '#DC2626' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
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
    // Poll every 30s
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
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          requestPermission()
        }}
        className="btn-ghost"
        style={{ padding: 8, position: 'relative' }}
      >
        <Bell size={20} style={{ color: 'var(--color-on-surface-variant)' }} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            width: 18, height: 18, borderRadius: '50%',
            background: '#DC2626', color: 'white',
            fontSize: 10, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid white',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', right: 0,
          width: 360, maxHeight: 480,
          background: 'white', borderRadius: 16,
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          zIndex: 100, overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--color-outline-variant)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-on-surface)' }}>
              Notificações
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: 8, fontSize: 12, fontWeight: 600,
                  padding: '2px 8px', borderRadius: 10,
                  background: '#FEE2E2', color: '#DC2626',
                }}>
                  {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="btn-ghost"
                  style={{ padding: '4px 8px', fontSize: 12, color: 'var(--color-secondary)', fontWeight: 600 }}
                  disabled={loading}
                >
                  <CheckCheck size={14} /> Ler tudo
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="btn-ghost" style={{ padding: 4 }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-outline)' }}>
                <Bell size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <p style={{ fontSize: 14 }}>Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map(n => {
                const IconComp = TYPE_ICONS[n.type] || Info
                const colors = TYPE_COLORS[n.type] || TYPE_COLORS.info

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
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--color-surface-container)',
                      cursor: n.url ? 'pointer' : 'default',
                      background: n.is_read ? 'transparent' : 'var(--color-surface-container-low)',
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: colors.bg, color: colors.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <IconComp size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: n.is_read ? 500 : 700,
                        color: 'var(--color-on-surface)',
                        marginBottom: 2,
                      }}>
                        {n.title}
                      </div>
                      <div style={{
                        fontSize: 12, color: 'var(--color-on-surface-variant)',
                        lineHeight: 1.4,
                      }}>
                        {n.body}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-outline)', marginTop: 4 }}>
                        {timeAgo(n.created_at)}
                      </div>
                    </div>
                    {!n.is_read && (
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: '#2563EB', flexShrink: 0, marginTop: 6,
                      }} />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
