import { ArrowLeft, Payments, Camera, CheckCircle2, UserPlus, Info, AlertTriangle, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

// Correcting icons
import { ArrowLeft as ArrowLeftIcon, CreditCard, Camera as CameraIcon, CheckCircle2 as CheckIcon, UserPlus as UserIcon, Info as InfoIcon, AlertTriangle as WarningIcon, ChevronRight as RightIcon } from 'lucide-react';

interface NotificationsProps {
  onBack: () => void;
}

export function Notifications({ onBack }: NotificationsProps) {
  return (
    <div className="min-h-screen pb-32 bg-surface">
      <header className="bg-surface sticky top-0 z-50 h-16 border-b border-outline-variant px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-surface-container active:scale-95">
            <ArrowLeftIcon className="w-6 h-6 text-primary" />
          </button>
          <h1 className="text-xl font-bold text-primary">Notificações</h1>
        </div>
        <div className="w-8 h-8 rounded-full border border-outline-variant overflow-hidden">
          <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuB6pd2SvXd_eA1hPv6DR4bvO0OR2NNRvs7Z0BjEt9oTg2nieBm6Mhb6WIdGE7MLO1SJZvIr7MvZOSm01uS-veuTOISAFQZvQrYv3Gv5t16NJgTVTKMq-5-d6CgkSRhik8j7JpZmEqUByb-JKS26twwv1YRqIVJC8g1RWkbSUMdODqiAjHqtB3PTA_3N4H1cLLYMkv70WnGcgaJdJGuhiezIZdoq7wBKZm8j-3gaAL330f26Pcb-oIYY_wOCE57F-eQCUgsKaAhOgvI" alt="User" />
        </div>
      </header>

      <main className="p-4 space-y-8 max-w-2xl mx-auto">
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black text-outline uppercase tracking-widest">Hoje</h2>
            <button className="text-[10px] font-black text-secondary uppercase tracking-widest">Marcar tudo</button>
          </div>
          <div className="space-y-3">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 flex gap-4 relative shadow-sm">
              <div className="w-2 h-2 bg-secondary rounded-full absolute top-5 right-4" />
              <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div className="pr-4">
                <p className="text-sm font-medium text-on-surface">💰 <strong className="font-black">Parcela de R$ 7.600</strong> vence amanhã</p>
                <p className="text-[10px] font-bold text-outline mt-1.5 uppercase tracking-wider">Financeiro • 2h atrás</p>
              </div>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 flex gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-secondary-container/10 flex items-center justify-center shrink-0 border border-secondary/10">
                <CameraIcon className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-on-surface">📸 <strong className="font-black">Nova foto</strong> adicionada ao projeto Mansão Alpha</p>
                <p className="text-[10px] font-bold text-outline mt-1.5 uppercase tracking-wider">Galeria • 5h atrás</p>
                <div className="mt-4 flex gap-2">
                   <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAr97k6rstMsfAexYR_tnl_VFJw9iNkpisen0ClKmt5pWUmOWWfOgHlj3sJE3fsJjB1ZPDDOfWGag4YiPskR2Qvr-NsRWX8Z171BOC-26pd-eKBmwEZMIaf5BF1K_tsqcMZHDnBfpmP9Z0d-wWuK6fwQlGO3og8lx-nsYcFTjAN93XyEh-Yz8dmeWf6yLgbO06xI-P2Q-4J4oPoHHfaLkXluQlcBKVpgkQJ0cwVDQFy2NdS05UnUMCTRkV3ldcDR5967wdTxXw7o54" className="w-16 h-16 rounded-xl object-cover border border-outline-variant shadow-sm" />
                   <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-XwYYZCns9Gpyv41U14ySFZwhy4buxX3T6egrA4knlHCRDAdTQa2eSU5TsWOGTjwZnhB5l6PkH2UumkyT3MJ7gJBNBIh1Ujthvy7AYyIKUrqOVH-gGeqAEkt7dMMJFp4dFjl7UmnP00wZdWUC6UO1TV7l9IxRvBfpoXFsn7aI9A2gt2yOSHESi6okoRtoO7DPhAvb4-JzaNrVt3HXqtkM2EZscguhRXv1fsHAM6r0dH5FVowZPWGy4PvUreME6VVefH0avO7YsBU" className="w-16 h-16 rounded-xl object-cover border border-outline-variant shadow-sm" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-outline uppercase tracking-widest px-1">Ontem</h2>
          <div className="space-y-3">
             <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 flex gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                  <CheckIcon className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-on-surface">✅ <strong className="font-black">Tarefa concluída</strong>: Instalação dos pisos porcelanato</p>
                  <p className="text-[10px] font-bold text-outline mt-1.5 uppercase tracking-wider">Cronograma • Ontem às 16:45</p>
                </div>
              </div>
          </div>
        </section>
      </main>
    </div>
  );
}
