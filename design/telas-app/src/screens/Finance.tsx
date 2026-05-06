import { ArrowLeft, Wallet, Calendar, TrendingUp, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import { formatCurrency, cn } from '../lib/utils';
import { Payment } from '../types';

interface FinanceProps {
  onBack: () => void;
  payments: Payment[];
}

export function Finance({ onBack, payments }: FinanceProps) {
  const chartData = [
    { name: 'Mão de obra', value: 45, color: '#022448' },
    { name: 'Material', value: 35, color: '#0051d5' },
    { name: 'Projeto', value: 20, color: '#adc8f5' },
  ];

  const monthlyData = [
    { name: 'Nov', value: 4000 },
    { name: 'Dez', value: 6000 },
    { name: 'Jan', value: 3500 },
    { name: 'Fev', value: 7500 },
    { name: 'Mar', value: 9000 },
    { name: 'Abr', value: 5500 },
  ];

  return (
    <div className="min-h-screen pb-32">
      <header className="bg-surface border-b border-outline-variant sticky top-0 z-50 h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-surface-container active:scale-95">
            <ArrowLeft className="w-6 h-6 text-primary" />
          </button>
          <h1 className="text-xl font-bold text-primary">Financeiro</h1>
        </div>
        <div className="w-8 h-8 rounded-full border border-outline-variant overflow-hidden">
          <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCu0oF_SueiI7zgKFmLLzny8AUZc4toWOIMV1gqpTYHtzKHePtP_VZQMwrgc9vKnE24ry8WNzUf0odjJ2-a8izKlIwIzfFQWf9ttP59peEcyqZ00jcdfTckXK89cGNwHR4jMu7jH8hiOgzTe7ueuBU2Be6T_WW4wqFTV3EvJjwwIxhJW8GQPDa_itBvsaaAXJcejKxjL1yNA4NPfQyVRPOdnuTQd63JFA_7iDbeS1SIVj8h--ZgS8FEBy9EC8Tv1HuQReVjOi2He0k" alt="Profile" />
        </div>
      </header>

      <main className="px-4 py-6 space-y-8">
        {/* Summary Cards */}
        <section className="grid grid-cols-2 gap-4">
          <div className="col-span-2 p-5 bg-surface-container-lowest border border-outline-variant rounded-2xl flex justify-between items-center shadow-sm">
            <div>
              <p className="text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-widest">Saldo em Conta</p>
              <p className="text-3xl font-black text-primary">{formatCurrency(14250)}</p>
            </div>
            <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div className="p-4 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm">
            <p className="text-[10px] font-bold text-on-surface-variant mb-2 uppercase tracking-widest">Total pago</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <p className="text-lg font-bold text-emerald-600 font-mono">{formatCurrency(82400)}</p>
            </div>
          </div>
          <div className="p-4 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm">
            <p className="text-[10px] font-bold text-on-surface-variant mb-2 uppercase tracking-widest">A pagar</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <p className="text-lg font-bold text-orange-600 font-mono">{formatCurrency(45100)}</p>
            </div>
          </div>
        </section>

        {/* Cost Breakdown */}
        <section className="bg-surface-container-lowest p-6 border border-outline-variant rounded-2xl shadow-sm space-y-6">
          <h3 className="text-xl font-bold text-primary">Divisão de Custos</h3>
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="w-48 h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Total</p>
                <p className="text-2xl font-black text-primary">127k</p>
              </div>
            </div>
            <div className="flex-1 w-full space-y-3">
              {chartData.map((item) => (
                <div key={item.name} className="flex justify-between items-center group">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-semibold text-on-surface">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold text-on-surface-variant bg-surface-container px-2 py-1 rounded-md">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xl font-bold text-primary">Próximos Pagamentos</h3>
            <button className="text-secondary font-bold text-xs uppercase tracking-widest">Ver tudo</button>
          </div>
          <div className="space-y-3">
            {payments.map((payment) => (
              <motion.div 
                key={payment.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-surface-container-lowest border border-outline-variant rounded-2xl flex flex-col gap-4 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-base font-bold text-primary">{payment.recipient}</p>
                    <p className="text-xs font-medium text-on-surface-variant mt-0.5">{payment.category}</p>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
                    payment.status === 'Pendente' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                  )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full", payment.status === 'Pendente' ? 'bg-orange-500' : 'bg-emerald-500')} />
                    {payment.status}
                  </span>
                </div>
                <div className="flex justify-between items-end pt-3 border-t border-outline-variant/30">
                  <p className="text-xl font-black text-primary font-mono">{formatCurrency(payment.amount)}</p>
                  <p className="text-[10px] font-bold text-on-surface-variant flex items-center gap-1.5 uppercase tracking-widest">
                    <Calendar className="w-3.5 h-3.5" /> {payment.dueDate}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Monthly Chart */}
        <section className="p-6 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-primary">Gasto Mensal</h3>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Últimos 6 meses
            </span>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#74777f', fontWeight: 600 }}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#022448" 
                  radius={[4, 4, 0, 0]} 
                  opacity={0.8}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </main>
    </div>
  );
}
