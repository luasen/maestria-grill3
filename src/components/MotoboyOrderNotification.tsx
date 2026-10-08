import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { Order } from '../types';
import { formatPrice } from '../utils';
import { Bike, MapPin, ArrowRight, X, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function MotoboyOrderNotification() {
  const { user, profile, updateProfile } = useAuth();
  const { orders, updateOrder, setActiveView, settings } = useApp();
  
  const [dismissedOrderIds, setDismissedOrderIds] = useState<string[]>([]);
  const [activeNotificationOrder, setActiveNotificationOrder] = useState<Order | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  // Check if user has motoboy privileges
  const isMotoboyOrAdmin = user && (profile?.role === 'motoboy' || profile?.role === 'admin' || profile?.role === 'superadmin');

  // Filter available ready delivery orders
  const availableOrders = orders.filter(
    (order) => 
      order.tipoPedido === 'entrega' && 
      !order.motoboyId && 
      !order.statusEntrega &&
      order.status === 'ready' && 
      order.status !== 'refused'
  );

  // Sound chime synthesizer
  const playChimeSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + startTime);
        osc.stop(ctx.currentTime + startTime + duration);
      };

      // Play double bell chime (D5 -> A5)
      playTone(587.33, 0, 0.25);
      playTone(880, 0.15, 0.4);

      if (navigator.vibrate) {
        navigator.vibrate([250, 100, 250]);
      }
    } catch (e) {
      console.log('Notification chime prevented or unsupported', e);
    }
  };

  useEffect(() => {
    if (!isMotoboyOrAdmin || availableOrders.length === 0) {
      setActiveNotificationOrder(null);
      return;
    }

    // Find the first available order that hasn't been dismissed yet
    const nextOrderToNotify = availableOrders.find(
      (order) => !dismissedOrderIds.includes(order.id)
    );

    if (nextOrderToNotify && (!activeNotificationOrder || activeNotificationOrder.id !== nextOrderToNotify.id)) {
      setActiveNotificationOrder(nextOrderToNotify);
      playChimeSound();
    } else if (!nextOrderToNotify) {
      setActiveNotificationOrder(null);
    }
  }, [availableOrders, dismissedOrderIds, isMotoboyOrAdmin]);

  if (!isMotoboyOrAdmin || !activeNotificationOrder) {
    return null;
  }

  // Format delivery address with high visual legibility
  const addr = activeNotificationOrder.deliveryAddress;
  const rawEnd: any = activeNotificationOrder.endereco;
  const rawAddr = activeNotificationOrder.address;

  let streetAndNumber = '';
  let neighborhoodAndCity = '';
  let complementOrRef = '';

  if (addr) {
    streetAndNumber = [addr.street, addr.number ? `nº ${addr.number}` : ''].filter(Boolean).join(', ');
    neighborhoodAndCity = [addr.neighborhood, addr.city ? `(${addr.city})` : ''].filter(Boolean).join(' - ');
    complementOrRef = [addr.complement ? `Comp: ${addr.complement}` : '', addr.reference ? `Ref: ${addr.reference}` : ''].filter(Boolean).join(' | ');
  } else if (typeof rawEnd === 'object' && rawEnd !== null) {
    const rua = rawEnd.street || rawEnd.rua || '';
    const num = rawEnd.number || rawEnd.numero || '';
    const bairro = rawEnd.neighborhood || rawEnd.bairro || '';
    const cidade = rawEnd.city || rawEnd.cidade || '';
    const comp = rawEnd.complement || rawEnd.complemento || '';
    const ref = rawEnd.reference || rawEnd.referencia || '';

    streetAndNumber = [rua, num ? `nº ${num}` : ''].filter(Boolean).join(', ');
    neighborhoodAndCity = [bairro, cidade ? `(${cidade})` : ''].filter(Boolean).join(' - ');
    complementOrRef = [comp ? `Comp: ${comp}` : '', ref ? `Ref: ${ref}` : ''].filter(Boolean).join(' | ');
  } else if (typeof rawEnd === 'string' && rawEnd.trim()) {
    streetAndNumber = rawEnd.trim();
  } else if (typeof rawAddr === 'string' && rawAddr.trim()) {
    streetAndNumber = rawAddr.trim();
  }

  if (!streetAndNumber) {
    streetAndNumber = 'Endereço a confirmar';
  }

  const handleDismiss = () => {
    if (activeNotificationOrder) {
      setDismissedOrderIds((prev) => [...prev, activeNotificationOrder.id]);
      setActiveNotificationOrder(null);
    }
  };

  const handleAcceptDelivery = async () => {
    if (!activeNotificationOrder || !user) return;

    // Check if another motoboy accepted it first
    const currentOrder = orders.find(o => o.id === activeNotificationOrder.id);
    if (currentOrder?.motoboyId && currentOrder.motoboyId !== user.uid) {
      alert('Aviso: Este pedido já foi aceito por outro motoboy!');
      setActiveNotificationOrder(null);
      return;
    }

    setIsAccepting(true);
    try {
      // 1. If motoboy is offline, set online automatically
      if (!profile?.online) {
        await updateProfile({ online: true, ultimaAtualizacao: new Date().toISOString() });
      }

      // 2. Assign motoboy and mark delivery status as 'aceito' with frozen motoboyDeliveryFee
      const hasExistingFee = typeof activeNotificationOrder.motoboyDeliveryFee === 'number' && !isNaN(activeNotificationOrder.motoboyDeliveryFee) && activeNotificationOrder.motoboyDeliveryFee >= 0;
      const motoboyFee = hasExistingFee
        ? activeNotificationOrder.motoboyDeliveryFee
        : (typeof settings?.motoboyDeliveryFee === 'number' && !isNaN(settings.motoboyDeliveryFee) && settings.motoboyDeliveryFee >= 0 ? settings.motoboyDeliveryFee : undefined);

      const orderUpdates: Partial<Order> = {
        motoboyId: user.uid,
        statusEntrega: 'aceito'
      };
      if (motoboyFee !== undefined) {
        orderUpdates.motoboyDeliveryFee = motoboyFee;
      }
      await updateOrder(activeNotificationOrder.id, orderUpdates);

      // 3. Switch to Motoboy view
      setActiveView('motoboy');
      setActiveNotificationOrder(null);
    } catch (error) {
      console.error('Error accepting delivery from notification modal:', error);
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-orange-100/80 overflow-hidden"
        >
          {/* Top Decorative Alert Ribbon */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500" />

          {/* Header Row: Clean, compact notification badge & Order Number */}
          <div className="flex items-start justify-between gap-3 mb-4 pt-1">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-md shadow-orange-500/30">
                <Bell className="h-5 w-5 animate-bounce" />
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-orange-700">
                    🔔 PEDIDO PRONTO!
                  </span>
                  {(typeof activeNotificationOrder.motoboyDeliveryFee === 'number' && !isNaN(activeNotificationOrder.motoboyDeliveryFee) && activeNotificationOrder.motoboyDeliveryFee >= 0) ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                      Ganho: {formatPrice(activeNotificationOrder.motoboyDeliveryFee)}
                    </span>
                  ) : (typeof settings?.motoboyDeliveryFee === 'number' && !isNaN(settings.motoboyDeliveryFee) && settings.motoboyDeliveryFee >= 0) ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                      Ganho: {formatPrice(settings.motoboyDeliveryFee)}
                    </span>
                  ) : null}
                </div>
                <h3 className="text-lg font-black text-gray-900 leading-tight mt-0.5">
                  Pedido #{activeNotificationOrder.id}
                </h3>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              title="Fechar Notificação"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Delivery Address Box - Highly Readable & Focused */}
          <div className="rounded-2xl bg-orange-50/70 border border-orange-200/80 p-3.5 text-xs shadow-xs">
            <div className="flex items-start gap-2.5">
              <div className="rounded-xl bg-orange-500 p-2 text-white shrink-0 mt-0.5 shadow-xs shadow-orange-500/20">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-800 block mb-0.5">
                  📍 Endereço de Entrega
                </span>
                <p className="text-sm font-extrabold text-gray-900 leading-snug break-words">
                  {streetAndNumber}
                </p>
                {neighborhoodAndCity && (
                  <p className="text-xs font-semibold text-gray-700 mt-1 break-words">
                    {neighborhoodAndCity}
                  </p>
                )}
                {complementOrRef && (
                  <p className="text-[11px] font-medium text-gray-600 mt-1.5 bg-white/90 rounded-lg px-2.5 py-1 border border-orange-200/50 inline-block break-words">
                    {complementOrRef}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons: Ignorar & 🛵 Aceitar Entrega → */}
          <div className="mt-4 flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 py-3 text-xs font-bold text-gray-600 hover:bg-gray-100 transition active:scale-95 cursor-pointer"
            >
              Ignorar
            </button>

            <button
              type="button"
              onClick={handleAcceptDelivery}
              disabled={isAccepting}
              className="flex-[2] rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 px-3 text-xs font-black text-white shadow-lg shadow-emerald-600/25 hover:from-emerald-700 hover:to-teal-700 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Bike className="h-4 w-4" />
              <span>{isAccepting ? 'Aceitando...' : '🛵 Aceitar Entrega →'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
