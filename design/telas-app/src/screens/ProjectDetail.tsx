import { ArrowLeft, Settings, ClipboardList, HardHat, Banknote, FileText, CheckCircle2, PaintBucket, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { Project, Screen } from '../types';
import { formatCurrency, cn } from '../lib/utils';

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  onNavigate: (screen: Screen) => void;
}

export function ProjectDetail({ project, onBack, onNavigate }: ProjectDetailProps) {
  const cards = [
    { title: 'Orçamentos', icon: ClipboardList, color: 'text-primary', screen: 'budgetAnalysis' as Screen },
    { title: 'Obra', icon: HardHat, color: 'text-primary', screen: 'home' as Screen },
    { title: 'Financeiro', icon: Banknote, color: 'text-primary', screen: 'finance' as Screen },
    { title: 'Documentos', icon: FileText, color: 'text-primary', screen: 'documents' as Screen },
  ];

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-surface border-b border-outline-variant sticky top-0 z-50 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-surface-container rounded-full transition-colors active:scale-95">
            <ArrowLeft className="w-6 h-6 text-primary" />
          </button>
          <h1 className="text-xl font-bold text-primary">{project.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-surface-container rounded-full transition-colors active:scale-95">
            <Settings className="w-6 h-6 text-primary" />
          </button>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant">
             <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuC3nRU3-zluA-A3_7uMWiz104GA74dwvS8BaKFfSy3UL47rV01bdpQa9OAm-jUSCaSdpBznWwk3k1AsvV86ypzcEh1SMV0GqU4ik9Z5_7d8DnjnBsKaOGVjaqr2N8dMrADQwCeMhsa9DfkDZ8ISXmVaAhMDY26ccwvlicyS5ca5VvJHS1Trosn1rtGL9aFHQbnZH9CvvNT2fCw9YyID0SER2uXRLRF1sDrt7Q_YZLdO-xpkIgyiIxm53fuS_0n95VArxwpDYQ5Qc6U" alt="User" />
          </div>
        </div>
      </header>

      <main className="pt-4 pb-24">
        {/* Statistics Scroll */}
        <section className="flex overflow-x-auto gap-4 px-4 no-scrollbar mb-8 snap-x">
          <div className="flex-none w-[280px] snap-start bg-secondary-container rounded-2xl p-5 shadow-lg shadow-secondary/20 border border-secondary/20">
            <p className="text-xs font-bold text-on-secondary-container/80 uppercase tracking-widest mb-2">Orçado</p>
            <h3 className="text-3xl font-bold text-on-secondary-container">{formatCurrency(project.budget)}</h3>
            <div className="mt-4 w-full bg-on-secondary-container/20 h-1 rounded-full">
              <div className="bg-on-secondary-container h-1 rounded-full w-full" />
            </div>
          </div>

          <div className="flex-none w-[280px] snap-start bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-outline uppercase tracking-widest mb-2">Gasto</p>
            <h3 className="text-3xl font-bold text-primary">{formatCurrency(project.spent)}</h3>
            <div className="mt-4 w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(project.spent / project.budget) * 100}%` }}
                className="bg-secondary h-1 rounded-full" 
              />
            </div>
          </div>
        </section>

        {/* Quick Actions Grid */}
        <section className="px-4 mb-8">
          <div className="grid grid-cols-2 gap-4">
            {cards.map((card, i) => (
              <motion.button 
                key={card.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onNavigate(card.screen)}
                className="flex flex-col items-center justify-center gap-3 bg-surface-container-low border border-outline-variant rounded-2xl py-6 hover:bg-surface-container-high transition-all active:scale-95"
              >
                <card.icon className={cn("w-8 h-8", card.color)} />
                <span className="text-sm font-bold text-primary uppercase tracking-wider">{card.title}</span>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="px-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-primary">Últimas atividades</h2>
            <button className="text-secondary font-bold text-sm tracking-wide">Ver todas</button>
          </div>
          
          <div className="space-y-3">
            {[
              { id: 1, user: 'Rodolfo', action: 'marcou', target: 'Encanamento', time: 'há 2h', icon: CheckCircle2, iconColor: 'text-secondary', bgColor: 'bg-secondary-container/10' },
              { id: 2, user: '', action: 'Novo orçamento de', target: 'pintura', time: 'há 5h', icon: PaintBucket, iconColor: 'text-tertiary', bgColor: 'bg-tertiary-fixed/30' },
            ].map((activity) => (
              <motion.div 
                key={activity.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 flex gap-4 items-start shadow-sm"
              >
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", activity.bgColor)}>
                  <activity.icon className={cn("w-5 h-5", activity.iconColor)} />
                </div>
                <div className="flex flex-col">
                  <p className="text-sm text-on-surface leading-tight">
                    {activity.user && <strong className="font-bold">{activity.user} </strong>}
                    {activity.action} <span className="text-secondary font-bold">{activity.target}</span> como concluído
                  </p>
                  <span className="text-xs font-medium text-outline mt-1.5 uppercase tracking-wider">{activity.time}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <button 
        onClick={() => onNavigate('chat')}
        className="fixed bottom-24 right-4 bg-secondary-container text-on-secondary-container h-14 px-6 rounded-2xl flex items-center gap-3 shadow-xl hover:shadow-2xl transition-all active:scale-95 z-40 border border-white/20"
      >
        <Sparkles className="w-5 h-5 fill-current" />
        <span className="font-bold text-xs uppercase tracking-widest">Assistente IA</span>
      </button>
    </div>
  );
}
