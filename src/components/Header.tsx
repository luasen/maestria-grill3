import React, { useState } from 'react';
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
    <header className="sticky top-0 z-40 w-full border-b border-white/20 bg-white/35 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {showBack || onBack ? (
            <button
              onClick={onBack}
              id="btn-back"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/50 border border-white/35 text-gray-700 transition hover:bg-white/80 active:scale-95 shadow-sm"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          ) : (
            <div 
              onClick={() => setActiveView('home')} 
              className="flex cursor-pointer items-center gap-2"
              id="header-brand"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500 text-xl shadow-md shadow-orange-500/20">
                {settings?.logoUrl || '🍔'}
              </span>
              <div>
                <h1 className="font-sans text-base font-bold text-gray-900 leading-tight">
                  {title || settings?.name || 'Gourmet Bistro'}
                </h1>
                {!title && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">Aberto Agora</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action icons on right */}
        <div className="flex items-center gap-2">
          {/* Motoboy toggle if not in motoboy */}
          {activeView !== 'motoboy' && (
            <button
              onClick={() => setActiveView('motoboy')}
              id="btn-nav-motoboy-header"
              className="flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-gray-500 transition hover:bg-white/30 hover:text-gray-900 border border-transparent hover:border-white/20"
              title="Área do Motoboy"
            >
              <Bike className="h-4.5 w-4.5" />
              <span className="hidden sm:inline">Motoboy</span>
            </button>
          )}

          {/* Admin toggle if not in admin and user has admin privileges */}
          {!isAdmin && (profile?.role === 'admin' || profile?.role === 'superadmin') && (
            <button
              onClick={() => setActiveView('admin')}
              id="btn-nav-admin-header"
              className="flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-gray-500 transition hover:bg-white/30 hover:text-gray-900 border border-transparent hover:border-white/20"
              title="Painel Administrativo"
            >
              <ShieldCheck className="h-4.5 w-4.5" />
              <span className="hidden sm:inline">Painel</span>
            </button>
          )}

          {/* Cart Icon */}
          {activeView !== 'cart' && activeView !== 'checkout' && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveView('cart')}
              id="btn-header-cart"
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/50 border border-white/35 text-orange-600 transition hover:bg-white/80"
            >
              <ShoppingBag className="h-5.5 w-5.5" />
              {totalItems > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  key={totalItems}
                  className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white shadow-sm"
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
            className={`relative flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
              user 
                ? 'bg-orange-500/10 border-orange-500/30 text-orange-600 font-bold hover:bg-orange-500/15' 
                : 'bg-white/50 border-white/35 text-gray-500 hover:bg-white/80'
            }`}
            title={user ? `Minha Conta (${profile?.name || 'Cliente'})` : 'Entrar na Conta'}
          >
            {user ? (
              <span className="text-xs uppercase">{profile?.name?.charAt(0) || 'U'}</span>
            ) : (
              <User className="h-5.5 w-5.5" />
            )}
          </motion.button>
        </div>
      </div>
    </header>
  );
}
