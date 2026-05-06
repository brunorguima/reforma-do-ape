import { Search, SlidersHorizontal, MapPin, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { Project, Screen } from '../types';
import { formatCurrency } from '../lib/utils';

interface HomeProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
}

export function Home({ projects, onSelectProject }: HomeProps) {
  return (
    <div className="min-h-screen pt-16 pb-24 px-4 space-y-6">
      <header className="fixed top-0 left-0 right-0 h-16 bg-surface border-b border-outline-variant flex items-center justify-between px-4 z-40">
        <h1 className="text-xl font-bold text-primary">Seus Projetos</h1>
        <div className="w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden border border-outline-variant">
          <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuD8IzLFW00ORRadqbO2kLzEa7K2Cmd57XmBE3MB-o_ewQBIB1EUKxnUWenIiec6TfgXeRbFbZN5lxq8UFlCHRrQekXi_vFuimLqyaeIHddykoe4rUSpT5hHKtLXsbdMisvz1bhLnGPBMacm8pdyAnG6TBrgdRIRQi0MbCVy9exzGXTRuVpfBKnhkhKpfhXNw4vu1TC2AXKeXq0tqet39BO4n94xNpWNNynmG_NT1bDYH3my6_-la6lCvDckiplj76C02l55RNZY8IU" alt="User" />
        </div>
      </header>

      <div className="flex items-center gap-3 pt-4">
        <div className="flex-1 bg-surface-container-low rounded-xl px-4 h-12 flex items-center border border-outline-variant">
          <Search className="w-5 h-5 text-on-surface-variant mr-3" />
          <span className="text-sm text-on-surface-variant font-medium">Buscar projetos...</span>
        </div>
        <button className="w-12 h-12 bg-surface-container-low border border-outline-variant rounded-xl flex items-center justify-center hover:bg-surface-container-high transition-colors">
          <SlidersHorizontal className="w-5 h-5 text-primary" />
        </button>
      </div>

      <div className="space-y-6">
        {projects.map((project, index) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelectProject(project)}
            className="group bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <div className="h-44 w-full relative">
              <img src={project.imageUrl} alt={project.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute top-4 right-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  project.status === 'Em obra' ? 'bg-emerald-100 text-emerald-800' :
                  project.status === 'Planejamento' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {project.status}
                </span>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-primary">{project.name}</h2>
                <div className="flex items-center text-on-surface-variant mt-1">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">{project.location}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant font-medium uppercase tracking-wider">Progresso</span>
                  <span className="text-secondary font-bold">{project.progress}%</span>
                </div>
                <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${project.progress}%` }}
                    className="h-full bg-secondary rounded-full" 
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-outline-variant">
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Orçamento</span>
                <span className="text-sm font-bold text-primary">
                  {formatCurrency(project.spent)} / {formatCurrency(project.budget)}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <button className="fixed bottom-24 right-4 w-14 h-14 bg-secondary-container text-on-secondary-container rounded-2xl shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40">
        <Plus className="w-8 h-8" />
      </button>
    </div>
  );
}
