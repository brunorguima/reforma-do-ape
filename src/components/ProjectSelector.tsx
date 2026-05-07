'use client'
import { motion } from 'motion/react'
import { MapPin, HardHat, Hammer, Building2 } from 'lucide-react'

interface Project {
  id: string
  name: string
  slug: string
  description: string
  project_type: string
  image_url?: string | null
  location?: string | null
  status?: string | null
}

interface ProjectSelectorProps {
  projects: Project[]
  onSelect: (projectId: string) => void
  kpis?: Record<string, { contracted: number; paid: number; progress: number }>
}

const STATUS_COLORS: Record<string, string> = {
  'Em obra': 'bg-emerald-100 text-emerald-800',
  'Planejamento': 'bg-blue-100 text-blue-800',
  'Concluído': 'bg-purple-100 text-purple-800',
  'Pausado': 'bg-orange-100 text-orange-800',
}

const TYPE_ICONS: Record<string, typeof Building2> = {
  reforma: Hammer,
  construcao: Building2,
  default: HardHat,
}

const PLACEHOLDER_GRADIENTS = [
  'from-primary to-secondary',
  'from-secondary to-primary-light',
  'from-emerald-600 to-teal-500',
  'from-orange-500 to-amber-400',
]

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default function ProjectSelector({ projects, onSelect, kpis }: ProjectSelectorProps) {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-2xl font-black text-primary mb-1">Seus Projetos</h1>
        <p className="text-sm text-on-surface-variant">Selecione um projeto para continuar</p>
      </motion.div>

      <div className="w-full max-w-lg space-y-5">
        {projects.map((project, index) => {
          const IconComp = TYPE_ICONS[project.project_type] || TYPE_ICONS.default
          const statusColor = STATUS_COLORS[project.status || ''] || 'bg-gray-100 text-gray-800'
          const projectKpi = kpis?.[project.id]
          const progress = projectKpi?.progress || 0
          const gradient = PLACEHOLDER_GRADIENTS[index % PLACEHOLDER_GRADIENTS.length]

          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
              onClick={() => onSelect(project.id)}
              className="group bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] transition-all cursor-pointer"
            >
              {/* Image / Gradient header */}
              <div className="h-36 w-full relative overflow-hidden">
                {project.image_url ? (
                  <img
                    src={project.image_url}
                    alt={project.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center transition-transform duration-500 group-hover:scale-105`}>
                    <IconComp className="w-16 h-16 text-white/30" />
                  </div>
                )}
                {/* Status badge */}
                <div className="absolute top-3 right-3">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${statusColor}`}>
                    {project.status || 'Ativo'}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                <div>
                  <h2 className="text-lg font-black text-primary">{project.name}</h2>
                  {project.location && (
                    <div className="flex items-center text-on-surface-variant mt-1">
                      <MapPin className="w-3.5 h-3.5 mr-1" />
                      <span className="text-xs font-medium">{project.location}</span>
                    </div>
                  )}
                  {project.description && (
                    <p className="text-xs text-on-surface-variant mt-1.5 line-clamp-2">{project.description}</p>
                  )}
                </div>

                {/* Progress bar */}
                {projectKpi && (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-on-surface-variant font-medium uppercase tracking-wider">Progresso</span>
                        <span className="text-secondary font-black">{progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(progress, 100)}%` }}
                          transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
                          className="h-full bg-secondary rounded-full"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-outline-variant">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Orçamento</span>
                      <span className="text-sm font-black text-primary">
                        {fmt(projectKpi.paid)} / {fmt(projectKpi.contracted)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
