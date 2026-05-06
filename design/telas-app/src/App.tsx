import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Screen, Project, FeedPost, Payment } from './types';
import { Login } from './screens/Login';
import { Home } from './screens/Home';
import { ProjectDetail } from './screens/ProjectDetail';
import { Feed } from './screens/Feed';
import { BudgetAnalysis } from './screens/BudgetAnalysis';
import { Finance } from './screens/Finance';
import { Documents } from './screens/Documents';
import { Profile } from './screens/Profile';
import { AIChat } from './screens/AIChat';
import { Notifications } from './screens/Notifications';
import { BottomNav } from './components/BottomNav';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const projects: Project[] = useMemo(() => [
    {
      id: '1',
      name: 'Apê 62 — Reforma Completa',
      location: 'Araras, SP',
      progress: 65,
      spent: 45200,
      budget: 80000,
      status: 'Em obra',
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAkVly6hV11b5_ULuz-e_xBeNE1OUkY_M91HAQ52JU01KNTc0X7ezvcV_GmMKG2y9UWctwC0UhMW3kbJ2LOAzd9qN_5wYhXKnWXa3rU_p-KH-C6SVqWTkRQPBTGgMO9IYIA0Tg8fSsQFMYwvgvJoyp3bXc5B_hlhr7Yz76oboVf6z1n_VwYzJQGJyJr_-bvsD1h39PD9SaOPhwlccnq09-hXzv8NOhcJRZFrZhXkPogDYUZ4x5U-3bv46iMm17YxvK1aaB9xdENrLI'
    },
    {
      id: '2',
      name: 'Casa Jardim — Suíte Master',
      location: 'São Paulo, SP',
      progress: 12,
      spent: 5000,
      budget: 42000,
      status: 'Planejamento',
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDEjeN9WOHiGts84pRDaJD1gQdyzPNkjcYZR4YNmuTUDg3pX4mhXZKReJinb5uu7uzb9rUPH54tUQlSNZgzmbRqTnWx9kJGsa73ihF_Tv7VjyDh30pJvUlrrwqYkJKYPPlMjIMuzaJu61uSp7A1ixt0UkfOJcV3w46nXBexm3tNFJ7eBCK62HVgEbgW3Nzo3GTkQ9SQ5tvIeKBZsgjCd-7nMaITtKA_E5D4AZO2w6hJnPVPGf74-WQhDPA71uplnL9OgkPhB0A8jjc'
    },
    {
      id: '3',
      name: 'Loft Industrial — Entrega',
      location: 'Campinas, SP',
      progress: 100,
      spent: 120000,
      budget: 120000,
      status: 'Finalizado',
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCCLMK319i68hqdubtl764GOsjPyvYzEetx8mKcHg4ra9XinvA4hq0xmtj_Nt1Tf3rpUQBv5gkPawghUqR-p79tibpY79Zz9wI2_iScamzaOTh-RTgHD8r4QKbOSb1osJnWN39NeZV3BH51K2fdbMF2BkMl3QK4QcG1jiazvu6RbvXDr6HU08wdYiBc1leKZ_LFwsW5jkD7F9r_tkXUJcL-FimWx1THdHhaUIycfooEiEvZc8PoUT1HQgJRKayV1Xul1K2WXZOY0k'
    }
  ], []);

  const feedPosts: FeedPost[] = useMemo(() => [
    {
      id: '1',
      author: 'Rodolfo',
      role: 'Alvenaria',
      time: 'há 2h',
      content: 'Fase de alvenaria avançando rápido na sala principal! Próximo passo: reboco.',
      likes: 24,
      comments: 3,
      avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD3LseKpv_D4JcxcrtN1hOo8Ufau_IOZa4OiiYpJAV8tueD3PY7_KaxxroqJ1GunW9nnNEiIkGh4-QDW9mAhYCCfTy9YjO5c8NLWUNqdnHOLXjVGwz7n2N-7J7R_6VwnlHJ2ip0x8w0RaKD0fqWLcAQIpFEEfDVrbnL_JqAZPNwDd134OcylUikRMWVfWOHlIoKxPCHIDc7gK2dL4LvA-Mei1wSdk10F_mKG_MK8Y-owCw4eaKSc3EmG2EeiIy3LuaazdkPrOZLCiA',
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBPsxY5F-zHKq0g_aDkGmKyp8klI8FGxrQFmzYuk-p6ZNfQJaeEFFbKLw8HvQDi5OwUlV_EAdhlMbVqVHFp83ZGOYlVn792Z9BXdyXqwbJUCoSVWEK8Tx2_dP4oXlOxujFhMIQg9ZEtaRmsSkh5-YWdcf5-Jg9rXkV8aKy-O__eCQl7e0ACAIU9a0tF0t4ajJYm0VFWlREAr0vAmfI8WdD166kq7NTxhxVrpyRbTOz1EhqGz_f00hS4quDqaTNGaaubYfhrOC_3Y6U'
    },
    {
      id: '2',
      author: 'Julia Arq.',
      role: 'Planejamento',
      time: 'há 5h',
      content: 'Revisando as plantas para a Mansão Alpha. O design da iluminação está ficando incrível.',
      likes: 42,
      comments: 7,
      avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBM3o6SxIuvzW0nRSjdo3Bn1tEamxWF7eiYTqrkVuIg715JOQLaD0xdnxqymZosl_uDwhzWiFzvFObOoPYuXlrlC6_rF8cYPFs2WtQNuemQKq9Ujs67cyNtko54jcn0s7ES1AucUtHY2hxssCuywkb9bkahjAFrzs3EVd9MCYaLbG1ISDzprRY1WZa4f5qiGw7Bc4Vxqz4TLFrZ08iDnN7tO-wEsq6B6g7XLL4dU30bYaVUHB8JkhDtQ_Hsy0sFQjPL4p6tzNs2NPE',
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCDoDfMGEfpZShKLB-x7b4-tv8u3R32Grsq4gY_z9B5xF70cG6ohH_QGc9AoW8x3Nrj2ueRGiqdQIoSdn1NenQzlYuzHYBP2z8oupS_W51VkzxWpt7hIvjrFWSkd8uHPyqOUjp-3FCv8EwY0oMXg5o7q_Y8_0yupXmND21dNn4L8FDshu6qAdVkyNZh8JCxzyrptTt30bcxrF4bcc6LYtehZEgKAZ7mUg1I_s8OOVk-RaVs7RPvvehfyPFjumqyiTWJ5wG-pKDOkBo'
    }
  ], []);

  const payments: Payment[] = useMemo(() => [
    { id: '1', recipient: 'Rodolfo - Parcela 2/5', category: 'Mão de obra - Pintura', amount: 7600, dueDate: '15/04', status: 'Pendente' },
    { id: '2', recipient: 'Loja de Materiais XYZ', category: 'Materiais - Piso Cerâmico', amount: 3250, dueDate: '12/04', status: 'Pago' }
  ], []);

  const handleNavigate = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setCurrentScreen('projectDetail');
  };

  const currentContent = () => {
    switch (currentScreen) {
      case 'login':
        return <Login onLogin={() => setCurrentScreen('home')} />;
      case 'home':
        return <Home projects={projects} onSelectProject={handleSelectProject} />;
      case 'projectDetail':
        return selectedProject ? (
          <ProjectDetail 
            project={selectedProject} 
            onBack={() => setCurrentScreen('home')} 
            onNavigate={setCurrentScreen}
          />
        ) : <Home projects={projects} onSelectProject={handleSelectProject} />;
      case 'feed':
        return <Feed posts={feedPosts} />;
      case 'budgetAnalysis':
        return <BudgetAnalysis onBack={() => setCurrentScreen('projectDetail')} />;
      case 'finance':
        return <Finance onBack={() => setCurrentScreen('home')} payments={payments} />;
      case 'documents':
        return <Documents onBack={() => setCurrentScreen('projectDetail')} />;
      case 'profile':
        return <Profile onLogout={() => setCurrentScreen('login')} onBack={() => setCurrentScreen('home')} />;
      case 'notifications':
        return <Notifications onBack={() => setCurrentScreen('home')} />;
      case 'chat':
        return <AIChat onBack={() => setCurrentScreen('projectDetail')} />;
      default:
        return <Home projects={projects} onSelectProject={handleSelectProject} />;
    }
  };

  const showNav = currentScreen !== 'login' && currentScreen !== 'budgetAnalysis' && currentScreen !== 'chat';

  return (
    <div className="bg-surface min-h-screen">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {currentContent()}
        </motion.div>
      </AnimatePresence>
      
      {showNav && (
        <BottomNav currentScreen={currentScreen} onNavigate={handleNavigate} />
      )}
    </div>
  );
}
