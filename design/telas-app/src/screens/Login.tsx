import { Mail, Lock, Eye, Construction } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-primary-container/10 to-surface -z-10" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm text-center mb-12"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="bg-secondary p-4 rounded-2xl shadow-lg shadow-secondary/20">
            <Construction className="w-8 h-8 text-on-secondary" />
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Reforma App</h1>
          <p className="text-on-surface-variant">Sua obra no bolso, com IA</p>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface-variant ml-1 uppercase tracking-wider">E-mail</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-4 w-5 h-5 text-outline" />
              <input 
                type="email" 
                placeholder="nome@exemplo.com"
                className="w-full h-12 pl-12 pr-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-secondary focus:ring-1 focus:ring-secondary transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Senha</label>
              <button className="text-xs font-semibold text-secondary hover:underline">Esqueceu a senha?</button>
            </div>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 w-5 h-5 text-outline" />
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full h-12 pl-12 pr-12 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-secondary focus:ring-1 focus:ring-secondary transition-all outline-none"
              />
              <button className="absolute right-4 text-outline">
                <Eye className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <button 
            onClick={onLogin}
            className="w-full h-12 bg-secondary text-on-secondary rounded-xl font-semibold shadow-lg shadow-secondary/10 hover:brightness-110 active:scale-[0.98] transition-all"
          >
            Entrar
          </button>
          
          <div className="flex items-center gap-4 py-2">
            <div className="h-px flex-grow bg-outline-variant" />
            <span className="text-xs font-semibold text-outline uppercase tracking-wider whitespace-nowrap">ou continue com</span>
            <div className="h-px flex-grow bg-outline-variant" />
          </div>

          <button className="w-full h-12 bg-surface-container-lowest border border-outline-variant text-primary rounded-xl font-semibold flex items-center justify-center gap-3 hover:bg-surface-container-low active:scale-[0.98] transition-all">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBBd5i3c-831qutnmkhXC6swUlX8PQ_sr8nOJG2Ny7h236QFt57ZqEXw1VnOlSvVqT8jMkcP_6J2ebZDoEsWKqV-pR0gMnP_HQiXyjHm8otS5TCYRI2-eyTTR3HHrrzLiHUtyn3UOYHVEuv_GoMai9GkJupo-9VLPrCppEZaRcVfLWiGm37YPrvmP9Ap0rYocnj2c8icfqGfuWGETMhnBuww3ohbfp8koZkfrg5ayNJgeCh-tGOyLLGxj9LlFIpwAQqpc3NV-f220M" alt="Google" className="w-5 h-5" />
            Entrar com Google
          </button>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-12 text-center"
      >
        <p className="text-sm text-on-surface-variant">
          Ainda não tem uma conta? 
          <button className="text-secondary font-bold hover:underline ml-1">Criar conta grátis</button>
        </p>
      </motion.div>

      <div className="mt-12 grid grid-cols-2 gap-4 w-full max-w-lg opacity-40 select-none">
        <div className="h-1 bg-surface-container-highest rounded-full" />
        <div className="h-1 bg-secondary/20 rounded-full" />
      </div>

      <div className="mt-8 w-full max-w-xl rounded-2xl overflow-hidden border border-outline-variant shadow-xl">
        <img 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCymzWAo0s83hW1iHG3wAEybujJoVQp9eIUDn7yTmElLtGHvRDZY_0N7Db-xY3KKKNdZzn3tZt5ZWfPizGJFuEuawVwBdVweu7fsjbW7ow60kCtCUH0h9zYxHLrURSvN6hOHNNOWWjwXJur1lvaywek0xiiVX5gIgedPQrBIn4qYzFOuHf1qDLH74zX_2siDkBtDn0veV8WqRDRKEsUTJWj3PjRyURU_5VyKuD44SA8n4Rj9n8ewLJmpNkK3_PzSBPhQ45hBWdIEu0" 
          alt="Renovation" 
          className="w-full h-40 object-cover"
        />
      </div>
    </div>
  );
}
