import React from 'react';
import { BookOpen, MapPin, Clock, ShieldCheck, Heart, Sparkles, ShoppingBag } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import PromoBanner from '../components/PromoBanner';
import { motion } from 'motion/react';

export default function Home() {
  const { settings, setActiveView, orders } = useApp();
  const { user, profile } = useAuth();

  const myOrdersCount = user 
    ? orders.filter(o => o.usuario?.uid === user.uid).length 
    : 0;

  return (
    <div className="flex flex-col min-h-screen bg-transparent pb-24">
      {/* Banner Area */}
      <div className="relative h-60 w-full overflow-hidden bg-gray-900 md:h-72">
        <img
          src={settings?.bannerUrl || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600'}
          alt="Restaurant Banner"
          className="h-full w-full object-cover opacity-80"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--site-bg-color,#fff7f4)] via-[var(--site-bg-color,#fff7f4)]/30 to-transparent"></div>
        
        {/* Quick floating specs */}
        <div className="absolute top-4 right-4 flex gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
            <Sparkles className="h-3 w-3 text-amber-400" />
            MVP Fase 1
          </span>
        </div>
      </div>

      {/* Restaurant Meta (Negative Margin overlap) */}
      <div className="mx-auto -mt-16 w-full max-w-lg px-4 z-10">
        <div className="rounded-3xl border border-white/40 bg-white/40 p-5 shadow-xl backdrop-blur-md">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 border border-orange-500/15 px-2.5 py-0.5 text-xs font-semibold text-orange-600">
                {settings?.logoUrl || '🍔'} {settings?.name ? 'Restaurante Oficial' : ''}
              </span>
              <h2 className="mt-2 font-sans text-2xl font-extrabold text-gray-900 leading-tight">
                {settings?.name || 'Gourmet Bistro'}
              </h2>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-2xl shadow-lg shadow-orange-500/25">
              {settings?.logoUrl || '🍔'}
            </span>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-gray-500">
            {settings?.description || 'O melhor da culinária artesanal diretamente na sua mesa, feito com ingredientes frescos e amor.'}
          </p>

          <hr className="my-4 border-white/20" />

          {/* Logistics specs */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center rounded-2xl bg-white/45 border border-white/25 p-2.5 text-center">
              <Clock className="h-4.5 w-4.5 text-orange-500" />
              <span className="mt-1 text-[10px] font-semibold text-gray-400">Tempo</span>
              <span className="text-xs font-bold text-gray-800">25-45 min</span>
            </div>
            <div className="flex flex-col items-center rounded-2xl bg-white/45 border border-white/25 p-2.5 text-center">
              <MapPin className="h-4.5 w-4.5 text-orange-500" />
              <span className="mt-1 text-[10px] font-semibold text-gray-400">Entrega</span>
              <span className="text-xs font-bold text-gray-800">
                {settings?.deliveryFee === undefined ? 'R$ 0.00' : settings.deliveryFee === 0 ? 'Grátis' : `R$ ${settings.deliveryFee.toFixed(2)}`}
              </span>
            </div>
            <div className="flex flex-col items-center rounded-2xl bg-white/45 border border-white/25 p-2.5 text-center">
              <Heart className="h-4.5 w-4.5 text-rose-500" />
              <span className="mt-1 text-[10px] font-semibold text-gray-400">Avaliação</span>
              <span className="text-xs font-bold text-gray-800">4.9 ★★★★★</span>
            </div>
          </div>

          <div className="mt-4.5 flex items-center gap-2 rounded-xl bg-orange-500/10 border border-orange-500/15 px-3 py-2 text-[10px] font-medium text-orange-800">
            <MapPin className="h-4 w-4 text-orange-600 flex-shrink-0" />
            <span className="truncate">{settings?.address || 'Carregando endereço...'}</span>
          </div>
        </div>

        {/* VER CARDÁPIO & MEUS PEDIDOS BUTTON */}
        <div className="mt-8 flex flex-col gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveView('menu')}
            id="btn-ver-cardapio"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 py-4 text-sm font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-700 transition"
          >
            <BookOpen className="h-4.5 w-4.5" />
            Ver Cardápio Completo
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveView('my-orders')}
            id="btn-meus-pedidos"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/60 border border-white/40 py-3.5 text-xs font-bold text-gray-800 hover:bg-white/80 transition"
          >
            <ShoppingBag className="h-4 w-4 text-orange-500" />
            Acompanhar Meus Pedidos
            {myOrdersCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-extrabold text-white px-1">
                {myOrdersCount}
              </span>
            )}
          </motion.button>
        </div>

        {/* Dynamic promotional banner */}
        <PromoBanner className="mt-6" />

        {/* Quick Admin Access Hint */}
        {(profile?.role === 'admin' || profile?.role === 'superadmin') && (
          <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/40 bg-white/20 backdrop-blur-sm p-4 text-center">
            <ShieldCheck className="h-6 w-6 text-gray-400" />
            <h4 className="mt-1.5 text-xs font-bold text-gray-700">Área de Demonstração / Testes</h4>
            <p className="mt-0.5 text-[10px] text-gray-500 max-w-[280px]">
              Como este é um MVP completo, você pode simular compras no Cardápio e gerenciar os pedidos no painel administrativo ao mesmo tempo!
            </p>
            <button
              onClick={() => setActiveView('admin')}
              id="btn-quick-admin"
              className="mt-3 text-xs font-semibold text-orange-600 hover:text-orange-700 transition"
            >
              Acessar Painel Admin &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
