import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, 
  Calendar, 
  ClipboardCheck, 
  Home, 
  MessageSquare, 
  Plus, 
  Settings, 
  User, 
  Wallet,
  Camera,
  ChevronRight,
  Search,
  Zap,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowUpRight,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { askConstructionExpert } from './services/geminiService';

// Types
interface Project {
  id: string;
  name: string;
  location: string;
  progress: number;
  budgetUsed: number;
  totalBudget: number;
  status: 'active' | 'completed' | 'paused';
  image: string;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

const DASHBOARD_RECIPE = {
  bg: 'bg-slate-50',
  card: 'bg-white rounded-2xl shadow-sm border border-slate-100',
  accent: 'text-blue-600',
  accentBg: 'bg-blue-600',
  muted: 'text-slate-500',
};

const ReformiaApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      text: 'Olá! Sou seu assistente de obra. Precisa de ajuda com quantitativos, escolha de revestimentos ou normas técnicas?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [projects] = useState<Project[]>([
    {
      id: '1',
      name: 'Reforma Apto 402',
      location: 'Pinheiros, SP',
      progress: 65,
      budgetUsed: 45000,
      totalBudget: 80000,
      status: 'active',
      image: 'https://images.unsplash.com/photo-1503387762-592dea58ef23?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: '2',
      name: 'Casa Diogo',
      location: 'Itaim Bibi, SP',
      progress: 12,
      budgetUsed: 12000,
      totalBudget: 150000,
      status: 'active',
      image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800'
    }
  ]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const history = messages.map(m => ({ 
      role: m.role, 
      parts: [m.text] 
    }));

    const response = await askConstructionExpert(input, history);
    
    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: response || 'Desculpe, não consegui processar isso agora.',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, botMsg]);
    setIsLoading(false);
  };

  return (
    <div className={`min-h-screen ${DASHBOARD_RECIPE.bg} font-sans text-slate-900 pb-24`}>
      {/* Header */}
      <header className="p-6 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {activeTab !== 'home' && (
             <button onClick={() => setActiveTab('home')} className="p-1 -ml-1 text-slate-400 hover:text-slate-600">
               <ArrowLeft className="w-6 h-6" />
             </button>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight">Reformia</h1>
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">
              {activeTab === 'home' ? 'Dashboard' : activeTab === 'chat' ? 'Reformia AI' : activeTab === 'projects' ? 'Minhas Obras' : 'Gestão Financeira'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="p-2 rounded-full hover:bg-slate-100 transition-colors">
            <Search className="w-5 h-5 text-slate-600" />
          </button>
          <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-slate-100">
            <img 
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100" 
              alt="Profile" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 md:p-8 max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Summary Card */}
              <div className={`${DASHBOARD_RECIPE.card} p-6 bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0 shadow-xl shadow-blue-100 overflow-hidden relative`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-blue-100 text-xs font-semibold uppercase tracking-widest mb-1">Total em Execução</p>
                      <h2 className="text-3xl font-bold">R$ 230.000</h2>
                    </div>
                    <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                    <div className="flex items-center gap-2">
                       <Clock className="w-4 h-4 text-blue-200" />
                       <span className="text-sm font-medium">Prazo médio: 45 dias</span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-blue-200" />
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setActiveTab('wallet')}
                  className={`${DASHBOARD_RECIPE.card} p-4 flex flex-col gap-3 active:scale-95 transition-transform`}
                >
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-slate-400 font-bold uppercase">Custos</p>
                    <p className="font-bold text-slate-700">R$ 57.000</p>
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('projects')}
                  className={`${DASHBOARD_RECIPE.card} p-4 flex flex-col gap-3 active:scale-95 transition-transform`}
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-slate-400 font-bold uppercase">Tarefas</p>
                    <p className="font-bold text-slate-700">12 pendentes</p>
                  </div>
                </button>
              </div>

              {/* Active Projects */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">Obras em curso</h3>
                  <button onClick={() => setActiveTab('projects')} className="text-blue-600 text-xs font-bold uppercase tracking-wider">Ver Tudo</button>
                </div>
                <div className="space-y-4">
                  {projects.map((project) => (
                    <motion.div 
                      key={project.id} 
                      whileHover={{ y: -2 }}
                      className={`${DASHBOARD_RECIPE.card} overflow-hidden`}
                    >
                      <div className="flex">
                        <div className="w-1/3 h-28 overflow-hidden">
                          <img 
                            src={project.image} 
                            alt={project.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="w-2/3 p-4 flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-sm leading-tight mb-1">{project.name}</h4>
                              <p className="text-[10px] text-slate-400 font-medium">{project.location}</p>
                            </div>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">{project.progress}%</span>
                          </div>
                          
                          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${project.progress}%` }} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* AI Help Banner */}
              <div className="bg-slate-900 rounded-3xl p-6 text-white flex items-center justify-between border border-slate-800 shadow-xl overflow-hidden relative">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-600/20 rounded-full blur-2xl" />
                <div className="flex gap-4 relative z-10">
                  <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-900/50">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold">IA Construtora</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">Quantos tijolos eu preciso? <br />Como evitar umidade?</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('chat')}
                  className="bg-white text-slate-900 px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-50 transition-colors relative z-10"
                >
                  Consultar
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'chat' && (
             <motion.div
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col h-[75vh]"
            >
              <div className="flex-1 overflow-y-auto space-y-4 pb-6 px-1">
                {messages.map((m) => (
                  <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                    {m.role === 'model' && (
                      <div className="w-8 h-8 rounded-lg bg-blue-600 flex-shrink-0 flex items-center justify-center text-white text-[10px] font-black shadow-md shadow-blue-200">R</div>
                    )}
                    <div className={`p-4 rounded-2xl text-sm shadow-sm max-w-[85%] ${
                      m.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex-shrink-0 flex items-center justify-center text-white text-[10px] font-black animate-pulse">R</div>
                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex gap-1">
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="mt-auto bg-white p-2.5 rounded-2xl border border-slate-200 shadow-lg flex gap-2 items-center">
                <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                  <Camera className="w-5 h-5" />
                </button>
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyUp={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ex: Como calcular o reboco?" 
                  className="flex-1 outline-none text-sm bg-transparent"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={`p-2.5 rounded-xl transition-all ${
                    input.trim() && !isLoading ? 'bg-blue-600 text-white shadow-md shadow-blue-200 translate-x-0' : 'bg-slate-100 text-slate-400 translate-x-1'
                  }`}
                >
                  <ChevronRight className={`w-5 h-5 transition-transform ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </motion.div>
          )}

          {(activeTab === 'wallet' || activeTab === 'projects') && (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 flex flex-col items-center text-center space-y-4"
            >
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-2">
                {activeTab === 'wallet' ? <Wallet size={40} /> : <Home size={40} />}
              </div>
              <h3 className="text-xl font-bold">Em breve no Reformia</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">
                Estamos finalizando o módulo de {activeTab === 'wallet' ? 'gestão financeira' : 'detalhes da obra'} para você.
              </p>
              <button 
                onClick={() => setActiveTab('home')}
                className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg"
              >
                Voltar ao Início
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 px-8 py-3 flex justify-between items-center z-50">
        <NavButton active={activeTab === 'home'} icon={<Home />} label="Home" onClick={() => setActiveTab('home')} />
        <NavButton active={activeTab === 'projects'} icon={<ClipboardCheck />} label="Obra" onClick={() => setActiveTab('projects')} />
        <div className="-mt-14 scale-110">
          <button className="bg-blue-600 w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200 border-4 border-white rotate-45 transform hover:rotate-90 transition-all duration-300">
             <div className="-rotate-45">
               <Plus className="w-7 h-7" />
             </div>
          </button>
        </div>
        <NavButton active={activeTab === 'wallet'} icon={<Wallet />} label="Custos" onClick={() => setActiveTab('wallet')} />
        <NavButton active={activeTab === 'chat'} icon={<MessageSquare />} label="Chat" onClick={() => setActiveTab('chat')} />
      </nav>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; icon: React.ReactNode; label: string; onClick: () => void }> = ({ active, icon, label, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-blue-600 scale-105' : 'text-slate-300'}`}>
    {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    {active && <motion.div layoutId="nav-dot" className="w-1 h-1 bg-blue-600 rounded-full" />}
  </button>
);

export default ReformiaApp;
