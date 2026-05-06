import { ArrowLeft, Bot, Sparkles, Camera, Mic as MicIcon, Send as SendIcon, CreditCard, Calendar as CalendarIcon, Package } from 'lucide-react';
import { motion } from 'motion/react';
import { formatCurrency, cn } from '../lib/utils';

interface AIChatProps {
  onBack: () => void;
}

export function AIChat({ onBack }: AIChatProps) {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="bg-surface border-b border-outline-variant h-16 flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-surface-container active:scale-95">
            <ArrowLeft className="w-6 h-6 text-primary" />
          </button>
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            Assistente IA
            <Sparkles className="w-5 h-5 text-secondary-container fill-current" />
          </h1>
        </div>
        <div className="w-8 h-8 rounded-full border border-outline-variant overflow-hidden">
           <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDyHHJcwy5ZO8H9GLvPXdmqe4q2lt6qiYDJa7UhUdX3YRxAjU4fPaL-4D4A_gUeULRDQqOOUG5wHkZvO1JvyIAMY9tUodSF0y9wjShltzYQh91tzXhht5b4lS4gDWOTdEwOAgNyzTzAL7Bxsc_ANe7dpG3-vUknDmxIE8puMN1_Cv6B97ZQwINit3hXdXzDavPLpCN84q7k0O7lz5u9CDiEmBFVCJSWSDQOPvetr1lyjewntpKHgVAiPiunUW08nCPK7QKMhrGFkg" alt="User" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-40">
        <div className="flex flex-col items-center mt-8 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-container flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <Bot className="w-8 h-8 text-on-primary-container fill-current" />
          </div>
          <p className="text-sm font-medium text-on-surface-variant text-center max-w-[260px]">Olá! Sou seu assistente do Projeto Reforma. Como posso ajudar com sua obra hoje?</p>
        </div>

        <div className="flex justify-end">
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-[80%] bg-secondary-container text-on-secondary-container px-4 py-3 rounded-2xl rounded-tr-none shadow-sm"
          >
            <p className="text-sm font-medium leading-relaxed">Como está o meu orçamento atual para a fase de revestimento?</p>
          </motion.div>
        </div>

        <div className="flex justify-start items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center shrink-0 border border-outline-variant">
            <Sparkles className="w-4 h-4 text-primary fill-current" />
          </div>
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-[85%] bg-surface-container-low border border-outline-variant px-4 py-3 rounded-2xl rounded-tl-none space-y-4 shadow-sm"
          >
            <p className="text-sm font-medium leading-relaxed">Até o momento, você utilizou <strong className="font-black">R$ 12.450,00</strong> dos R$ 15.000,00 planejados para revestimentos.</p>
            <div className="space-y-1.5">
              <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '83%' }}
                  className="bg-secondary h-full" 
                />
              </div>
              <p className="text-[10px] font-black text-outline uppercase tracking-widest">83% do orçamento atingido.</p>
            </div>
            <p className="text-sm font-medium leading-relaxed">Notei que o valor do porcelanato subiu <span className="text-secondary font-black">5% na última semana</span>. Gostaria que eu buscasse orçamentos em outros fornecedores?</p>
          </motion.div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-outline-variant p-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
          <button className="flex-none h-10 px-4 rounded-full border border-secondary text-secondary text-xs font-bold flex items-center gap-2 hover:bg-secondary-container/10 transition-colors uppercase tracking-wider">
            <CreditCard className="w-4 h-4" />
            Quanto já gastei?
          </button>
          <button className="flex-none h-10 px-4 rounded-full border border-secondary text-secondary text-xs font-bold flex items-center gap-2 hover:bg-secondary-container/10 transition-colors uppercase tracking-wider">
            <CalendarIcon className="w-4 h-4" />
            Próximos pagamentos
          </button>
          <button className="flex-none h-10 px-4 rounded-full border border-outline text-on-surface-variant text-xs font-bold flex items-center gap-2 uppercase tracking-wider">
            <Package className="w-4 h-4" />
            Status dos materiais
          </button>
        </div>

        <div className="flex items-center gap-2 bg-surface-container-low rounded-2xl p-1.5 border border-outline-variant shadow-inner">
          <button className="w-10 h-10 flex items-center justify-center text-outline hover:text-primary active:scale-90 transition-transform">
            <Camera className="w-5 h-5" />
          </button>
          <input 
            type="text" 
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium h-10 px-2 placeholder:text-outline" 
            placeholder="Pergunte sobre sua obra..." 
          />
          <button className="w-10 h-10 flex items-center justify-center text-outline hover:text-primary active:scale-90 transition-transform">
            <MicIcon className="w-5 h-5" />
          </button>
          <button className="w-10 h-10 flex items-center justify-center bg-secondary text-on-secondary rounded-xl active:scale-95 shadow-md shadow-secondary/20">
            <SendIcon className="w-5 h-5 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}
