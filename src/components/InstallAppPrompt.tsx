import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Smartphone, X, Star, Share, PlusSquare, CheckCircle, Zap } from 'lucide-react';
import appIconImg from '../assets/images/app_install_icon_1785057789357.jpg';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed as PWA / WebApp)
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (navigator as any).standalone === true;
      return isStandaloneMedia || isIOSStandalone;
    };

    if (checkStandalone()) {
      setIsStandalone(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);

    // Check if user dismissed recently
    const dismissedTimestamp = localStorage.getItem('maestria_app_install_dismissed');
    if (dismissedTimestamp) {
      const hoursSinceDismiss = (Date.now() - parseInt(dismissedTimestamp, 10)) / (1000 * 60 * 60);
      if (hoursSinceDismiss < 24) {
        // Hide banner if dismissed in last 24 hours
        return;
      }
    }

    // Listen for beforeinstallprompt event (Android / Chromium)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If on iOS or if prompt hasn't fired after 2.5s, show friendly install prompt
    const timer = setTimeout(() => {
      if (!checkStandalone()) {
        setIsVisible(true);
      }
    }, 2500);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Trigger browser native install prompt
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setIsVisible(false);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error('Erro ao chamar prompt de instalação:', err);
      }
    } else if (isIOS) {
      // Show iOS step-by-step modal
      setShowIosModal(true);
    } else {
      // Fallback for browsers that don't support beforeinstallprompt directly
      setShowIosModal(true);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('maestria_app_install_dismissed', Date.now().toString());
  };

  if (isStandalone || isInstalled) return null;

  return (
    <>
      {/* Floating Bottom App Install Notification Banner */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-40 bg-gray-900/95 backdrop-blur-xl border border-amber-500/30 text-white rounded-2xl p-4 shadow-2xl shadow-black/50 overflow-hidden"
          >
            {/* Background ambient lighting */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-red-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative flex items-center justify-between gap-3">
              {/* Left App Icon & Badge */}
              <div className="relative flex-shrink-0">
                <img
                  src={appIconImg}
                  alt="Maestria Grill App Icon"
                  className="w-14 h-14 rounded-2xl object-cover shadow-lg border border-amber-500/40 ring-2 ring-black/40"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-500 to-orange-600 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow">
                  APP
                </span>
              </div>

              {/* Middle Info */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                    Instalação Rápida
                  </span>
                  <div className="flex items-center text-amber-400 text-[10px] font-semibold">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400 mr-0.5" />
                    4.9
                  </div>
                </div>

                <h4 className="text-sm font-black text-white truncate tracking-tight">
                  Instalar App Maestria Grill
                </h4>
                <p className="text-[11px] text-gray-300 line-clamp-1 leading-snug">
                  Acesso instantâneo, pedidos mais rápidos & descontos!
                </p>
              </div>

              {/* Dismiss Button */}
              <button
                onClick={handleDismiss}
                className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition flex-shrink-0"
                title="Fechar notificação"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action buttons */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 transition active:scale-[0.98]"
              >
                <Download className="w-4 h-4 animate-bounce" />
                <span>Instalar no Celular</span>
              </button>

              <button
                onClick={handleDismiss}
                className="px-3 py-2.5 text-gray-400 hover:text-white text-xs font-semibold rounded-xl hover:bg-white/5 transition"
              >
                Depois
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS & Browser Instructions Modal */}
      <AnimatePresence>
        {showIosModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-gray-900 border border-amber-500/30 text-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden"
            >
              {/* Top Accent */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />

              <button
                onClick={() => setShowIosModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-5">
                <div className="relative inline-block mb-3">
                  <img
                    src={appIconImg}
                    alt="App Icon"
                    className="w-20 h-20 rounded-2xl mx-auto shadow-xl border-2 border-amber-500/40"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-amber-500 text-black p-1.5 rounded-full shadow-lg">
                    <Smartphone className="w-4 h-4" />
                  </div>
                </div>

                <h3 className="text-lg font-black text-white tracking-tight">
                  Como Instalar no Celular
                </h3>
                <p className="text-xs text-gray-300 mt-1">
                  Adicione o Maestria Grill à sua tela inicial sem precisar ocupar memória da loja de apps!
                </p>
              </div>

              {/* Instructions steps */}
              <div className="space-y-3 bg-white/5 rounded-2xl p-4 border border-white/10 text-xs">
                {isIOS ? (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="bg-amber-500/20 text-amber-400 p-2 rounded-xl flex-shrink-0">
                        <Share className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-white">1. Toque em Compartilhar</p>
                        <p className="text-gray-400 text-[11px]">
                          No rodapé do seu navegador Safari, toque no ícone de compartilhamento.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-amber-500/20 text-amber-400 p-2 rounded-xl flex-shrink-0">
                        <PlusSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-white">2. Adicionar à Tela de Início</p>
                        <p className="text-gray-400 text-[11px]">
                          Role as opções para baixo e selecione "Adicionar à Tela de Início".
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="bg-amber-500/20 text-amber-400 p-2 rounded-xl flex-shrink-0">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-white">1. Abra o Menu do Navegador</p>
                        <p className="text-gray-400 text-[11px]">
                          Toque nos 3 pontinhos (⋮) no canto superior do seu navegador.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-amber-500/20 text-amber-400 p-2 rounded-xl flex-shrink-0">
                        <PlusSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-white">2. Instalar aplicativo / Adicionar à Tela Inicial</p>
                        <p className="text-gray-400 text-[11px]">
                          Selecione "Instalar aplicativo" ou "Adicionar à Tela Inicial".
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex items-start gap-3 border-t border-white/10 pt-2.5">
                  <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-xl flex-shrink-0">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-white">3. Pronto!</p>
                    <p className="text-gray-400 text-[11px]">
                      O ícone do Maestria Grill aparecerá no seu celular como um app nativo.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIosModal(false)}
                className="w-full mt-5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-extrabold text-xs py-3 px-4 rounded-xl shadow-lg transition active:scale-[0.98]"
              >
                Entendi, vou instalar!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
