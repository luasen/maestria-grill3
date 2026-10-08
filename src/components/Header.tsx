import React from 'react';
import { ShoppingBag, ChevronLeft, ShieldCheck, User, Bike } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';

interface HeaderProps {
  onBack?: () => void;
  title?: string;
  showBack?: boolean;
}

export default function Header({ onBack, title, showBack = false }: HeaderProps) {
  const { settings, activeView, setActiveView } = useApp();
  const { totalItems } = useCart();
  const { user, profile, setIsAuthOpen } = useAuth();

  const isHome = activeView === 'home';
  const isAdmin = activeView === 'admin';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-orange-100/60 bg-white/85 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-4">
        {/* Left Side: Brand or Back Button */}
        <div className="flex items-center gap-3">
          {showBack || onBack ? (
            <button
              onClick={onBack}
              id="btn-back"
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-gray-200/80 text-gray-700 transition hover:bg-gray-50 active:scale-95 shadow-sm"
              title="Voltar"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          ) : (
            <div
              onClick={() => setActiveView('home')}
              className="flex cursor-pointer items-center gap-2.5 select-none"
              id="header-brand"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-xl shadow-md shadow-orange-500/25 border border-orange-300/40">
                {settings?.logoUrl || '🥩'}
              </span>
              <div>
                <h1 className="font-sans text-sm sm:text-base font-extrabold text-gray-900 leading-tight tracking-tight">
                  {title || settings?.name || 'Maestria Grill'}
                </h1>
                {!title && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                      {settings?.maintenanceMode ? 'Fechado' : 'Aberto agora'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Action Icons */}
        <div className="flex items-center gap-2">
          {/* Motoboy toggle if not in motoboy and authorized */}
          {activeView !== 'motoboy' && (profile?.role === 'motoboy' || profile?.role === 'admin' || profile?.role === 'superadmin') && (
            <button
              onClick={() => setActiveView('motoboy')}
              id="btn-nav-motoboy-header"
              className="flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-xs font-bold text-gray-600 bg-white border border-gray-200/80 transition hover:bg-orange-50 hover:text-orange-600 shadow-sm"
              title="Área do Motoboy"
            >
              <Bike className="h-4 w-4 text-orange-600" />
              <span className="hidden sm:inline">Motoboy</span>
            </button>
          )}

          {/* Admin toggle if not in admin and user has admin privileges */}
          {!isAdmin && (profile?.role === 'admin' || profile?.role === 'superadmin') && (
            <button
              onClick={() => setActiveView('admin')}
              id="btn-nav-admin-header"
              className="flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-xs font-bold text-gray-600 bg-white border border-gray-200/80 transition hover:bg-orange-50 hover:text-orange-600 shadow-sm"
              title="Painel Administrativo"
            >
              <ShieldCheck className="h-4 w-4 text-orange-600" />
              <span className="hidden sm:inline">Painel</span>
            </button>
          )}

          {/* Cart Button */}
          {activeView !== 'cart' && activeView !== 'checkout' && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveView('cart')}
              id="btn-header-cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-orange-100/90 text-orange-600 hover:bg-orange-50 hover:border-orange-300 shadow-sm transition cursor-pointer"
              title="Ver Carrinho"
            >
              <ShoppingBag className="h-4.5 w-4.5" />
              {totalItems > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  key={totalItems}
                  className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] px-1 items-center justify-center rounded-full bg-orange-600 text-[10px] font-black text-white shadow-sm ring-2 ring-white"
                >
                  {totalItems}
                </motion.span>
              )}
            </motion.button>
          )}

          {/* User / Profile Icon */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (user) {
                setActiveView('my-orders');
              } else {
                setIsAuthOpen(true);
              }
            }}
            id="btn-header-user"
            className={`relative flex h-10 w-10 items-center justify-center rounded-2xl border transition shadow-sm cursor-pointer ${
              user
                ? 'bg-orange-500/10 border-orange-300 text-orange-600 font-bold hover:bg-orange-500/20'
                : 'bg-white border-orange-100/90 text-gray-600 hover:text-orange-600 hover:border-orange-300'
            }`}
            title={user ? `Minha Conta (${profile?.name || 'Cliente'})` : 'Entrar na Conta'}
          >
            {user ? (
              <span className="text-xs uppercase font-extrabold">{profile?.name?.charAt(0) || 'U'}</span>
            ) : (
              <User className="h-4.5 w-4.5" />
            )}
          </motion.button>
        </div>
      </div>
    </header>
  );
}
