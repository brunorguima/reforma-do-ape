import { ArrowLeft, Edit2, Settings, Users, Bell, FileDown, HelpCircle, Info, LogOut, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface ProfileProps {
  onLogout: () => void;
  onBack: () => void;
}

export function Profile({ onLogout, onBack }: ProfileProps) {
  const sections = [
    {
      title: 'Espaço de Trabalho',
      items: [
        { label: 'Configurações do Projeto', icon: Settings, color: 'text-secondary' },
        { label: 'Equipe', icon: Users, color: 'text-secondary', badge: '12 Membros' },
      ]
    },
    {
      title: 'Preferências',
      items: [
        { label: 'Preferências de Notificação', icon: Bell, color: 'text-secondary' },
        { label: 'Exportar Dados', icon: FileDown, color: 'text-secondary', formats: ['PDF', 'EXCEL'] },
      ]
    }
  ];

  return (
    <div className="min-h-screen pb-32 bg-surface">
      <header className="bg-surface border-b border-outline-variant h-16 sticky top-0 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-surface-container active:scale-95">
            <ArrowLeft className="w-6 h-6 text-primary" />
          </button>
          <h1 className="text-xl font-bold text-primary">Meu Perfil</h1>
        </div>
      </header>

      <main className="px-4 py-8 max-w-2xl mx-auto space-y-8">
        <section className="flex flex-col items-center">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-secondary p-1 shadow-lg shadow-secondary/10">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAIZIEkY-aujtGp2_eLaFhvMNogda9rnurqpmE-BCAfNA6L38HhjXwVRL1aMzCUc9NxN33MDDd66E2zX4MHIRWJGXoT3WzGIhbom7pD-WAI5-cpXX0jMQg4l4W7sYn7t4M-Q0iblZRkKiQeTG5-3z3fjnjKs2xpYQVXP0xGZXVF6fITnWCdK1HcR4tCEXniQend7cukIz3VVPCf2wtWSdteOmotfigQx2yEClRsQUKxBBZakxP4UonpCitKdUhyufes1x6Ykv15q8c" 
                alt="Avatar" 
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <button className="absolute bottom-0 right-0 bg-secondary text-white p-2 rounded-full shadow-lg border-4 border-surface active:scale-90 transition-transform">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-primary tracking-tight">Ricardo Almeida</h2>
            <p className="text-sm font-medium text-on-surface-variant">ricardo.almeida@projetoreforma.com.br</p>
          </div>
        </section>

        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.title} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4">
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">{section.title}</p>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <button key={item.label} className="w-full h-14 flex items-center justify-between px-4 bg-surface-container-low/50 rounded-xl hover:bg-surface-container transition-colors group">
                    <div className="flex items-center gap-4">
                      <item.icon className={cn("w-5 h-5", item.color)} />
                      <span className="text-sm font-bold text-primary">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.badge && <span className="text-[10px] font-black bg-secondary-container/10 text-secondary px-3 py-1 rounded-full uppercase">{item.badge}</span>}
                      {item.formats && (
                        <div className="flex gap-1.5">
                          {item.formats.map(f => (<span key={f} className="text-[10px] font-black text-outline border border-outline-variant px-1.5 py-0.5 rounded">{f}</span>))}
                        </div>
                      )}
                      <ChevronRight className="w-4 h-4 text-outline group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4">
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Suporte & App</p>
            <div className="space-y-2">
              <button className="w-full h-14 flex items-center justify-between px-4 bg-surface-container-low/50 rounded-xl hover:bg-surface-container transition-colors">
                <div className="flex items-center gap-4">
                  <HelpCircle className="w-5 h-5 text-outline" />
                  <span className="text-sm font-bold text-primary">Central de Ajuda</span>
                </div>
              </button>
              <button className="w-full h-14 flex items-center justify-between px-4 bg-surface-container-low/50 rounded-xl hover:bg-surface-container transition-colors">
                <div className="flex items-center gap-4">
                  <Info className="w-5 h-5 text-outline" />
                  <span className="text-sm font-bold text-primary">Sobre o App</span>
                </div>
                <span className="text-[10px] font-black text-outline uppercase tracking-widest">v2.4.12</span>
              </button>
            </div>
          </section>

          <button 
            onClick={onLogout}
            className="w-full h-14 flex items-center justify-center gap-3 bg-red-50 text-red-600 rounded-2xl font-bold border border-red-100 active:scale-[0.98] transition-transform shadow-sm hover:bg-red-100 hover:border-red-200 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sair da Conta
          </button>
        </div>
      </main>
    </div>
  );
}
