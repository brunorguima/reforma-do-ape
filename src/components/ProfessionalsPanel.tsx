'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Room } from '@/lib/supabase'
import type { UserID } from '@/lib/constants'
import { USERS, formatCurrency } from '@/lib/constants'
import { Plus, User, Phone, Mail, ChevronDown, ChevronUp, Trash2, Edit3, Check, X, Wrench } from 'lucide-react'

interface ServiceCategory {
  id: string
  name: string
  icon: string
  order_index: number
}

interface Professional {
  id: string
  name: string
  phone?: string
  email?: string
  specialty?: string
  notes?: string
  recommended_by?: string
  created_at: string
  created_by: string
}

interface Quote {
  id: string
  professional_id: string
  service_category_id?: string
  room_id?: string
  description: string
  amount: number
  status: 'recebido' | 'avaliando' | 'aprovado' | 'contratado' | 'pago' | 'recusado'
  notes?: string
  scheduled_date?: string
  paid_date?: string
  created_at: string
  created_by: string
  updated_by: string
  professional?: Professional
  service_category?: ServiceCategory
  room?: Room
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  recebido: { label: 'Recebido', color: '#6b7280', bg: '#f3f4f6', emoji: '📩' },
  avaliando: { label: 'Avaliando', color: '#d97706', bg: '#fef3c7', emoji: '🔍' },
  aprovado: { label: 'Aprovado', color: '#059669', bg: '#d1fae5', emoji: '✅' },
  contratado: { label: 'Contratado', color: '#2563eb', bg: '#dbeafe', emoji: '🤝' },
  pago: { label: 'Pago', color: '#7c3aed', bg: '#ede9fe', emoji: '💰' },
  recusado: { label: 'Recusado', color: '#dc2626', bg: '#fee2e2', emoji: '❌' },
}

const STATUS_FLOW = ['recebido', 'avaliando', 'aprovado', 'contratado', 'pago']

interface Props {
  currentUser: UserID
  rooms: Room[]
}

