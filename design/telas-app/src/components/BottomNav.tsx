import { Home, Rss, Bell, User } from 'lucide-react';
import { Screen } from '../types';
import { cn } from '../lib/utils';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export function BottomNav({ currentScreen, onNavigate }: BottomNavProps) {
  const navItems = [
    { id: 'home' as Screen, label: 'Home', icon: Home },
    { id: 'feed' as Screen, label: 'Feed', icon: Rss },
    { id: 'notifications' as Screen, label: 'Alerts', icon: Bell },
    { id: 'profile' as Screen, label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full h-16 flex justify-around items-center px-4 bg-surface border-t border-outline-variant z-50">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className={cn(
            "flex flex-col items-center justify-center transition-all duration-200",
            currentScreen === item.id 
              ? "text-secondary bg-secondary-container/10 rounded-xl px-2 py-1 scale-98" 
              : "text-on-surface-variant hover:text-primary"
          )}
        >
          <item.icon className={cn("w-6 h-6", currentScreen === item.id && "fill-current")} />
          <span className="text-[10px] font-medium mt-1 uppercase tracking-wider">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
