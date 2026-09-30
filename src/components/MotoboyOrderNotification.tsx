import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { Order } from '../types';
import { formatPrice } from '../utils';
import { Bike, MapPin, Clock, ArrowRight, X, Bell, User, Phone, DollarSign, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function MotoboyOrderNotification() {
  const { user, profile, updateProfile } = useAuth();
  const { orders, updateOrder, setActiveView } = useApp();
  
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

  // Format delivery address
  const addr = activeNotificationOrder.deliveryAddress;
  const addressString = addr
    ? `${addr.street || ''}, ${addr.number || ''}${addr.neighborhood ? ` - ${addr.neighborhood}` : ''}${addr.city ? ` (${addr.city})` : ''}`
    : activeNotificationOrder.endereco
    ? `${activeNotificationOrder.endereco.rua || ''}, ${activeNotificationOrder.endereco.numero || ''} - ${activeNotificationOrder.endereco.bairro || ''}`
    : 'Endereço a confirmar';

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

      // 2. Assign motoboy and mark delivery status as 'aceito'
      await updateOrder(activeNotificationOrder.id, {
        motoboyId: user.uid,
        statusEntrega: 'aceito'
      });

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
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl border border-orange-100 overflow-hidden"
        >
          {/* Top Decorative Alert Ribbon */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500" />

          {/* Header Row */}
          <div className="flex items-start justify-between gap-3 mb-4 pt-1">
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/30 animate-pulse">
                <Bell className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <span className="inline-block rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-orange-700">
                  🔔 Pedido Pronto!
                </span>
                <h3 className="text-base font-black text-gray-900 mt-0.5">
                  Pedido #{activeNotificationOrder.id}
                </h3>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              title="Fechar Notificação"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Details Box */}
          <div className="space-y-3 bg-gray-50/80 rounded-2xl p-3.5 border border-gray-100 text-xs">
            {/* Customer Info */}
            <div className="flex items-center justify-between border-b border-gray-200/60 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-orange-100 p-1.5 text-orange-600">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Cliente</span>
                  <span className="font-bold text-gray-800 text-sm">{activeNotificationOrder.customerName}</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                🔒 Contato liberado após aceitar
              </span>
            </div>

            {/* Address */}
            <div className="flex items-start gap-2.5">
              <div className="rounded-xl bg-blue-100 p-1.5 text-blue-600 shrink-0 mt-0.5">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Endereço de Entrega</span>
                <span className="font-semibold text-gray-800 leading-snug block mt-0.5">
                  {addressString}
                </span>
                {addr?.complement && (
                  <span className="text-[11px] text-gray-500 block mt-0.5">
                    Comp: {addr.complement}
                  </span>
                )}
              </div>
            </div>

            {/* Total and Payment Method */}
            <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Valor Total</span>
                  <span className="font-black text-gray-900 text-sm">
                    {formatPrice(activeNotificationOrder.valorTotal || activeNotificationOrder.total)}
                  </span>
                </div>
              </div>

              <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-700 uppercase">
                {activeNotificationOrder.paymentMethod || activeNotificationOrder.formaPagamento || 'Pix'}
              </span>
            </div>

            {/* Items Summary */}
            {activeNotificationOrder.items && activeNotificationOrder.items.length > 0 && (
              <div className="border-t border-gray-200/60 pt-2 text-[11px]">
                <span className="font-bold text-gray-500 uppercase block mb-1">Itens do Pedido:</span>
                <p className="text-gray-700 font-medium truncate">
                  {activeNotificationOrder.items.map(i => `${i.quantity || 1}x ${i.name}`).join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex items-center gap-2.5">
            <button
              onClick={handleDismiss}
              className="flex-1 rounded-2xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-600 hover:bg-gray-50 transition active:scale-95"
            >
              Ignorar
            </button>

            <button
              onClick={handleAcceptDelivery}
              disabled={isAccepting}
              className="flex-[2] rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 px-4 text-xs font-extrabold text-white shadow-lg shadow-emerald-600/25 hover:from-emerald-700 hover:to-teal-700 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Bike className="h-4 w-4" />
              <span>{isAccepting ? 'Aceitando...' : 'Aceitar Entrega'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
