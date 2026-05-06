export type Screen = 'login' | 'home' | 'feed' | 'projectDetail' | 'finance' | 'documents' | 'profile' | 'chat' | 'budgetAnalysis' | 'notifications';

export interface Project {
  id: string;
  name: string;
  location: string;
  progress: number;
  spent: number;
  budget: number;
  status: 'Em obra' | 'Planejamento' | 'Finalizado';
  imageUrl: string;
}

export interface Activity {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  type: 'check' | 'budget' | 'photo';
}

export interface FeedPost {
  id: string;
  author: string;
  role: string;
  time: string;
  content: string;
  likes: number;
  comments: number;
  avatarUrl: string;
  imageUrl: string;
}

export interface Payment {
  id: string;
  recipient: string;
  category: string;
  amount: number;
  dueDate: string;
  status: 'Pendente' | 'Pago' | 'Aprovado';
}
