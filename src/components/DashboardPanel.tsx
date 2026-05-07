'use client'
import { useState, useEffect } from 'react'
import {
  TrendingUp,
  DollarSign,
  ClipboardCheck,
  Wrench,
  HardHat,
  Wallet,
  Clock,
  Zap,
  Users,
  FileText,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Activity,
} from 'lucide-react'
import { motion } from 'motion/react'
import { KpiCard, KpiGrid } from '@/components/ui'
import { StatusBadge, getStatusVariant, getStatusLabel } from '@/components/ui'
import Card, { SectionHeader, EmptyState } from '@/components/ui/Card'

interface DashboardProps {
  onNavigate: (tab: string) => void
  projectId?: string
}

interface KPIs {
  totalQuoted: number
  totalContracted: number
  totalPaid: number
  totalPending: number
  progress: number
  pendingMeasurements: number
  pendingTasks: number
  completedTasks: number
  totalTasks: number
  totalProfessionals: number
  totalQuotes: number
  contractedQuotes: number
}

interface DashboardData {
  kpis: KPIs
  upcomingPayments: { amount: number; status: string; due_date: string }[]
  recentActivity: { action: string; description: string; created_at: string; performed_by: string }[]
  professionals: { id: string; name: string }[]
}

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })

const ACTIVITY_ICONS: Record<string, { icon: typeof DollarSign; bg: string; border: string; text: string }> = {
  payment: { icon: DollarSign, bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600' },
  measurement: { icon: ClipboardCheck, bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-600' },
  quote: { icon: FileText, bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-600' },
  task: { icon: CheckCircle2, bg: 'bg-primary/5', border: 'border-primary/10', text: 'text-primary' },
  alert: { icon: AlertTriangle, bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-600' },
  default: { icon: Activity, bg: 'bg-primary/5', border: 'border-primary/10', text: 'text-primary' },
}

function getActivityIcon(action: string) {
  if (action.includes('pagamento') || action.includes('pag')) return ACTIVITY_ICONS.payment
  if (action.includes('medição') || action.includes('medicao')) return ACTIVITY_ICONS.measurement
  if (action.includes('orçamento') || action.includes('orcamento')) return ACTIVITY_ICONS.quote
  if (action.includes('tarefa') || action.includes('task')) return ACTIVITY_ICONS.task
  if (action.includes('alerta') || action.includes('alert')) return ACTIVITY_ICONS.alert
  return ACTIVITY_ICONS.default
}

export default function DashboardPanel({ onNavigate, projectId }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const pid = projectId || 'caf60523-28bd-4136-9663-0c6e417f41c3'
    fetch(`/api/dashboard?project_id=${pid}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [projectId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-center">
          <div className="w-12 h-12 rounded-2xl bg-surface-container mx-auto mb-3" />
          <p className="text-outline text-sm">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (!data?.kpis) return null

  const { kpis } = data

  const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number]
  const stagger = (i: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, delay: i * 0.07, ease },
  })

  return (
    <div className="space-y-6">
      {/* Hero KPI — Contratado with progress */}
      <motion.div {...stagger(0)}>
      <Card padding="lg" className="relative overflow-hidden">
        <div className="flex justify-between items-start mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Total Contratado</p>
            <h2 className="text-3xl font-black text-primary font-mono tracking-tight">{fmt(kpis.totalContracted)}</h2>
          </div>
          <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/10 text-primary shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-on-surface-variant font-medium">Pago: {fmt(kpis.totalPaid)}</span>
            <span className="font-black text-primary">{kpis.progress}%</span>
          </div>
          <div className="w-full bg-surface-container-highest h-2.5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-secondary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(kpis.progress, 100)}%` }}
              transition={{ duration: 1, delay: 0.3, ease }}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 bg-surface-container-low rounded-xl p-3 border border-outline-variant">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-on-surface">A pagar: {fmt(kpis.totalPending)}</span>
            </div>
          </div>
          <div className="flex-1 bg-surface-container-low rounded-xl p-3 border border-outline-variant">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-on-surface">Orçado: {fmt(kpis.totalQuoted)}</span>
            </div>
          </div>
        </div>
      </Card>
      </motion.div>

      {/* KPI Grid */}
      <motion.div {...stagger(1)}>
      <KpiGrid cols={2}>
        <KpiCard
          label="Total Pago"
          value={fmt(kpis.totalPaid)}
          icon={<DollarSign className="w-5 h-5" />}
          accent="success"
          sub={`${kpis.progress}% do contratado`}
        />
        <KpiCard
          label="A Pagar"
          value={fmt(kpis.totalPending)}
          icon={<Clock className="w-5 h-5" />}
          accent="warning"
          sub="pendente"
        />
        <KpiCard
          label="Orçamentos"
          value={`${kpis.contractedQuotes}/${kpis.totalQuotes}`}
          icon={<Wrench className="w-5 h-5" />}
          accent="primary"
          sub="contratados"
        />
        <KpiCard
          label="Tarefas"
          value={`${kpis.completedTasks}/${kpis.totalTasks}`}
          icon={<HardHat className="w-5 h-5" />}
          accent={kpis.pendingTasks > 0 ? 'warning' : 'success'}
          sub={kpis.pendingTasks > 0 ? `${kpis.pendingTasks} pendentes` : 'concluídas'}
        />
      </KpiGrid>
      </motion.div>

      {/* Quick Actions */}
      <motion.div {...stagger(2)} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickCard
          icon={<Wrench className="w-5 h-5" />}
          accent="primary"
          label="Orçamentos"
          onClick={() => onNavigate('orcamentos')}
        />
        <QuickCard
          icon={<HardHat className="w-5 h-5" />}
          accent="warning"
          label="Obra"
          onClick={() => onNavigate('obra')}
        />
        <QuickCard
          icon={<ClipboardCheck className="w-5 h-5" />}
          accent="danger"
          label="Medições"
          onClick={() => onNavigate('medicoes')}
          alert={kpis.pendingMeasurements > 0}
        />
        <QuickCard
          icon={<DollarSign className="w-5 h-5" />}
          accent="success"
          label="Financeiro"
          onClick={() => onNavigate('financeiro')}
        />
      </motion.div>

      {/* Two columns: Upcoming Payments + Recent Activity */}
      <motion.div {...stagger(3)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upcoming Payments */}
        <Card padding="lg">
          <SectionHeader
            title="Próximos Pagamentos"
            action={
              <button
                onClick={() => onNavigate('financeiro')}
                className="text-[10px] font-black text-secondary uppercase tracking-widest hover:opacity-80 transition-opacity"
              >
                Ver tudo
              </button>
            }
          />
          {data.upcomingPayments.length === 0 ? (
            <EmptyState
              icon={<Wallet className="w-6 h-6" />}
              title="Tudo em dia"
              description="Nenhum pagamento pendente"
            />
          ) : (
            <div className="space-y-3">
              {data.upcomingPayments.map((p, i) => {
                const isOverdue = new Date(p.due_date) < new Date()
                return (
                  <div
                    key={i}
                    className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isOverdue
                          ? 'bg-red-50 border border-red-100 text-red-600'
                          : 'bg-orange-50 border border-orange-100 text-orange-600'
                      }`}>
                        {isOverdue ? <AlertTriangle className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{fmt(p.amount)}</p>
                        <p className="text-[10px] font-bold text-outline uppercase tracking-wider">
                          {new Date(p.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                    </div>
                    <StatusBadge
                      label={isOverdue ? 'Atrasado' : getStatusLabel(p.status)}
                      variant={isOverdue ? 'danger' : getStatusVariant(p.status)}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Recent Activity */}
        <Card padding="lg">
          <SectionHeader
            title="Atividade Recente"
            subtitle={`${data.recentActivity.length} ações`}
          />
          {data.recentActivity.length === 0 ? (
            <EmptyState
              icon={<Activity className="w-6 h-6" />}
              title="Sem atividade"
              description="Ações recentes aparecerão aqui"
            />
          ) : (
            <div className="space-y-3">
              {data.recentActivity.slice(0, 5).map((a, i) => {
                const iconStyle = getActivityIcon(a.action.toLowerCase())
                const IconComp = iconStyle.icon
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconStyle.bg} border ${iconStyle.border} ${iconStyle.text}`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-surface">{a.action}</p>
                      <p className="text-xs text-on-surface-variant truncate">{a.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-outline uppercase tracking-wider">
                          {new Date(a.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {a.performed_by && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-outline" />
                            <span className="text-[10px] font-bold text-outline uppercase tracking-wider">{a.performed_by}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Professionals */}
      <motion.div {...stagger(4)}>
      <Card padding="lg">
        <SectionHeader
          title="Profissionais"
          action={
            <StatusBadge label={`${kpis.totalProfessionals} ativos`} variant="primary" dot={false} />
          }
        />
        {data.professionals.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title="Nenhum profissional"
            description="Cadastre profissionais no módulo de obra"
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {data.professionals.map((prof) => (
              <div
                key={prof.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-3 flex items-center gap-3 shadow-sm"
              >
                <div className="w-9 h-9 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm font-semibold text-on-surface truncate">{prof.name}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
      </motion.div>

      {/* AI Banner */}
      <motion.div {...stagger(5)}>
      <Card
        hoverable
        padding="lg"
        className="bg-surface-container-lowest"
        onClick={() => onNavigate('orcamentos')}
      >
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <div className="p-3 rounded-2xl bg-secondary text-white shadow-sm">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-on-surface">Assistente de Orçamentos</h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Compare preços, simule compras e peça recomendações
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-outline shrink-0" />
        </div>
      </Card>
      </motion.div>
    </div>
  )
}

function QuickCard({
  icon,
  accent,
  label,
  onClick,
  alert,
}: {
  icon: React.ReactNode
  accent: 'primary' | 'success' | 'warning' | 'danger'
  label: string
  onClick: () => void
  alert?: boolean
}) {
  const accentMap = {
    primary: { bg: 'bg-primary/5', border: 'border-primary/10', text: 'text-primary' },
    success: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600' },
    warning: { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-600' },
    danger: { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-600' },
  }
  const colors = accentMap[accent]

  return (
    <button
      onClick={onClick}
      className="bg-surface-lowest border border-outline-variant rounded-2xl shadow-sm p-4 flex flex-col gap-3 text-left hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95 relative"
    >
      {alert && (
        <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
      )}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg} border ${colors.border} ${colors.text}`}>
        {icon}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</p>
    </button>
  )
}
