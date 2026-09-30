import React from 'react';
import { Home, BookOpen, ShoppingBag, ShieldCheck, ClipboardList } from 'lucide-react';
import { useApp, ActiveView } from '../contexts/AppContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils';

export default function BottomNav() {
  const { activeView, setActiveView, orders } = useApp();
  const { totalItems } = useCart();
  const { profile } = useAuth();

  const isEmployee = profile?.role === 'admin' || profile?.role === 'superadmin';

  // Calculate active non-delivered orders for badge
  const activeOrdersCount = orders?.filter(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled'
  ).length || 0;

  const navItems: { view: ActiveView; label: string; icon: React.ComponentType<any>; badge?: number }[] = [
    { view: 'home', label: 'Início', icon: Home },
    { view: 'menu', label: 'Cardápio', icon: BookOpen },
    { view: 'my-orders', label: 'Pedidos', icon: ClipboardList, badge: activeOrdersCount },
    { view: 'cart', label: 'Carrinho', icon: ShoppingBag, badge: totalItems },
    ...(isEmployee ? [{ view: 'admin' as const, label: 'Painel', icon: ShieldCheck }] : []),
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200/80 bg-white/95 backdrop-blur-xl pb-safe shadow-[0_-4px_25px_rgba(0,0,0,0.08)] transition-all"
      aria-label="Navegação principal"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {navItems.map(({ view, label, icon: Icon, badge }) => {
          const isActive = 
            activeView === view || 
            (view === 'cart' && activeView === 'checkout');

          return (
            <button
              key={view}
              id={`nav-btn-${view}`}
              onClick={() => setActiveView(view)}
              className="relative flex flex-col items-center justify-center w-16 h-full transition-all active:scale-95"
            >
              <div
                className={cn(
                  "relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-300",
                  isActive
                    ? "bg-orange-600 text-white shadow-md shadow-orange-500/25 scale-105"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/80"
                )}
              >
                <Icon className="h-5 w-5" />
                {badge !== undefined && badge > 0 && (
                  <span 
                    className={cn(
                      "absolute -top-1 -right-1 flex h-4.5 min-w-[18px] px-1 items-center justify-center rounded-full text-[9px] font-black text-white ring-2 ring-white shadow-sm animate-pulse",
                      isActive ? "bg-gray-900" : "bg-orange-600"
                    )}
                  >
                    {badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-bold tracking-tight mt-0.5 transition-colors",
                  isActive ? "text-orange-600" : "text-gray-500"
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

