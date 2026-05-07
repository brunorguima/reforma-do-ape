'use client'
import { useState, useEffect } from 'react'
import {
  TrendingUp,
  DollarSign,
  ClipboardCheck,
  Wrench,
  HardHat,
  Sofa,
  Wallet,
  ArrowUpRight,
  Clock,
  Zap,
  BarChart3,
  Users,
  FileText,
  ChevronRight,
} from 'lucide-react'

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
          <div className="w-12 h-12 rounded-2xl bg-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (!data?.kpis) return null

  const { kpis } = data

  return (
    <div className="space-y-6">
      {/* Hero Card — Financial Summary */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16 blur-xl" />
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-5">
            <div>
              <p className="text-blue-100 text-xs font-semibold uppercase tracking-widest mb-1">Contratado</p>
              <h2 className="text-3xl font-bold tracking-tight">{fmt(kpis.totalContracted)}</h2>
            </div>
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-blue-100">Pago: {fmt(kpis.totalPaid)}</span>
              <span className="font-bold">{kpis.progress}%</span>
            </div>
            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-700"
                style={{ width: `${Math.min(kpis.progress, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-200" />
                <span className="text-sm font-medium">A pagar: {fmt(kpis.totalPending)}</span>
              </div>
            </div>
            <div className="flex-1 bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-200" />
                <span className="text-sm font-medium">Orçado: {fmt(kpis.totalQuoted)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickCard
          icon={<Wrench className="w-5 h-5" />}
          iconBg="bg-purple-100 text-purple-600"
          label="Orçamentos"
          value={`${kpis.contractedQuotes}/${kpis.totalQuotes}`}
          sublabel="contratados"
          onClick={() => onNavigate('orcamentos')}
        />
        <QuickCard
          icon={<HardHat className="w-5 h-5" />}
          iconBg="bg-amber-100 text-amber-600"
          label="Obra"
          value={`${kpis.completedTasks}`}
          sublabel={`de ${kpis.totalTasks} tarefas`}
          onClick={() => onNavigate('obra')}
        />
        <QuickCard
          icon={<ClipboardCheck className="w-5 h-5" />}
          iconBg="bg-orange-100 text-orange-600"
          label="Medições"
          value={kpis.pendingMeasurements > 0 ? `${kpis.pendingMeasurements}` : '0'}
          sublabel="pendentes"
          onClick={() => onNavigate('medicoes')}
          alert={kpis.pendingMeasurements > 0}
        />
        <QuickCard
          icon={<DollarSign className="w-5 h-5" />}
          iconBg="bg-green-100 text-green-600"
          label="Financeiro"
          value={fmt(kpis.totalPaid)}
          sublabel="pago"
          onClick={() => onNavigate('financeiro')}
        />
      </div>

      {/* Two columns: Upcoming + Professionals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upcoming Payments */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Próximos Pagamentos</h3>
            <button
              onClick={() => onNavigate('financeiro')}
              className="text-blue-600 text-xs font-bold uppercase tracking-wider hover:text-blue-700"
            >
              Ver tudo
            </button>
          </div>
          {data.upcomingPayments.length === 0 ? (
            <p className="text-slate-400 text-sm py-4 text-center">Nenhum pagamento pendente</p>
          ) : (
            <div className="space-y-3">
              {data.upcomingPayments.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{fmt(p.amount)}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(p.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Pendente</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Professionals */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Profissionais</h3>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {kpis.totalProfessionals} ativos
            </span>
          </div>
          {data.professionals.length === 0 ? (
            <p className="text-slate-400 text-sm py-4 text-center">Nenhum profissional cadastrado</p>
          ) : (
            <div className="space-y-3">
              {data.professionals.map((prof) => (
                <div key={prof.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <Users className="w-4 h-4 text-slate-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">{prof.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Banner */}
      <div
        className="relative overflow-hidden bg-slate-900 rounded-2xl p-6 text-white flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors"
        onClick={() => onNavigate('orcamentos')}
      >
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-600/20 rounded-full blur-2xl" />
        <div className="flex gap-4 relative z-10">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-900/50">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold">Assistente de Orçamentos</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Compare preços, simule compras e peça recomendações
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 relative z-10" />
      </div>
    </div>
  )
}

function QuickCard({
  icon,
  iconBg,
  label,
  value,
  sublabel,
  onClick,
  alert,
}: {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string
  sublabel: string
  onClick: () => void
  alert?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3 text-left hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95 relative"
    >
      {alert && (
        <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
      )}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
        <p className="font-bold text-slate-800 text-lg leading-tight">{value}</p>
        <p className="text-[11px] text-slate-400">{sublabel}</p>
      </div>
    </button>
  )
}
