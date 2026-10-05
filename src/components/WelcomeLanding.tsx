import React, { useState } from 'react';
import { Clock, ShieldCheck, ChefHat, MapPin, ArrowRight, Utensils, X, Phone, Instagram, Flame } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { motion, AnimatePresence } from 'motion/react';

interface WelcomeLandingProps {
  onEnterDelivery: () => void;
}

export default function WelcomeLanding({ onEnterDelivery }: WelcomeLandingProps) {
  const { settings } = useApp();
  const [showInfoModal, setShowInfoModal] = useState(false);

  const restaurantName = settings?.name || 'Maestria Grill';
  const restaurantDesc = settings?.description || 'O autêntico sabor da brasa com carnes nobres grelhadas com perfeição e paixão em servir.';
  const restaurantAddress = settings?.address || 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP';
  const deliveryTime = settings?.avgDeliveryTime || '25-45 min';
  const isMaintenance = settings?.maintenanceMode;
  const bannerImage = settings?.bannerUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1600&auto=format&fit=crop&q=80';

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden bg-gray-950 text-white select-none">
      {/* Background Hero Image with atmospheric overlays */}
      <div className="absolute inset-0 z-0">
        <img
          src={bannerImage}
          alt={restaurantName}
          className="h-full w-full object-cover object-center scale-105 filter brightness-[0.45] contrast-[1.15]"
          referrerPolicy="no-referrer"
        />
        {/* Warm amber/orange radial glow */}
        <div className="absolute inset-0 bg-radial from-orange-500/20 via-black/50 to-gray-950/95" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-black/60" />
      </div>

      {/* Top Bar Branding */}
      <header className="relative z-10 w-full px-6 pt-6 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3.5 py-1.5 border border-white/15">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
            {isMaintenance ? 'Fechado temporariamente' : 'Aberto agora'}
          </span>
        </div>

        <button
          onClick={() => setShowInfoModal(true)}
          className="text-xs font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 transition-all rounded-full px-3 py-1.5 backdrop-blur-md border border-white/10"
        >
          Sobre nós
        </button>
      </header>

      {/* Center Hero Content */}
      <main className="relative z-10 px-6 py-6 flex flex-col items-center text-center max-w-md mx-auto my-auto">
        {/* Emblem / Logo */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative mb-5 flex flex-col items-center"
        >
          {/* Glowing Aura */}
          <div className="absolute -inset-4 rounded-full bg-orange-500/30 blur-2xl pointer-events-none" />

          <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-b from-orange-500 to-orange-700 p-0.5 shadow-2xl shadow-orange-600/50 border border-orange-300/40">
            <div className="flex h-full w-full items-center justify-center rounded-[22px] bg-gradient-to-b from-gray-900 to-gray-950">
              {settings?.logoUrl && settings.logoUrl.length <= 4 ? (
                <span className="text-4xl filter drop-shadow">{settings.logoUrl}</span>
              ) : settings?.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={restaurantName}
                  className="h-14 w-14 object-contain rounded-xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Flame className="h-12 w-12 text-orange-400 filter drop-shadow" />
              )}
            </div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-serif text-3xl sm:text-4xl font-black tracking-widest text-white uppercase drop-shadow-md"
        >
          {restaurantName}
        </motion.h1>

        {/* Tagline / Subtitle */}
        <motion.p
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-2 text-sm sm:text-base font-medium text-orange-200/90 italic drop-shadow max-w-xs"
        >
          O verdadeiro sabor da boa comida!
        </motion.p>

        {/* Description snippet */}
        <motion.p
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-3 text-xs leading-relaxed text-gray-300/80 max-w-xs line-clamp-2"
        >
          {restaurantDesc}
        </motion.p>

        {/* 3 Pillars / Quality Badges */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-8 grid grid-cols-3 gap-3 w-full border-t border-b border-white/10 py-4"
        >
          <div className="flex flex-col items-center text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 mb-1.5">
              <Clock className="h-4.5 w-4.5" />
            </div>
            <span className="text-[10px] font-bold text-gray-200">Entrega rápida</span>
            <span className="text-[9px] text-gray-400">{deliveryTime}</span>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 mb-1.5">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <span className="text-[10px] font-bold text-gray-200">Compre seguro</span>
            <span className="text-[9px] text-gray-400">Pix & Cartão</span>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 mb-1.5">
              <ChefHat className="h-4.5 w-4.5" />
            </div>
            <span className="text-[10px] font-bold text-gray-200">Qualidade</span>
            <span className="text-[9px] text-gray-400">Carnes nobres</span>
          </div>
        </motion.div>
      </main>

      {/* Bottom Floating Info Card & CTA Button */}
      <footer className="relative z-10 w-full px-4 pb-24 pt-2 max-w-md mx-auto">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="rounded-3xl border border-white/15 bg-gray-900/80 backdrop-blur-xl p-4 shadow-2xl flex flex-col gap-3"
        >
          {/* Location Info */}
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <MapPin className="h-4.5 w-4.5" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="truncate text-xs font-semibold text-gray-200">
                {restaurantAddress}
              </p>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400 font-medium">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {isMaintenance ? 'Fechado' : 'Aberto agora'}
                </span>
                <span>•</span>
                <span>{deliveryTime}</span>
              </div>
            </div>
          </div>

          {/* Primary CTA Button */}
          <motion.button
            id="btn-ver-cardapio"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onEnterDelivery}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 py-4 px-6 text-sm font-extrabold text-white shadow-lg shadow-orange-600/40 hover:brightness-110 active:brightness-95 transition-all cursor-pointer"
          >
            <Utensils className="h-4.5 w-4.5 text-white" />
            <span>Ver Cardápio</span>
            <ArrowRight className="h-4.5 w-4.5 text-white/90" />
          </motion.button>

          {/* Secondary info link */}
          <button
            onClick={() => setShowInfoModal(true)}
            className="text-[11px] font-semibold text-gray-400 hover:text-orange-300 transition-colors py-1 cursor-pointer"
          >
            Conheça o {restaurantName} &rarr;
          </button>
        </motion.div>
      </footer>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm rounded-3xl bg-gray-900 border border-white/20 p-6 text-white shadow-2xl text-left"
            >
              <button
                onClick={() => setShowInfoModal(false)}
                className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-gray-400 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-600 text-2xl">
                  {settings?.logoUrl || '🥩'}
                </span>
                <div>
                  <h3 className="font-bold text-lg text-white">{restaurantName}</h3>
                  <p className="text-xs text-orange-400 font-semibold">Churrascaria & Delivery</p>
                </div>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed mb-4">
                {restaurantDesc}
              </p>

              <div className="flex flex-col gap-2.5 text-xs text-gray-300 border-t border-white/10 pt-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-orange-400 flex-shrink-0" />
                  <span>{restaurantAddress}</span>
                </div>
                {settings?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-orange-400 flex-shrink-0" />
                    <span>{settings.phone}</span>
                  </div>
                )}
                {settings?.instagram && (
                  <div className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-orange-400 flex-shrink-0" />
                    <span>{settings.instagram}</span>
                  </div>
                )}
                {settings?.horarioFuncionamento && (
                  <div className="flex items-center gap-2 text-[11px] text-gray-400">
                    <Clock className="h-4 w-4 text-orange-400 flex-shrink-0" />
                    <span>{settings.horarioFuncionamento}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setShowInfoModal(false);
                  onEnterDelivery();
                }}
                className="mt-6 w-full rounded-2xl bg-orange-600 py-3 text-xs font-bold text-white shadow-md shadow-orange-600/30 hover:bg-orange-700 transition"
              >
                Acessar Cardápio Agora
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