export default function ProfessionalsPanel({ currentUser, rooms }: Props) {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([])
  const [showAddQuote, setShowAddQuote] = useState(false)
  const [showAddProfessional, setShowAddProfessional] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [expandedQuote, setExpandedQuote] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Form states
  const [newProfessional, setNewProfessional] = useState({ name: '', phone: '', email: '', specialty: '', notes: '', recommended_by: '' })
  const [newQuote, setNewQuote] = useState({
    professional_id: '', service_category_id: '', room_id: '',
    description: '', amount: '', notes: '', scheduled_date: ''
  })

  const fetchData = useCallback(async () => {
    try {
      const [quotesRes, prosRes, catsRes] = await Promise.all([
        fetch('/api/quotes'),
        fetch('/api/professionals'),
        fetch('/api/service-categories'),
      ])
      const [quotesData, prosData, catsData] = await Promise.all([
        quotesRes.json(), prosRes.json(), catsRes.json(),
      ])
      setQuotes(Array.isArray(quotesData) ? quotesData : [])
      setProfessionals(Array.isArray(prosData) ? prosData : [])
      setServiceCategories(Array.isArray(catsData) ? catsData : [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Totals
  const activeQuotes = quotes.filter(q => !['recusado'].includes(q.status))
  const totalContratado = activeQuotes.filter(q => ['contratado', 'pago'].includes(q.status)).reduce((s, q) => s + Number(q.amount), 0)
  const totalPago = activeQuotes.filter(q => q.status === 'pago').reduce((s, q) => s + Number(q.amount), 0)
  const totalOrcado = activeQuotes.reduce((s, q) => s + Number(q.amount), 0)

  // Filter
  const filteredQuotes = quotes.filter(q => {
    if (filterStatus && q.status !== filterStatus) return false
    if (filterCategory && q.service_category_id !== filterCategory) return false
    return true
  })

  const handleAddProfessional = async () => {
    if (!newProfessional.name.trim()) return
    await fetch('/api/professionals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newProfessional, created_by: currentUser }),
    })
    setNewProfessional({ name: '', phone: '', email: '', specialty: '', notes: '', recommended_by: '' })
    setShowAddProfessional(false)
    fetchData()
  }

  const handleAddQuote = async () => {
    if (!newQuote.description.trim() || !newQuote.professional_id) return
    await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newQuote,
        amount: parseFloat(newQuote.amount) || 0,
        service_category_id: newQuote.service_category_id || null,
        room_id: newQuote.room_id || null,
        created_by: currentUser,
      }),
    })
    setNewQuote({ professional_id: '', service_category_id: '', room_id: '', description: '', amount: '', notes: '', scheduled_date: '' })
    setShowAddQuote(false)
    fetchData()
  }

  const handleStatusChange = async (quoteId: string, newStatus: string) => {
    await fetch(`/api/quotes/${quoteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, updated_by: currentUser }),
    })
    fetchData()
  }

  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm('Excluir este orçamento?')) return
    await fetch(`/api/quotes/${quoteId}`, { method: 'DELETE' })
    fetchData()
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}><p style={{ color: '#6b7280' }}>Carregando orçamentos...</p></div>

  return (
    <div>
      {/* Summary Cards */}
      <div style={{
        background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
        borderRadius: '16px', padding: '20px', marginBottom: '24px', color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Wrench size={20} />
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Orçamento de Profissionais</h2>
          <span style={{ marginLeft: 'auto', fontSize: '13px', opacity: 0.8 }}>
            {activeQuotes.length} orçamento{activeQuotes.length !== 1 ? 's' : ''} ativo{activeQuotes.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', opacity: 0.8, margin: '0 0 4px' }}>📋 Total Orçado</p>
            <p style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{formatCurrency(totalOrcado)}</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', opacity: 0.8, margin: '0 0 4px' }}>🤝 Contratado</p>
            <p style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{formatCurrency(totalContratado)}</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', opacity: 0.8, margin: '0 0 4px' }}>💰 Pago</p>
            <p style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{formatCurrency(totalPago)}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={() => setShowAddQuote(!showAddQuote)} style={{ fontSize: '14px', padding: '10px 16px' }}>
          <Plus size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
          Novo Orçamento
        </button>
        <button onClick={() => setShowAddProfessional(!showAddProfessional)}
          style={{ fontSize: '14px', padding: '10px 16px', border: '2px solid #e5e7eb', borderRadius: '10px', background: 'white', cursor: 'pointer' }}>
          <User size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
          Novo Profissional
        </button>
      </div>

      {/* Add Professional Form */}
      {showAddProfessional && (
        <div className="card" style={{ marginBottom: '20px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Cadastrar Profissional</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <input placeholder="Nome *" value={newProfessional.name} onChange={e => setNewProfessional({...newProfessional, name: e.target.value})} />
            <input placeholder="Telefone" value={newProfessional.phone} onChange={e => setNewProfessional({...newProfessional, phone: e.target.value})} />
            <input placeholder="Email" value={newProfessional.email} onChange={e => setNewProfessional({...newProfessional, email: e.target.value})} />
            <input placeholder="Especialidade" value={newProfessional.specialty} onChange={e => setNewProfessional({...newProfessional, specialty: e.target.value})} />
            <input placeholder="Indicado por" value={newProfessional.recommended_by} onChange={e => setNewProfessional({...newProfessional, recommended_by: e.target.value})} />
            <input placeholder="Observações" value={newProfessional.notes} onChange={e => setNewProfessional({...newProfessional, notes: e.target.value})} />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAddProfessional(false)} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', cursor: 'pointer' }}>Cancelar</button>
            <button className="btn-primary" onClick={handleAddProfessional} style={{ padding: '8px 16px' }}>Salvar</button>
          </div>
        </div>
      )}

      {/* Add Quote Form */}
      {showAddQuote && (
        <div className="card" style={{ marginBottom: '20px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Novo Orçamento</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <select value={newQuote.professional_id} onChange={e => setNewQuote({...newQuote, professional_id: e.target.value})}>
              <option value="">Selecione o Profissional *</option>
              {professionals.map(p => <option key={p.id} value={p.id}>{p.name} {p.specialty ? `(${p.specialty})` : ''}</option>)}
            </select>
            <select value={newQuote.service_category_id} onChange={e => setNewQuote({...newQuote, service_category_id: e.target.value})}>
              <option value="">Tipo de Serviço</option>
              {serviceCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <input placeholder="Descrição do serviço *" value={newQuote.description} onChange={e => setNewQuote({...newQuote, description: e.target.value})} style={{ gridColumn: '1 / -1' }} />
            <input type="number" placeholder="Valor (R$)" value={newQuote.amount} onChange={e => setNewQuote({...newQuote, amount: e.target.value})} />
            <select value={newQuote.room_id} onChange={e => setNewQuote({...newQuote, room_id: e.target.value})}>
              <option value="">Cômodo (opcional)</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.icon} {r.name}</option>)}
            </select>
            <input type="date" placeholder="Data prevista" value={newQuote.scheduled_date} onChange={e => setNewQuote({...newQuote, scheduled_date: e.target.value})} />
            <input placeholder="Observações" value={newQuote.notes} onChange={e => setNewQuote({...newQuote, notes: e.target.value})} />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAddQuote(false)} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', cursor: 'pointer' }}>Cancelar</button>
            <button className="btn-primary" onClick={handleAddQuote} style={{ padding: '8px 16px' }}>Salvar Orçamento</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ minWidth: '140px' }}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
          ))}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ minWidth: '160px' }}>
          <option value="">Todos os serviços</option>
          {serviceCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      {/* Quotes List */}
      {filteredQuotes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👷</div>
          <h3 style={{ fontSize: '18px', color: '#374151', marginBottom: '8px' }}>Nenhum orçamento ainda</h3>
          <p style={{ color: '#6b7280' }}>Adicione profissionais e orçamentos para controlar os custos da reforma!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredQuotes.map(quote => {
            const statusCfg = STATUS_CONFIG[quote.status] || STATUS_CONFIG.recebido
            const isExpanded = expandedQuote === quote.id
            const currentIdx = STATUS_FLOW.indexOf(quote.status)
            const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null
            const userColor = USERS.find(u => u.id === quote.created_by)?.color || '#6b7280'

            return (
              <div key={quote.id} className="card" style={{ padding: '16px', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                        background: statusCfg.bg, color: statusCfg.color
                      }}>
                        {statusCfg.emoji} {statusCfg.label}
                      </span>
                      {quote.service_category && (
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                          {quote.service_category.icon} {quote.service_category.name}
                        </span>
                      )}
                      {quote.room && (
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                          📍 {quote.room.name}
                        </span>
                      )}
                    </div>
                    <h4 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px', color: '#1f2937' }}>
                      {quote.description}
                    </h4>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                      <User size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                      {quote.professional?.name || 'Profissional'}
                      {quote.professional?.phone && (
                        <span style={{ marginLeft: '8px' }}>
                          <Phone size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} />
                          {quote.professional.phone}
                        </span>
                      )}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: '120px' }}>
                    <p style={{ fontSize: '18px', fontWeight: 800, color: '#1f2937', margin: '0 0 4px' }}>
                      {formatCurrency(Number(quote.amount))}
                    </p>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                      {nextStatus && quote.status !== 'recusado' && (
                        <button
                          onClick={() => handleStatusChange(quote.id, nextStatus)}
                          title={`Avançar para ${STATUS_CONFIG[nextStatus]?.label}`}
                          style={{
                            padding: '4px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            background: STATUS_CONFIG[nextStatus]?.bg, color: STATUS_CONFIG[nextStatus]?.color,
                            fontSize: '11px', fontWeight: 600
                          }}
                        >
                          {STATUS_CONFIG[nextStatus]?.emoji} {STATUS_CONFIG[nextStatus]?.label}
                        </button>
                      )}
                      {quote.status !== 'recusado' && quote.status !== 'pago' && (
                        <button
                          onClick={() => handleStatusChange(quote.id, 'recusado')}
                          title="Recusar"
                          style={{ padding: '4px 8px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#fee2e2', color: '#dc2626', fontSize: '11px' }}
                        >
                          <X size={12} />
                        </button>
                      )}
                      <button onClick={() => setExpandedQuote(isExpanded ? null : quote.id)}
                        style={{ padding: '4px 8px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#f3f4f6' }}>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6', fontSize: '13px', color: '#6b7280' }}>
                    {quote.notes && <p style={{ margin: '0 0 8px' }}>📝 {quote.notes}</p>}
                    {quote.scheduled_date && <p style={{ margin: '0 0 8px' }}>📅 Previsão: {new Date(quote.scheduled_date).toLocaleDateString('pt-BR')}</p>}
                    {quote.paid_date && <p style={{ margin: '0 0 8px' }}>💰 Pago em: {new Date(quote.paid_date).toLocaleDateString('pt-BR')}</p>}
                    {quote.professional?.email && <p style={{ margin: '0 0 8px' }}><Mail size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {quote.professional.email}</p>}
                    {quote.professional?.recommended_by && <p style={{ margin: '0 0 8px' }}>👤 Indicado por: {quote.professional.recommended_by}</p>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <span style={{ fontSize: '11px' }}>
                        Adicionado por <span style={{ color: userColor, fontWeight: 600 }}>{USERS.find(u => u.id === quote.created_by)?.name || quote.created_by}</span>
                        {' em '}{new Date(quote.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      <button onClick={() => handleDeleteQuote(quote.id)}
                        style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#fee2e2', color: '#dc2626', fontSize: '12px' }}>
                        <Trash2 size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
