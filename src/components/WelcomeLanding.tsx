import React, { useState } from 'react';
import { Clock, ShieldCheck, ChefHat, MapPin, ArrowRight, Utensils, X, Phone, Instagram } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { motion, AnimatePresence } from 'motion/react';

interface WelcomeLandingProps {
  onEnterDelivery: () => void;
}

export default function WelcomeLanding({ onEnterDelivery }: WelcomeLandingProps) {
  const { settings } = useApp();
  const [showInfoModal, setShowInfoModal] = useState(false);

  const restaurantName = (settings?.name || 'MAESTRIA GRILLE').toUpperCase();
  const restaurantDesc = settings?.description || 'O autêntico sabor da brasa com carnes nobres grelhadas com perfeição e paixão em servir.';
  const restaurantAddress = settings?.address || 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP';
  const deliveryTime = settings?.avgDeliveryTime || '25-45 min';
  const isMaintenance = settings?.maintenanceMode;
  const bannerImage = settings?.bannerUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1600&auto=format&fit=crop&q=80';

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col justify-between overflow-x-hidden bg-black text-white select-none">
      {/* Background Hero Image with cinematic dark vignette overlays */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src={bannerImage}
          alt={restaurantName}
          className="h-full w-full object-cover object-center scale-105 filter brightness-[0.38] contrast-[1.2] transition-transform duration-1000"
          referrerPolicy="no-referrer"
        />
        {/* Subtle warm ember glow at center */}
        <div className="absolute inset-0 bg-radial from-orange-600/20 via-black/60 to-black/90" />
        {/* Deep contrast gradient: darker at top and bottom for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/40 to-black/95" />
      </div>

      {/* Top Bar Branding */}
      <header className="relative z-10 w-full px-5 pt-5 sm:pt-7 max-w-lg mx-auto flex items-center justify-between">
        {/* Status Pill: Aberto Agora */}
        <div className="inline-flex items-center gap-2 rounded-full bg-black/50 backdrop-blur-md px-3.5 py-1.5 border border-white/10 shadow-lg">
          <span className={`flex h-2 w-2 rounded-full ${isMaintenance ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
          <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${isMaintenance ? 'text-amber-300' : 'text-emerald-300'}`}>
            {isMaintenance ? 'Fechado temporariamente' : 'Aberto agora'}
          </span>
        </div>

        {/* Sobre Nós Button */}
        <button
          onClick={() => setShowInfoModal(true)}
          className="text-[11px] sm:text-xs font-semibold text-white/90 hover:text-white bg-white/[0.08] hover:bg-white/[0.18] transition-all rounded-full px-3.5 py-1.5 backdrop-blur-md border border-white/15 cursor-pointer shadow-sm"
        >
          Sobre nós
        </button>
      </header>

      {/* Center Hero Content (Purely Typographic & Architectural - No rounded icon boxes) */}
      <main className="relative z-10 px-6 py-6 my-auto flex flex-col items-center text-center max-w-md mx-auto w-full">
        {/* Sub-label or establishment category */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 mb-3"
        >
          <span className="h-[1px] w-6 bg-orange-400/60" />
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.25em] text-orange-300/90">
            Churrascaria & Parrilla Premium
          </span>
          <span className="h-[1px] w-6 bg-orange-400/60" />
        </motion.div>

        {/* Primary Restaurant Name */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="font-serif text-3xl sm:text-5xl font-black tracking-[0.16em] sm:tracking-[0.2em] text-white uppercase drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] leading-tight"
        >
          {restaurantName}
        </motion.h1>

        {/* Slogan */}
        <motion.p
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-2.5 text-base sm:text-lg font-serif italic text-amber-300 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] tracking-wide"
        >
          &ldquo;O verdadeiro sabor da boa comida!&rdquo;
        </motion.p>

        {/* Description */}
        <motion.p
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.22 }}
          className="mt-3.5 text-xs sm:text-[13px] leading-relaxed text-gray-300/90 max-w-xs drop-shadow"
        >
          {restaurantDesc}
        </motion.p>

        {/* The 3 Pillars / Quality Highlights (Clean glass strip) */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-7 w-full rounded-2xl bg-black/45 backdrop-blur-md border border-white/10 p-3 sm:p-3.5 shadow-xl grid grid-cols-3 divide-x divide-white/10"
        >
          {/* Entrega rápida */}
          <div className="flex flex-col items-center text-center px-1">
            <Clock className="h-4 w-4 text-orange-400 mb-1" />
            <span className="text-[10px] sm:text-[11px] font-bold text-gray-100 tracking-tight">Entrega rápida</span>
            <span className="text-[9px] sm:text-[10px] text-orange-200/80 font-medium mt-0.5">{deliveryTime}</span>
          </div>

          {/* Compre seguro */}
          <div className="flex flex-col items-center text-center px-1">
            <ShieldCheck className="h-4 w-4 text-orange-400 mb-1" />
            <span className="text-[10px] sm:text-[11px] font-bold text-gray-100 tracking-tight">Compre seguro</span>
            <span className="text-[9px] sm:text-[10px] text-orange-200/80 font-medium mt-0.5">Pix &amp; Cartão</span>
          </div>

          {/* Qualidade */}
          <div className="flex flex-col items-center text-center px-1">
            <ChefHat className="h-4 w-4 text-orange-400 mb-1" />
            <span className="text-[10px] sm:text-[11px] font-bold text-gray-100 tracking-tight">Qualidade</span>
            <span className="text-[9px] sm:text-[10px] text-orange-200/80 font-medium mt-0.5">Carnes nobres</span>
          </div>
        </motion.div>
      </main>

      {/* Bottom Floating Info Card & CTA Button */}
      <footer className="relative z-10 w-full px-5 pb-6 sm:pb-8 pt-2 max-w-md mx-auto">
        <motion.div
          initial={{ y: 25, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="rounded-3xl border border-white/10 bg-black/65 backdrop-blur-xl p-4 shadow-2xl flex flex-col gap-3.5"
        >
          {/* Location & Status Info */}
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/25">
              <MapPin className="h-4.5 w-4.5" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="truncate text-xs font-semibold text-gray-200">
                {restaurantAddress}
              </p>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400 font-medium">
                <span className={`flex items-center gap-1 font-semibold ${isMaintenance ? 'text-amber-400' : 'text-emerald-400'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isMaintenance ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  {isMaintenance ? 'Fechado temporariamente' : 'Aberto agora'}
                </span>
                <span>•</span>
                <span>{deliveryTime}</span>
              </div>
            </div>
          </div>

          {/* Primary CTA Button: Ver Cardápio */}
          <motion.button
            id="btn-ver-cardapio"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onEnterDelivery}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 py-3.5 sm:py-4 px-6 text-sm font-extrabold text-white shadow-lg shadow-orange-600/30 hover:shadow-orange-600/40 transition-all cursor-pointer tracking-wide"
          >
            <Utensils className="h-4 w-4 text-white" />
            <span>Ver Cardápio</span>
            <ArrowRight className="h-4 w-4 text-white/90" />
          </motion.button>
        </motion.div>
      </footer>

      {/* Info Modal: Sobre Nós */}
      <AnimatePresence>
        {showInfoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="relative w-full max-w-sm rounded-3xl bg-gray-950 border border-white/15 p-6 text-white shadow-2xl text-left"
            >
              <button
                onClick={() => setShowInfoModal(false)}
                className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/20 border border-orange-500/30 text-orange-400">
                  <Utensils className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white font-serif tracking-wide">{restaurantName}</h3>
                  <p className="text-xs text-orange-400 font-semibold">Churrascaria &amp; Parrilla Premium</p>
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
                className="mt-6 w-full rounded-2xl bg-orange-600 hover:bg-orange-700 py-3 text-xs font-bold text-white shadow-md shadow-orange-600/30 transition cursor-pointer"
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
