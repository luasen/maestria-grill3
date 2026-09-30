import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { formatPrice } from '../utils';
import { 
  Bike, 
  MapPin, 
  Phone, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  User, 
  Power, 
  ShoppingBag, 
  History, 
  ChevronRight, 
  Navigation, 
  Award, 
  AlertCircle,
  Sparkles,
  ArrowRight,
  ClipboardList,
  MessageSquare,
  PackageCheck,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import OrderChatModal from '../components/OrderChatModal';
import ChatButtonWithBadge from '../components/ChatButtonWithBadge';
import { ConfirmationModal } from '../components/ConfirmationModal';

export default function Motoboy() {
  const { user, profile, updateProfile, setIsAuthOpen } = useAuth();
  const { orders, updateOrder } = useApp();
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'history'>('available');
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedChatOrder, setSelectedChatOrder] = useState<any | null>(null);

  // Modal de Confirmação para Ações do Motoboy
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    orderId: string;
    actionType: 'accept' | 'pickup' | 'start_delivery' | 'complete_delivery';
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'orange' | 'blue' | 'amber' | 'emerald';
  } | null>(null);

  // 1. Authorization Check
  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center bg-gray-50/50">
        <div className="rounded-full bg-orange-100 p-4 mb-4 text-orange-600">
          <Bike className="h-10 w-10 animate-bounce" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Área do Entregador</h2>
        <p className="text-sm text-gray-500 max-w-xs mb-6">
          Por favor, faça login ou crie uma conta para acessar a área de entregas.
        </p>
        <button
          onClick={() => setIsAuthOpen(true)}
          className="rounded-2xl bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/20 hover:bg-orange-700 transition"
        >
          Entrar ou Cadastrar
        </button>
      </div>
    );
  }

  if (profile?.role !== 'motoboy' && profile?.role !== 'superadmin' && profile?.role !== 'admin') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center bg-gray-50/50">
        <div className="rounded-full bg-red-100 p-4 mb-4 text-red-600">
          <AlertCircle className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Acesso não autorizado.</h2>
        <p className="text-sm text-gray-500 max-w-xs mb-6">
          Seu perfil atual ({profile?.role || 'cliente'}) não possui permissão para acessar a Área do Motoboy.
        </p>
      </div>
    );
  }

  // 2. Data Filtering for Motoboy

  // Available orders: tipoPedido === 'entrega', no motoboy assigned, no statusEntrega set, status is strictly 'ready' (Pronto)
  const availableOrders = orders.filter(
    (order) => 
      order.tipoPedido === 'entrega' && 
      !order.motoboyId && 
      !order.statusEntrega &&
      order.status === 'ready' &&
      order.status !== 'refused'
  );

  // Active orders assigned STRICTLY to this motoboy who accepted it first, strictly ready or delivered, not yet completed/refused
  const activeOrders = orders.filter(
    (order) => 
      order.tipoPedido === 'entrega' && 
      order.motoboyId === user.uid && 
      (order.status === 'ready' || order.status === 'delivered') &&
      order.statusEntrega !== 'entregue' && 
      order.status !== 'delivered' &&
      order.status !== 'refused'
  );

  // Completed order history STRICTLY for this motoboy
  const completedOrders = orders.filter(
    (order) => 
      order.tipoPedido === 'entrega' &&
      order.motoboyId === user.uid && 
      (order.statusEntrega === 'entregue' || order.status === 'delivered') &&
      order.status !== 'refused'
  );

  // Toggle online status
  const handleToggleOnline = async () => {
    setIsUpdating(true);
    try {
      await updateProfile({
        online: !profile.online,
        ultimaAtualizacao: new Date().toISOString()
      });
    } catch (e) {
      console.error('Error toggling online status:', e);
    } finally {
      setIsUpdating(false);
    }
  };

  // Execute Confirmed Motoboy Action
  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    setIsUpdating(true);
    const { orderId, actionType } = confirmModal;
    try {
      if (actionType === 'accept') {
        // Concurrency check: Ensure no other motoboy accepted it first
        const currentOrder = orders.find(o => o.id === orderId);
        if (currentOrder?.motoboyId && currentOrder.motoboyId !== user.uid) {
          alert('Este pedido já foi aceito por outro motoboy!');
          setConfirmModal(null);
          setIsUpdating(false);
          return;
        }

        if (!profile.online) {
          await updateProfile({ online: true, ultimaAtualizacao: new Date().toISOString() });
        }
        await updateOrder(orderId, {
          motoboyId: user.uid,
          statusEntrega: 'aceito'
        });
        setActiveTab('active');
      } else if (actionType === 'pickup') {
        await updateOrder(orderId, {
          statusEntrega: 'retirado'
        });
      } else if (actionType === 'start_delivery') {
        await updateOrder(orderId, {
          statusEntrega: 'a_caminho'
        });
      } else if (actionType === 'complete_delivery') {
        await updateOrder(orderId, {
          status: 'delivered',
          statusEntrega: 'entregue',
          horarioEntrega: new Date().toISOString()
        });
        setActiveTab('history');
      }
    } catch (e) {
      console.error('Error executing motoboy status change:', e);
    } finally {
      setIsUpdating(false);
      setConfirmModal(null);
    }
  };

  return (
    <div className="flex-1 bg-gray-50/50 pb-24">
      {/* Header Profile Dashboard */}
      <div className="bg-white border-b border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-100 text-orange-600 font-bold text-lg shadow-inner">
                {profile.name ? profile.name.charAt(0).toUpperCase() : <User className="h-6 w-6" />}
              </div>
              <span className={`absolute bottom-0 right-0 block h-4 w-4 rounded-full border-2 border-white ring-1 ring-black/5 ${profile.online ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-sans text-sm font-bold text-gray-800 leading-tight">
                  {profile.name}
                </h2>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-orange-100 text-orange-700 uppercase tracking-wide">
                  <Award className="h-3 w-3" /> Motoboy
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">{profile.phone || 'Sem telefone cadastrado'}</p>
            </div>
          </div>

          <button
            onClick={handleToggleOnline}
            disabled={isUpdating}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border ${
              profile.online 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            <span>{profile.online ? 'Online' : 'Offline'}</span>
          </button>
        </div>

        {/* Motoboy Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4 border-t border-gray-100 pt-4">
          <div className="bg-orange-50/50 rounded-2xl p-2.5 text-center border border-orange-500/5">
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Disponíveis</span>
            <span className="text-base font-extrabold text-orange-600 mt-0.5 block">{availableOrders.length}</span>
          </div>
          <div className="bg-blue-50/50 rounded-2xl p-2.5 text-center border border-blue-500/5">
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ativos</span>
            <span className="text-base font-extrabold text-blue-600 mt-0.5 block">{activeOrders.length}</span>
          </div>
          <div className="bg-emerald-50/50 rounded-2xl p-2.5 text-center border border-emerald-500/5">
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Entregues</span>
            <span className="text-base font-extrabold text-emerald-600 mt-0.5 block">{completedOrders.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-100 bg-white sticky top-16 z-10 px-4 py-1 gap-2">
        <button
          onClick={() => setActiveTab('available')}
          className={`flex-1 py-3 text-xs font-bold rounded-xl transition text-center flex items-center justify-center gap-1.5 ${
            activeTab === 'available'
              ? 'bg-orange-500/10 text-orange-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          <span>Disponíveis ({availableOrders.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-3 text-xs font-bold rounded-xl transition text-center flex items-center justify-center gap-1.5 relative ${
            activeTab === 'active'
              ? 'bg-orange-500/10 text-orange-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Bike className="h-4 w-4" />
          <span>Em Andamento ({activeOrders.length})</span>
          {activeOrders.length > 0 && (
            <span className="absolute top-2 right-4 flex h-2 w-2 rounded-full bg-orange-600 animate-ping" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 text-xs font-bold rounded-xl transition text-center flex items-center justify-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-orange-500/10 text-orange-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Histórico ({completedOrders.length})</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-4">
        {/* --- 1. AVAILABLE ORDERS TAB --- */}
        {activeTab === 'available' && (
          <div className="flex flex-col gap-4">
            {/* Instruction Banner for Available Tab */}
            <div className="rounded-2xl bg-orange-50/80 border border-orange-200/80 p-3.5 shadow-sm">
              <div className="flex items-start gap-2.5">
                <div className="rounded-xl bg-orange-100 p-2 text-orange-600 shrink-0 mt-0.5">
                  <Info className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-orange-950 uppercase tracking-wider">
                    📋 Instruções de Entrega (Pedidos Prontos)
                  </h4>
                  <p className="text-xs text-orange-800 mt-1 leading-relaxed">
                    Aqui aparecem apenas os pedidos que o restaurante marcou como <strong>"Pronto"</strong>. Confira os dados do cliente e clique em <strong>"Aceitar Pedido"</strong> para assumir a corrida.
                  </p>
                </div>
              </div>
            </div>

            {!profile.online && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 flex items-center justify-between gap-3 shadow-sm mb-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                  <Power className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Você está <strong>Offline</strong>. Fique online para ser notificado de novos pedidos.</span>
                </div>
                <button
                  onClick={handleToggleOnline}
                  className="shrink-0 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition active:scale-95 cursor-pointer"
                >
                  Ficar Online
                </button>
              </div>
            )}

            {availableOrders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 p-8 text-center bg-white shadow-sm mt-2">
                <div className="rounded-full bg-orange-50 p-3.5 inline-block text-orange-500 mb-3 animate-pulse">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-gray-700 text-sm mb-1">Nenhum pedido disponível para entrega</h3>
                <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                  Para um pedido aparecer aqui, o cliente deve solicitar <strong>Entrega</strong> e o restaurante deve alterar o status do pedido para <strong>"Pronto"</strong> no painel de administração.
                </p>
              </div>
            ) : (
              availableOrders.map((order) => {
                const orderAddressStr = typeof order.endereco === 'string' 
                  ? order.endereco 
                  : `${order.endereco.street}, ${order.endereco.number} - ${order.endereco.neighborhood}, ${order.endereco.city}`;

                return (
                  <motion.div
                    key={order.id}
                    layoutId={`order-card-${order.id}`}
                    className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-3.5"
                  >
                    {/* Top Row: ID & Time */}
                    <div className="flex items-center justify-between border-b border-gray-50 pb-2.5">
                      <span className="text-xs font-extrabold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-xl">
                        {order.id}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-gray-400">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span>{order.horarioPedido || 'Pronto'}</span>
                      </div>
                    </div>

                    {/* Middle Info */}
                    <div className="flex flex-col gap-2.5 text-xs">
                      <div>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cliente</span>
                        <span className="font-bold text-gray-800 text-sm mt-0.5 block">{order.customerName}</span>
                      </div>

                      <div className="flex items-start gap-1.5 bg-gray-50 p-2.5 rounded-2xl">
                        <MapPin className="h-4.5 w-4.5 text-orange-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Endereço de Entrega</span>
                          <span className="font-semibold text-gray-700 leading-normal mt-0.5 block">
                            {orderAddressStr}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Row: Price & Accept Button */}
                    <div className="flex items-center justify-between border-t border-gray-50 pt-3 mt-1">
                      <div>
                        <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total a Receber</span>
                        <span className="text-base font-black text-gray-800 mt-0.5 block">
                          {formatPrice(order.valorTotal || order.total)}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setConfirmModal({
                            isOpen: true,
                            orderId: order.id,
                            actionType: 'accept',
                            title: 'Aceitar Entrega',
                            message: `Você deseja aceitar e se responsabilizar pela entrega do Pedido #${order.id}?`,
                            confirmLabel: 'Aceitar Entrega',
                            variant: 'orange'
                          });
                        }}
                        disabled={isUpdating}
                        className="rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 px-5 py-3 text-xs font-black text-white hover:from-orange-700 hover:to-amber-700 transition flex items-center gap-1.5 shadow-md shadow-orange-600/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <span>Aceitar Entrega</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {/* --- 2. ACTIVE ORDERS TAB --- */}
        {activeTab === 'active' && (
          <div className="flex flex-col gap-4">
            {/* Instruction Banner for Active Tab */}
            <div className="rounded-2xl bg-blue-50/80 border border-blue-200/80 p-3.5 shadow-sm">
              <div className="flex items-start gap-2.5">
                <div className="rounded-xl bg-blue-100 p-2 text-blue-600 shrink-0 mt-0.5">
                  <Bike className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-blue-950 uppercase tracking-wider">
                    🏍️ Passo a Passo da Entrega Em Andamento
                  </h4>
                  <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                    Siga a sequência de botões em cada pedido: <strong>1. Confirmar Retirada</strong> ➔ <strong>2. Iniciar Entrega</strong> ➔ <strong>3. Finalizar Entrega</strong> ao entregar para o cliente.
                  </p>
                </div>
              </div>
            </div>

            {activeOrders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 p-8 text-center bg-white shadow-sm mt-2">
                <div className="rounded-full bg-blue-50 p-3.5 inline-block text-blue-500 mb-3">
                  <Bike className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-gray-700 text-sm mb-1">Sem entregas em andamento</h3>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  Você não tem nenhum pedido aceito no momento. Vá para a aba "Disponíveis" para aceitar uma nova corrida!
                </p>
              </div>
            ) : (
              activeOrders.map((order) => {
                const orderAddressStr = typeof order.endereco === 'string' 
                  ? order.endereco 
                  : `${order.endereco.street}, ${order.endereco.number} - ${order.endereco.neighborhood}, ${order.endereco.city}`;

                const isAceito = !order.statusEntrega || order.statusEntrega === 'aceito';
                const isRetirado = order.statusEntrega === 'retirado';
                const isACaminho = order.statusEntrega === 'a_caminho';

                let badgeLabel = 'Aceito (Aguardando Retirada)';
                let badgeClass = 'bg-blue-100 text-blue-800';
                if (isRetirado) {
                  badgeLabel = 'Retirado no Restaurante';
                  badgeClass = 'bg-purple-100 text-purple-800';
                } else if (isACaminho) {
                  badgeLabel = 'Em Rota de Entrega';
                  badgeClass = 'bg-amber-100 text-amber-800';
                }

                const cleanPhone = order.customerPhone ? order.customerPhone.replace(/\D/g, '') : '';
                const whatsappUrl = cleanPhone 
                  ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(`Olá ${order.customerName}! Sou o motoboy responsável pela entrega do seu Pedido #${order.id}.`)}`
                  : '#';

                return (
                  <motion.div
                    key={order.id}
                    layoutId={`order-card-${order.id}`}
                    className="bg-white rounded-3xl border-2 border-blue-500/20 p-5 shadow-md flex flex-col gap-4"
                  >
                    {/* Top Row: ID, Time & Status Pill */}
                    <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-xl">
                          {order.id}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${badgeClass}`}>
                          {badgeLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-gray-400">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span>{order.horarioPedido || 'Em Andamento'}</span>
                      </div>
                    </div>

                    {/* Customer & Address Details */}
                    <div className="flex flex-col gap-3.5 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
                        <div>
                          <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Cliente</span>
                          <span className="font-bold text-gray-800 text-sm mt-0.5 block">{order.customerName}</span>
                          {cleanPhone && (
                            <span className="text-[11px] font-semibold text-gray-500 block mt-0.5">
                              📞 {order.customerPhone}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <ChatButtonWithBadge
                            orderId={order.id}
                            onClick={() => setSelectedChatOrder(order)}
                            size="icon"
                            variant="outline"
                          />

                          {cleanPhone && (
                            <>
                              <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm hover:bg-emerald-700 transition active:scale-95"
                                title="Abrir WhatsApp com o Cliente"
                              >
                                <MessageSquare className="h-4 w-4" />
                                <span>WhatsApp</span>
                              </a>

                              <a
                                href={`tel:${cleanPhone}`}
                                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-200/80 text-gray-700 hover:bg-gray-300 transition"
                                title="Ligar para o Cliente"
                              >
                                <Phone className="h-4 w-4" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-2 bg-blue-50/20 p-3 rounded-2xl border border-blue-500/5">
                        <MapPin className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Endereço de Entrega</span>
                          <span className="font-semibold text-gray-700 leading-normal mt-0.5 block">
                            {orderAddressStr}
                          </span>
                          {typeof order.endereco !== 'string' && order.endereco.complement && (
                            <span className="block text-[10px] text-gray-500 font-medium mt-1">
                              <strong>Compl.:</strong> {order.endereco.complement}
                            </span>
                          )}
                          {typeof order.endereco !== 'string' && order.endereco.reference && (
                            <span className="block text-[10px] text-gray-500 font-medium mt-0.5">
                              <strong>Ref.:</strong> {order.endereco.reference}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Items Ordered */}
                      <div className="border-t border-b border-gray-50 py-3 my-1">
                        <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">Itens do Pedido</span>
                        <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
                          {(order.itens || order.items || []).map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-gray-600">
                              <span className="font-semibold text-gray-800">
                                {item.quantity}x <span className="font-medium text-gray-600">{item.productName}</span>
                              </span>
                              <span className="font-bold text-gray-700">{formatPrice(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer: Price & Direct Actions */}
                    <div className="flex flex-col gap-3 pt-1 border-t border-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total do Pedido</span>
                          <span className="text-base font-extrabold text-gray-800 block">
                            {formatPrice(order.valorTotal || order.total)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Pagamento</span>
                          <span className="text-xs font-bold text-orange-600 uppercase mt-0.5 block">
                            {order.paymentMethod === 'pix' ? '🔥 Pix Online' : order.paymentMethod === 'card' ? '💳 Cartão na Entrega' : '💵 Dinheiro'}
                          </span>
                        </div>
                      </div>

                      {/* Explicit Step-by-Step Guidance Box */}
                      {isAceito && (
                        <div className="rounded-2xl bg-blue-50 border border-blue-200/80 p-3 flex items-start gap-2 text-xs text-blue-900">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">1</span>
                          <p className="leading-snug">
                            <strong>Instrução Passo 1:</strong> Retire o pacote na cozinha do restaurante e clique no botão azul abaixo para confirmar a retirada.
                          </p>
                        </div>
                      )}

                      {isRetirado && (
                        <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-3 flex items-start gap-2 text-xs text-amber-900">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white">2</span>
                          <p className="leading-snug">
                            <strong>Instrução Passo 2:</strong> Pedido em mãos! Monte na moto e clique no botão amarelo abaixo ao sair em direção ao cliente.
                          </p>
                        </div>
                      )}

                      {isACaminho && (
                        <div className="rounded-2xl bg-emerald-50 border border-emerald-200/80 p-3 flex items-start gap-2 text-xs text-emerald-900">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">3</span>
                          <p className="leading-snug">
                            <strong>Instrução Passo 3:</strong> Você está no caminho do cliente. Ao entregar e receber o pagamento, clique no botão verde para finalizar.
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 mt-1">
                        {isAceito && (
                          <button
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                orderId: order.id,
                                actionType: 'pickup',
                                title: 'Confirmar Retirada',
                                message: `Confirma que você já retirou o Pedido #${order.id} no restaurante?`,
                                confirmLabel: 'Confirmar Retirada',
                                variant: 'blue'
                              });
                            }}
                            disabled={isUpdating}
                            className="col-span-2 rounded-2xl bg-blue-600 py-3.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-md shadow-blue-600/10 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            <ShoppingBag className="h-4 w-4" />
                            <span>Confirmar Retirada (Retirado no Restaurante)</span>
                          </button>
                        )}

                        {isRetirado && (
                          <button
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                orderId: order.id,
                                actionType: 'start_delivery',
                                title: 'Confirmar Saída para Entrega',
                                message: `Confirma que saiu do restaurante e está em rota para entregar o Pedido #${order.id}?`,
                                confirmLabel: 'Confirmar Saída (Em Rota)',
                                variant: 'amber'
                              });
                            }}
                            disabled={isUpdating}
                            className="col-span-2 rounded-2xl bg-amber-500 py-3.5 text-xs font-bold text-white hover:bg-amber-600 transition shadow-md shadow-amber-500/10 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            <Navigation className="h-4 w-4 animate-pulse" />
                            <span>Iniciar Entrega (Saiu p/ entrega)</span>
                          </button>
                        )}

                        {isACaminho && (
                          <button
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                orderId: order.id,
                                actionType: 'complete_delivery',
                                title: 'Finalizar Entrega',
                                message: `Confirma que o Pedido #${order.id} foi entregue com sucesso ao cliente?`,
                                confirmLabel: 'Finalizar Entrega',
                                variant: 'emerald'
                              });
                            }}
                            disabled={isUpdating}
                            className="col-span-2 rounded-2xl bg-emerald-600 py-3.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-md shadow-emerald-600/10 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Finalizar Entrega (Entregue)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {/* --- 3. COMPLETED HISTORY TAB --- */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-4">
            {completedOrders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 p-8 text-center bg-white shadow-sm mt-4">
                <div className="rounded-full bg-emerald-50 p-3.5 inline-block text-emerald-600 mb-3">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-gray-700 text-sm mb-1">Nenhuma entrega concluída</h3>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  Suas entregas finalizadas com sucesso serão listadas aqui!
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 border-b border-gray-50 pb-2 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-orange-500" /> Seu Desempenho Histórico
                </h3>
                
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 text-center">
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total de Corridas</span>
                    <span className="text-lg font-extrabold text-gray-800 mt-0.5 block">{completedOrders.length}</span>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 text-center">
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Faturamento</span>
                    <span className="text-lg font-extrabold text-emerald-600 mt-0.5 block">
                      {formatPrice(completedOrders.reduce((sum, o) => sum + (o.valorTotal || o.total), 0))}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3.5">
                  {completedOrders.map((order) => (
                    <div
                      key={order.id}
                      className="border-b border-gray-50 pb-3.5 last:border-b-0 last:pb-0 flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                            {order.id}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-bold uppercase flex items-center gap-0.5">
                            <CheckCircle2 className="h-3 w-3" /> Entregue
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-gray-800 truncate mt-1">
                          Cliente: {order.customerName}
                        </h4>
                        <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
                          Concluído às {order.horarioEntrega ? new Date(order.horarioEntrega).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Concluído'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-xs font-black text-gray-800 block">
                            {formatPrice(order.valorTotal || order.total)}
                          </span>
                          <span className="text-[9px] font-medium text-gray-400">
                            {order.paymentMethod === 'pix' ? 'Pix' : order.paymentMethod === 'card' ? 'Cartão' : 'Dinheiro'}
                          </span>
                        </div>
                        <ChatButtonWithBadge
                          orderId={order.id}
                          onClick={() => setSelectedChatOrder(order)}
                          size="icon"
                          variant="outline"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedChatOrder && (
        <OrderChatModal
          orderId={selectedChatOrder.id}
          orderNumber={selectedChatOrder.id}
          customerName={selectedChatOrder.customerName}
          isOpen={!!selectedChatOrder}
          onClose={() => setSelectedChatOrder(null)}
        />
      )}

      {confirmModal && (
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          variant={confirmModal.variant}
          isLoading={isUpdating}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
