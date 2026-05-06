import { ArrowLeft, Search, FileText, Camera, MoreVertical } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface DocumentsProps {
  onBack: () => void;
}

export function Documents({ onBack }: DocumentsProps) {
  const docs = [
    { name: 'Planta_Baixa_Final.pdf', type: 'Planta', date: '10/03/2024', imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAxwwqvKjlp2hec7GqGvOL4LtHurx8bPaBQyq-6ZlLBamBZW68MfQfJ713h0HgpXouol4ZtoE5WE8VpXxLhGTVOlR0wKnFZhENZWUym53yT2lP_PTAF6vGr3Z4r4YK26pNntbZa3fjTq0P_SBLhLVlxkMXufw6D9v_3CqiOfVhw9ugE2PntiNGPJ2n3KRp48jNPfnufRzUw6yv1GhMTfLj_rOZzvJGQEBxI_ZwVmT75P2O49yE418xfIzb337VTORzkKPuDid6if-s' },
    { name: 'Nota_Fiscal_Cimento.pdf', type: 'Nota Fiscal', date: '08/03/2024', imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDa1eVXlLmUX1CI-7m9unuqPzJy1Q7qdsgJZK0fu25N8UcuEOz9kF-HyGasZrCmBoCOqPCDIWTeJXT0RdxqEb5hAtpD62MUoqpFoFhAYI9I5cKUnQAmZ6Ev4_NqUjSg7dT6s-uHYU0WWDRDUpFg6e2Q2yRLDq9_rDf73gkU9K3zCJuYy9xJd_H0SzCMhWeJCNH7dCPRFcAQIUKpsSQEE670W01oDTTKdA3cd9PjVe90Sd0vuFL6a8SlWwASn5ANGshbtRpnjqbPt3c' },
    { name: 'Contrato_Prestacao.pdf', type: 'Contrato', date: '05/03/2024', imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDt_fEMi14JdGQ_Vk9tfUgm2eii7h0FY1I3vMYQex_qGQQWSFASeijykDSs-0oSSpJTZYd46En0x6IHG13vQLBesgi7XEmQM5YEqu8ufnw7f0KkOOHA2M8EDVVNLThJ9_SbIKc_gftBzRH1HupZmhclZleoSDMraYRc_jKEDMQnxC-7dQuS9YIkruVRMpOHMUr2A8i1HJ21jkb0jtALm8wWW1Q4S4dtdxf_3ionMPLm0a8LQlnwsjRMP20W_uswz0H9Us6ampAU5S0' },
  ];

  return (
    <div className="min-h-screen pb-32 bg-surface">
      <header className="bg-surface border-b border-outline-variant sticky top-0 z-50 h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-surface-container active:scale-95">
            <ArrowLeft className="w-6 h-6 text-primary" />
          </button>
          <h1 className="text-xl font-bold text-primary">Documentos</h1>
        </div>
        <div className="w-8 h-8 rounded-full border border-outline-variant overflow-hidden">
          <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6n-wT1Ljv38s_-JpmX7gEG9e3jdAI-0-4DrKI25XKvsZUeK0Qn9GJaM18kVEI7INgfDs4XRX7ZkMhtKVQchxHS8W7CLvdyOmOZfH2lf_SUODdse72vcZ2wUEt-FhpSk-s5NENoIvmA797PB0TzzYXZxlliAuxSR7-O_Mi4LPyCDcREvHtoCUNaprbVWdPhZ0rhDlbs4IqH02rZlI2VUCOFE6Kq16H4-qbYu41YmYxzBxvti5Lsa2XZVlbvSxlG_xLVTXwPljf8KY" alt="Profile" />
        </div>
      </header>

      <main className="p-4 space-y-6">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-secondary transition-colors" />
          <input 
            className="w-full h-12 pl-12 pr-4 bg-surface-container-low border border-outline-variant rounded-xl font-medium focus:ring-1 focus:ring-secondary focus:border-secondary transition-all outline-none" 
            placeholder="Buscar documentos..." 
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {['Todos', 'Contrato', 'Planta', 'Nota Fiscal'].map((filter, i) => (
            <button 
              key={filter} 
              className={cn(
                "px-5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95",
                i === 0 ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant border border-outline-variant"
              )}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {docs.map((doc, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm active:scale-98 transition-transform cursor-pointer"
            >
              <div className="aspect-square relative bg-surface-container overflow-hidden">
                <img src={doc.imageUrl} alt={doc.name} className="w-full h-full object-cover opacity-60" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-surface shadow-lg p-2.5 rounded-xl border border-outline-variant">
                    <FileText className="w-6 h-6 text-secondary" />
                  </div>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-bold text-on-surface leading-tight truncate">{doc.name}</p>
                <p className="text-[10px] font-bold text-outline mt-1.5 uppercase tracking-wide">{doc.type} • {doc.date}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      <button className="fixed bottom-24 right-4 w-14 h-14 bg-secondary-container text-on-secondary-container rounded-2xl shadow-xl flex items-center justify-center active:scale-90 transition-transform">
        <Camera className="w-7 h-7" />
      </button>
    </div>
  );
}
