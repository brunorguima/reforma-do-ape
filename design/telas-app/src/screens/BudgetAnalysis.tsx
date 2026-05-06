import { ArrowLeft, FileType, Sparkles, CheckCircle2, History, TrendingUp, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { formatCurrency, cn } from '../lib/utils';

interface BudgetAnalysisProps {
  onBack: () => void;
}

export function BudgetAnalysis({ onBack }: BudgetAnalysisProps) {
  const items = [
    { name: 'Cimento CP II 50kg', qty: '20 un', price: 34.90, status: 'BOM PREÇO', statusColor: 'bg-emerald-100 text-emerald-800' },
    { name: 'Areia Lavada Fina', qty: '5 m³', price: 120.00, status: 'NA MÉDIA', statusColor: 'bg-yellow-100 text-yellow-800' },
    { name: 'Vergalhão CA50 10mm', qty: '15 un', price: 58.50, status: 'BOM PREÇO', statusColor: 'bg-emerald-100 text-emerald-800' },
  ];

  const total = items.reduce((acc, item) => acc + (item.price * parseFloat(item.qty)), 0);

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-surface border-b border-outline-variant fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-surface-container active:scale-95">
            <ArrowLeft className="w-6 h-6 text-primary" />
          </button>
          <h1 className="text-xl font-bold text-primary">Analisar Orçamento</h1>
        </div>
        <div className="w-8 h-8 rounded-full border border-outline-variant overflow-hidden">
          <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAUpRlyRiTzrLmLrKv2uAaicVnrVeVF3OHI0zsHHvWcl0LJMDpUEBvX04ofv89pv8XhnOD0CV52LWLydxD5wSpeHHgKQPK6kCO5r_dFlJgFkX1n3B68yAt4ycsd_yr-OLlbyo549JxZ-OOG8tYXLw7yUfJaArXjjHIGs_L4s02ru6LppbRzRcgm9pe6JI7jylCoQYcc53isN6vyivyIakx0_7Xd6rCQDiB0uokwJtbpP-3lxZBqO7rA3ljkFsofd_yhV_H1FqimrPM" alt="Profile" />
        </div>
      </header>

      <main className="pt-20 pb-40 px-4 max-w-2xl mx-auto space-y-8">
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-outline uppercase tracking-widest px-1">Documento Original</h2>
          <div className="relative w-full aspect-[3/4] rounded-2xl border border-outline-variant bg-surface-container overflow-hidden group shadow-lg">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAmAz3tDmdYUFYU51wPAaWZsnsFCw_gL6pMediKMBNsbUvnsKl5Er3paTL9QYxeTrfPNua2AyQPTchqTs4lG4pF9HJozE-ardky_0FPXqknWwcaQ75FlEQCQDn5-prEI37OtSlZHDSQ0Lsdpv7ZQfziBZCcoXTezlBGlmeisXXtfW47Jo4y0P1riMoWqA89c78ghWWJP-m1EFCeFj1wKUdXJYX4LWkbNPhckb1HSTqabuepuRXj4atIzDsnAnMzYJdx-OPIvca_VoI" 
              alt="Quote PDF" 
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300" 
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/5">
              <span className="bg-surface/90 backdrop-blur-md px-6 py-3 rounded-full text-xs font-bold text-primary flex items-center gap-2 shadow-xl border border-white/20">
                <FileType className="w-5 h-5" />
                Ver PDF Original
              </span>
            </div>
          </div>
        </section>

        <motion.section 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-primary-container text-on-primary-container p-5 rounded-2xl border border-primary/20 flex items-center gap-4 shadow-xl"
        >
          <div className="w-12 h-12 rounded-xl bg-inverse-primary/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-7 h-7 text-inverse-primary fill-current" />
          </div>
          <div>
            <p className="text-lg font-bold text-white leading-tight">IA identificou 12 itens</p>
            <p className="text-sm font-medium opacity-80 mt-1">Digitalização concluída com 98% de precisão.</p>
          </div>
        </motion.section>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-4 py-3 text-[10px] font-bold text-outline uppercase tracking-widest">Item</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-outline uppercase tracking-widest">Qtd</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-outline uppercase tracking-widest text-right">Preço</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-outline uppercase tracking-widest text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4">
                      <p className="text-sm font-bold text-on-surface">{item.name}</p>
                      <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black mt-1.5", item.statusColor)}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-on-surface-variant font-mono">{item.qty}</td>
                    <td className="px-4 py-4 text-sm font-medium text-right font-mono">{formatCurrency(item.price)}</td>
                    <td className="px-4 py-4 text-sm font-bold text-primary text-right font-mono">
                      {formatCurrency(item.price * parseFloat(item.qty))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-surface-container-low p-5 flex justify-between items-center border-t border-outline-variant">
            <span className="text-[10px] font-black text-outline tracking-tightest">TOTAL GERAL</span>
            <span className="text-2xl font-black text-primary">{formatCurrency(total)}</span>
          </div>
        </div>

        <section className="bg-white border border-outline-variant rounded-2xl p-5 space-y-4 shadow-sm relative overflow-hidden">
          <History className="absolute top-2 right-2 w-16 h-16 text-outline opacity-5 -mr-4 -mt-2" />
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-secondary" />
            <h3 className="text-[10px] font-black text-secondary uppercase tracking-widest">Análise de Mercado</h3>
          </div>
          <p className="text-lg font-bold text-primary">Veredicto IA: Preço justo ✅</p>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Este orçamento está <span className="font-bold text-on-surface">4.2% abaixo</span> da média regional para materiais de primeira linha. Recomendamos o fechamento imediato para garantir estes valores.
          </p>
          <div className="pt-2 space-y-2">
            <div className="flex justify-between text-[9px] font-black text-outline uppercase tracking-wider">
              <span>Muito caro</span>
              <span>Justo</span>
              <span>Excelente</span>
            </div>
            <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '85%' }}
                className="h-full bg-secondary rounded-full" 
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-surface border-t border-outline-variant p-4 z-50 shadow-2xl">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          <button className="h-14 w-full bg-secondary text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-95 active:scale-98 transition-all shadow-lg shadow-secondary/10">
            <CheckCircle2 className="w-6 h-6" />
            Aprovar orçamento
          </button>
          <button className="h-14 w-full bg-white border border-outline text-primary font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-surface-container-low active:scale-98 transition-all">
            <History className="w-6 h-6" />
            Negociar
          </button>
        </div>
      </footer>
    </div>
  );
}
