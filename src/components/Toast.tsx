'use client'
import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { Check, X, AlertTriangle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <ToastNotification key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastNotification({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(item.id), 3500)
    return () => clearTimeout(timer)
  }, [item.id, onDismiss])

  const icons: Record<ToastType, React.ReactNode> = {
    success: <Check size={16} />,
    error: <X size={16} />,
    warning: <AlertTriangle size={16} />,
    info: <Info size={16} />,
  }

  const colors: Record<ToastType, string> = {
    success: 'var(--success)',
    error: 'var(--danger)',
    warning: 'var(--warning)',
    info: 'var(--info)',
  }

  return (
    <div
      className="toast"
      style={{
        background: colors[item.type],
        color: 'white',
        cursor: 'pointer',
      }}
      onClick={() => onDismiss(item.id)}
    >
      {icons[item.type]}
      <span>{item.message}</span>
    </div>
  )
}
