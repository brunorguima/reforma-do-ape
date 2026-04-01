'use client'
import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, Lock, Clock, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Plus, X, LayoutGrid, List } from 'lucide-react'

interface Task {
  id: string
  notion_id: number
  title: string
  description: string | null
  phase: string
  status: string
  priority: string
  assigned_to: string
  sort_order: number
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  em_andamento: { label: 'Em Andamento', icon: Clock, color: '#2563eb', bg: '#EFF6FF', border: '#BFDBFE' },
  a_fazer: { label: 'A Fazer', icon: ClipboardList, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  bloqueada: { label: 'Bloqueada', icon: Lock, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  concluido: { label: 'Concluído', icon: CheckCircle2, color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  alta: { label: 'Alta', color: '#DC2626', bg: '#FEE2E2' },
  media: { label: 'Média', color: '#D97706', bg: '#FEF3C7' },
  baixa: { label: 'Baixa', color: '#16A34A', bg: '#DCFCE7' },
}

const ASSIGNEE_CONFIG: Record<string, { emoji: string; color: string }> = {
  'Bruno': { emoji: '🔨', color: '#3B82F6' },
  'Gra': { emoji: '🏠', color: '#EC4899' },
  'Designer': { emoji: '🎨', color: '#8B5CF6' },
  'Pedreiro': { emoji: '👷', color: '#F97316' },
  'Arquiteta': { emoji: '📐', color: '#06B6D4' },
  'Téc. Gás': { emoji: '🔧', color: '#EF4444' },
}

const PHASE_ORDER = [
  'Fase 1 — Projeto e Planejamento',
  'Fase 2 — Fornecedores e Orçamentos',
  'Fase 3 — Demolição',
  'Fase 4 — Instalações',
]

// Order: active stuff first, then blocked, then done
const STATUS_ORDER = ['em_andamento', 'a_fazer', 'bloqueada', 'concluido']

export default function ObraPanel() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'status' | 'fase' | 'responsavel'>('status')
  const [layoutMode, setLayoutMode] = useState<'list' | 'kanban'>('list')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['em_andamento', 'a_fazer']))
  const [updatingTask, setUpdatingTask] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', phase: PHASE_ORDER[0], priority: 'media', assigned_to: 'Bruno' })

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks')
      const data = await res.json()
      setTasks(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching tasks:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setUpdatingTask(taskId)
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      await fetchTasks()
    } catch (err) {
      console.error('Error updating task:', err)
    } finally {
      setUpdatingTask(null)
    }
  }

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTask, status: 'a_fazer', sort_order: tasks.length + 1 }),
      })
      await fetchTasks()
      setShowAddModal(false)
      setNewTask({ title: '', description: '', phase: PHASE_ORDER[0], priority: 'media', assigned_to: 'Bruno' })
    } catch (err) { console.error(err) }
  }

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  const groupTasks = (): { key: string; label: string; tasks: Task[] }[] => {
    if (viewMode === 'status') {
      return STATUS_ORDER.map(status => ({
        key: status,
        label: STATUS_CONFIG[status]?.label || status,
        tasks: tasks.filter(t => t.status === status).sort((a, b) => a.sort_order - b.sort_order),
      })).filter(g => g.tasks.length > 0)
    } else if (viewMode === 'fase') {
      return PHASE_ORDER.map(phase => ({
        key: phase,
        label: phase,
        tasks: tasks.filter(t => t.phase === phase).sort((a, b) => a.sort_order - b.sort_order),
      })).filter(g => g.tasks.length > 0)
    } else {
      const assignees = [...new Set(tasks.map(t => t.assigned_to))].sort()
      return assignees.map(assignee => ({
        key: assignee,
        label: `${ASSIGNEE_CONFIG[assignee]?.emoji || '👤'} ${assignee}`,
        tasks: tasks.filter(t => t.assigned_to === assignee).sort((a, b) => a.sort_order - b.sort_order),
      }))
    }
  }

  // Summary stats
  const stats = {
    total: tasks.length,
    concluido: tasks.filter(t => t.status === 'concluido').length,
    em_andamento: tasks.filter(t => t.status === 'em_andamento').length,
    a_fazer: tasks.filter(t => t.status === 'a_fazer').length,
    bloqueada: tasks.filter(t => t.status === 'bloqueada').length,
  }
  const progressPercent = stats.total > 0 ? Math.round((stats.concluido / stats.total) * 100) : 0

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏗️</div>
        <p style={{ color: '#6b7280' }}>Carregando tarefas da obra...</p>
      </div>
    )
  }

  const groups = groupTasks()

  return (
    <div>
      {/* Progress Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1E40AF, #7C3AED)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        color: 'white',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Progresso da Obra</h2>
          <span style={{ fontSize: '28px', fontWeight: 800 }}>{progressPercent}%</span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '8px', height: '10px', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{
            width: `${progressPercent}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #34D399, #10B981)',
            borderRadius: '8px',
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {[
            { label: 'Concluídas', value: stats.concluido, color: '#34D399' },
            { label: 'Andamento', value: stats.em_andamento, color: '#60A5FA' },
            { label: 'A Fazer', value: stats.a_fazer, color: '#FBBF24' },
            { label: 'Bloqueadas', value: stats.bloqueada, color: '#F87171' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 800 }}>{s.value}</div>
              <div style={{ fontSize: '11px', opacity: 0.8 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* View Mode Toggle */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: '#f3f4f6', borderRadius: '10px', padding: '3px' }}>
        {[
          { key: 'status', label: 'Status' },
          { key: 'fase', label: 'Fase' },
          { key: 'responsavel', label: 'Responsável' },
        ].map(v => (
          <button
            key={v.key}
            onClick={() => {
              setViewMode(v.key as any)
              if (v.key === 'status') setExpandedGroups(new Set(['em_andamento', 'a_fazer']))
              else setExpandedGroups(new Set(PHASE_ORDER.slice(0, 2)))
            }}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              transition: 'all 0.2s',
              background: viewMode === v.key ? 'white' : 'transparent',
              color: viewMode === v.key ? '#1E40AF' : '#6b7280',
              boxShadow: viewMode === v.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Layout Toggle */}
      {viewMode === 'status' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px', gap: '4px' }}>
          <button onClick={() => setLayoutMode('list')} style={{
            padding: '6px 10px', borderRadius: '8px', border: '1px solid #E5E7EB', cursor: 'pointer',
            background: layoutMode === 'list' ? '#1E40AF' : 'white', color: layoutMode === 'list' ? 'white' : '#6B7280',
          }}>
            <List size={16} />
          </button>
          <button onClick={() => setLayoutMode('kanban')} style={{
            padding: '6px 10px', borderRadius: '8px', border: '1px solid #E5E7EB', cursor: 'pointer',
            background: layoutMode === 'kanban' ? '#1E40AF' : 'white', color: layoutMode === 'kanban' ? 'white' : '#6B7280',
          }}>
            <LayoutGrid size={16} />
          </button>
        </div>
      )}

      {/* KANBAN VIEW (side-by-side columns) */}
      {viewMode === 'status' && layoutMode === 'kanban' ? (
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '16px', minHeight: '400px' }}>
          {STATUS_ORDER.map(status => {
            const conf = STATUS_CONFIG[status]
            const columnTasks = tasks.filter(t => t.status === status).sort((a, b) => a.sort_order - b.sort_order)
            return (
              <div key={status} style={{
                minWidth: '260px', maxWidth: '300px', flex: '1 0 260px',
                borderRadius: '12px', border: `1px solid ${conf.border}`, background: conf.bg, display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `1px solid ${conf.border}` }}>
                  <conf.icon size={16} color={conf.color} />
                  <span style={{ fontWeight: 700, fontSize: '13px', color: conf.color }}>{conf.label}</span>
                  <span style={{
                    background: conf.color, color: 'white', borderRadius: '10px', padding: '1px 8px', fontSize: '11px', fontWeight: 700, marginLeft: 'auto',
                  }}>{columnTasks.length}</span>
                </div>
                <div style={{ padding: '8px', flex: 1, overflowY: 'auto' }}>
                  {columnTasks.map(task => {
                    const assignee = ASSIGNEE_CONFIG[task.assigned_to]
                    const priority = PRIORITY_CONFIG[task.priority]
                    return (
                      <div key={task.id} style={{
                        padding: '10px 12px', borderRadius: '8px', marginBottom: '6px', background: 'white',
                        border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937', margin: '0 0 6px', lineHeight: 1.3 }}>
                          {task.title}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                            background: assignee?.color ? `${assignee.color}15` : '#F3F4F6', color: assignee?.color || '#6B7280',
                          }}>{assignee?.emoji || '👤'} {task.assigned_to}</span>
                          {priority && (
                            <span style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: priority.bg, color: priority.color }}>
                              {priority.label}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* LIST VIEW (collapsible groups) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {groups.map(group => {
            const isExpanded = expandedGroups.has(group.key)
            const statusConf = STATUS_CONFIG[group.key]
            const groupColor = statusConf?.color || '#6B7280'

            return (
              <div key={group.key} style={{
                borderRadius: '12px',
                border: `1px solid ${statusConf?.border || '#E5E7EB'}`,
                overflow: 'hidden',
                background: 'white',
              }}>
                <button
                  onClick={() => toggleGroup(group.key)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', border: 'none', cursor: 'pointer', background: statusConf?.bg || '#F9FAFB',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {statusConf && <statusConf.icon size={18} color={groupColor} />}
                    <span style={{ fontWeight: 700, fontSize: '14px', color: groupColor }}>{group.label}</span>
                    <span style={{
                      background: groupColor, color: 'white', borderRadius: '12px', padding: '2px 10px', fontSize: '12px', fontWeight: 700,
                    }}>{group.tasks.length}</span>
                  </div>
                  {isExpanded ? <ChevronUp size={18} color="#9CA3AF" /> : <ChevronDown size={18} color="#9CA3AF" />}
                </button>
                {isExpanded && (
                  <div style={{ padding: '8px' }}>
                    {group.tasks.map(task => (
                      <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} updating={updatingTask === task.id} viewMode={viewMode} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Floating Add Task Button */}
      <button
        onClick={() => setShowAddModal(true)}
        style={{
          position: 'fixed', bottom: '24px', right: '24px', width: '56px', height: '56px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #D97706, #F59E0B)', color: 'white', border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(217, 119, 6, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 40,
        }}
        title="Nova tarefa"
      >
        <Plus size={26} />
      </button>

      {/* Add Task Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50,
        }} onClick={() => setShowAddModal(false)}>
          <div style={{
            background: 'white', borderRadius: '20px 20px 0 0', padding: '24px 20px', width: '100%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Nova Tarefa</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#6B7280" /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Título *</label>
                <input value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Comprar argamassa" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Descrição</label>
                <input value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} placeholder="Detalhes opcionais" style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Fase</label>
                  <select value={newTask.phase} onChange={e => setNewTask(p => ({ ...p, phase: e.target.value }))} style={{ width: '100%' }}>
                    {PHASE_ORDER.map(ph => <option key={ph} value={ph}>{ph.replace(' — ', ' · ')}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Prioridade</label>
                  <select value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))} style={{ width: '100%' }}>
                    <option value="alta">🔴 Alta</option>
                    <option value="media">🟡 Média</option>
                    <option value="baixa">🟢 Baixa</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Responsável</label>
                <select value={newTask.assigned_to} onChange={e => setNewTask(p => ({ ...p, assigned_to: e.target.value }))} style={{ width: '100%' }}>
                  {Object.entries(ASSIGNEE_CONFIG).map(([name, conf]) => (
                    <option key={name} value={name}>{conf.emoji} {name}</option>
                  ))}
                </select>
              </div>
              <button onClick={handleAddTask} disabled={!newTask.title.trim()} style={{
                padding: '14px', borderRadius: '12px', border: 'none', background: newTask.title.trim() ? 'linear-gradient(135deg, #D97706, #F59E0B)' : '#E5E7EB',
                color: 'white', fontWeight: 700, fontSize: '15px', cursor: newTask.title.trim() ? 'pointer' : 'default',
              }}>
                Criar Tarefa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TaskCard({ task, onStatusChange, updating, viewMode }: {
  task: Task
  onStatusChange: (id: string, status: string) => void
  updating: boolean
  viewMode: string
}) {
  const [showActions, setShowActions] = useState(false)
  const assignee = ASSIGNEE_CONFIG[task.assigned_to]
  const priority = PRIORITY_CONFIG[task.priority]
  const statusConf = STATUS_CONFIG[task.status]

  const nextStatuses = STATUS_ORDER.filter(s => s !== task.status)

  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: '10px',
        marginBottom: '6px',
        background: updating ? '#F9FAFB' : 'white',
        border: '1px solid #F3F4F6',
        transition: 'all 0.2s',
        opacity: updating ? 0.6 : 1,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', margin: '0 0 6px', lineHeight: 1.3 }}>
            {task.title}
          </p>
          {task.description && (
            <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 8px', lineHeight: 1.4 }}>
              {task.description}
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            {/* Assignee badge */}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              background: assignee?.color ? `${assignee.color}15` : '#F3F4F6',
              color: assignee?.color || '#6B7280',
            }}>
              {assignee?.emoji || '👤'} {task.assigned_to}
            </span>

            {/* Priority badge */}
            {priority && (
              <span style={{
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                background: priority.bg,
                color: priority.color,
              }}>
                {priority.label}
              </span>
            )}

            {/* Phase badge (show when not grouping by fase) */}
            {viewMode !== 'fase' && (
              <span style={{
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 500,
                background: '#F3F4F6',
                color: '#6B7280',
              }}>
                {task.phase.replace(' — ', ' · ')}
              </span>
            )}

            {/* Status badge (show when not grouping by status) */}
            {viewMode !== 'status' && statusConf && (
              <span style={{
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                background: statusConf.bg,
                color: statusConf.color,
              }}>
                {statusConf.label}
              </span>
            )}
          </div>
        </div>

        {/* Quick action button */}
        <button
          onClick={() => setShowActions(!showActions)}
          style={{
            padding: '6px',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            background: showActions ? '#F3F4F6' : 'white',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <AlertCircle size={16} color="#9CA3AF" />
        </button>
      </div>

      {/* Status change actions */}
      {showActions && (
        <div style={{
          marginTop: '10px',
          paddingTop: '10px',
          borderTop: '1px solid #F3F4F6',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
        }}>
          {nextStatuses.map(status => {
            const conf = STATUS_CONFIG[status]
            return (
              <button
                key={status}
                onClick={() => { onStatusChange(task.id, status); setShowActions(false) }}
                disabled={updating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${conf.border}`,
                  background: conf.bg,
                  color: conf.color,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <conf.icon size={14} />
                {conf.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
