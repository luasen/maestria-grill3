import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { formatPrice } from '../utils';
import { 
  Clock3, 
  CheckCircle2, 
  Package, 
  Bike, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  ShoppingBag,
  MapPin,
  CreditCard,
  Compass,
  ArrowRight,
  User,
  Phone,
  Mail,
  Shield,
  Check,
  Loader2,
  LogOut,
  Search,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import OrderChatModal from '../components/OrderChatModal';
import ChatButtonWithBadge from '../components/ChatButtonWithBadge';

export default function MyOrders() {
  const { user, profile, setIsAuthOpen, updateProfile, logout } = useAuth();
  const { orders, setActiveView } = useApp();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedChatOrder, setSelectedChatOrder] = useState<any | null>(null);
  
  // Tab state: 'profile' or 'orders' (default)
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('orders');

  // Sub-tab for orders list: 'active' (default) or 'history'
  const [ordersSubTab, setOrdersSubTab] = useState<'active' | 'history'>('active');

  // Profile Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [complement, setComplement] = useState('');
  const [reference, setReference] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  // Sync profile fields
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setCep(profile.address?.cep || '');
      setStreet(profile.address?.street || '');
      setNumber(profile.address?.number || '');
      setNeighborhood(profile.address?.neighborhood || '');
      setCity(profile.address?.city || '');
      setComplement(profile.address?.complement || '');
      setReference(profile.address?.reference || '');
    }
  }, [profile]);

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center bg-gray-50/50 min-h-[60vh]">
        <div className="rounded-full bg-orange-100 p-4 mb-4 text-orange-600">
          <ShoppingBag className="h-10 w-10 animate-pulse" />
        </div>
        <h2 className="text-lg font-extrabold text-gray-900 mb-2">Minha Conta</h2>
        <p className="text-xs text-gray-500 max-w-xs mb-6 leading-relaxed">
          Para visualizar os dados da sua conta e seu histórico de pedidos, por favor faça login.
        </p>
        <button
          onClick={() => setIsAuthOpen(true)}
          className="rounded-2xl bg-orange-600 px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-orange-500/15 hover:bg-orange-700 transition"
        >
          Entrar ou Cadastrar
        </button>
      </div>
    );
  }

  // Filter orders for the logged in user (only orders where the user is the customer who placed the order)
  const myOrders = orders.filter((order) => {
    if (!user) return false;

    // 1. Primary check: order explicitly belongs to this user ID
    if (order.usuario?.uid) {
      return order.usuario.uid === user.uid;
    }

    // 2. Secondary fallback for guest orders without usuario.uid matching exact phone number
    if (profile?.phone && profile.phone.trim().length > 5 && order.customerPhone) {
      const cleanProfilePhone = profile.phone.replace(/\D/g, '');
      const cleanCustomerPhone = order.customerPhone.replace(/\D/g, '');
      return cleanProfilePhone.length > 5 && cleanProfilePhone === cleanCustomerPhone;
    }

    return false;
  });

  const activeOrders = myOrders.filter(order => order.status !== 'delivered' && order.status !== 'refused');
  const completedOrders = myOrders.filter(order => order.status === 'delivered' || order.status === 'refused');
  const displayedOrders = ordersSubTab === 'active' ? activeOrders : completedOrders;

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'pix': return 'Pix';
      case 'card': return 'Cartão de Crédito/Débito';
      case 'cash': return 'Dinheiro';
      default: return method;
    }
  };

  const getOrderStatusInfo = (status: string, statusEntrega?: string) => {
    if (status === 'refused') {
      return { label: 'Pedido Recusado', color: 'bg-rose-50 text-rose-700 border-rose-100', step: 0 };
    }
    if (status === 'delivered' || statusEntrega === 'entregue') {
      return { label: 'Pedido Entregue e Concluído', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', step: 4 };
    }
    if (status === 'ready') {
      if (statusEntrega === 'a_caminho') {
        return { label: 'Saiu para Entrega (Em Rota)', color: 'bg-amber-50 text-amber-800 border-amber-200', step: 3.5 };
      }
      if (statusEntrega === 'retirado') {
        return { label: 'Retirado pelo Motoboy', color: 'bg-purple-50 text-purple-700 border-purple-200', step: 3.2 };
      }
      if (statusEntrega === 'aceito') {
        return { label: 'Motoboy Aceitou (A caminho do restaurante)', color: 'bg-blue-50 text-blue-700 border-blue-200', step: 3.1 };
      }
      return { label: 'Pronto / Aguardando Motoboy', color: 'bg-blue-50 text-blue-700 border-blue-200', step: 3 };
    }
    if (status === 'awaiting_payment') {
      return { label: 'Aguardando Pagamento', color: 'bg-amber-50 text-amber-800 border-amber-200', step: 0.5 };
    }
    if (status === 'preparing') {
      return { label: 'Em Preparação', color: 'bg-amber-50 text-amber-700 border-amber-200', step: 2 };
    }
    return { label: 'Pedido Recebido', color: 'bg-orange-50 text-orange-700 border-orange-200', step: 1 };
  };

  const toggleExpandOrder = (id: string) => {
    setExpandedOrderId(prev => prev === id ? null : id);
  };

  // CEP Lookup
  const handleCepBlur = async () => {
    const cleanedCep = cep.replace(/\D/g, '');
    if (cleanedCep.length === 8) {
      setIsSearchingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setStreet(data.logradouro || '');
          setNeighborhood(data.bairro || '');
          setCity(data.localidade || '');
        }
      } catch (err) {
        console.error('Error fetching CEP:', err);
      } finally {
        setIsSearchingCep(false);
      }
    }
  };

  // Save changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError('');

    try {
      await updateProfile({
        name,
        phone,
        address: {
          cep: cep.replace(/\D/g, ''),
          street,
          number,
          neighborhood,
          city,
          complement,
          reference
        }
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setSaveError(err.message || 'Erro ao salvar as informações da conta.');
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'superadmin': return 'Super Admin 👑';
      case 'admin': return 'Administrador ⚙️';
      case 'motoboy': return 'Motoboy Parceiro 🏍️';
      default: return 'Cliente Especial ✨';
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'superadmin': return 'bg-rose-500/10 border-rose-500/20 text-rose-600';
      case 'admin': return 'bg-amber-500/10 border-amber-500/20 text-amber-600';
      case 'motoboy': return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600';
      default: return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600';
    }
  };

  return (
    <div className="min-h-screen bg-transparent pb-28">
      {/* Title block */}
      <div className="bg-white/20 backdrop-blur-md px-4 py-4 border-b border-white/20">
        <div className="mx-auto max-w-lg flex items-center justify-between">
          <div>
            <h2 className="font-sans text-lg font-extrabold text-gray-900">Minha Conta</h2>
            <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wider">Gerencie seus dados e pedidos</p>
          </div>
          <span className="flex h-9 items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Online
          </span>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="mx-auto max-w-lg px-4 pt-4">
        <div className="flex border border-white/30 bg-white/30 backdrop-blur-md p-1 rounded-2xl shadow-sm gap-1">
          <button
            onClick={() => setActiveTab('profile')}
            id="tab-my-account-details"
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'profile'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-500/10'
                : 'text-gray-500 hover:text-gray-800 hover:bg-white/20'
            }`}
          >
            <User className="h-4 w-4" />
            Meus Dados
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            id="tab-my-account-orders"
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'orders'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-500/10'
                : 'text-gray-500 hover:text-gray-800 hover:bg-white/20'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            Meus Pedidos ({myOrders.length})
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-5">
        <AnimatePresence mode="wait">
          {activeTab === 'profile' ? (
            <motion.div
              key="profile-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-4"
            >
              {/* Profile Card Header */}
              <div className="bg-white/45 backdrop-blur-md rounded-3xl border border-white/30 p-5 shadow-sm flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-rose-500 flex items-center justify-center font-sans text-2xl font-black text-white shadow-md shadow-orange-500/20">
                  {name ? name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-sans text-base font-extrabold text-gray-900 truncate">{name || 'Seu Nome'}</h3>
                  <p className="text-xs text-gray-400 font-medium truncate mb-1">{profile?.email || user.email}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className={`rounded-full px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider border ${getRoleBadgeColor(profile?.role)}`}>
                      {getRoleLabel(profile?.role)}
                    </span>
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-emerald-600">
                      Conta Ativa ✓
                    </span>
                  </div>
                </div>
              </div>

              {/* Form container */}
              <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                {/* Personal Details Section */}
                <div className="bg-white/45 backdrop-blur-md rounded-3xl border border-white/30 p-5 shadow-sm flex flex-col gap-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-white/20">
                    <User className="h-4 w-4 text-orange-500" />
                    <h4 className="font-sans text-xs font-black text-gray-900 uppercase tracking-wider">Dados Pessoais</h4>
                  </div>

                  {/* Nome Field */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nome Completo</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Luan Sena"
                      id="input-profile-name"
                      className="w-full rounded-xl border border-white/40 bg-white/40 py-2.5 px-3.5 text-xs text-gray-800 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                    />
                  </div>

                  {/* Telefone Field */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Telefone / WhatsApp</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ex: (11) 99999-9999"
                      id="input-profile-phone"
                      className="w-full rounded-xl border border-white/40 bg-white/40 py-2.5 px-3.5 text-xs text-gray-800 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                    />
                  </div>

                  {/* Email Field (disabled/read-only) */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">E-mail (Não editável)</label>
                    <div className="flex items-center gap-2 w-full rounded-xl border border-gray-100 bg-gray-50/50 py-2.5 px-3.5 text-xs text-gray-400 font-medium">
                      <Mail className="h-4 w-4 text-gray-300" />
                      <span>{profile?.email || user.email}</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Address Section */}
                <div className="bg-white/45 backdrop-blur-md rounded-3xl border border-white/30 p-5 shadow-sm flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/20">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-orange-500" />
                      <h4 className="font-sans text-xs font-black text-gray-900 uppercase tracking-wider">Endereço de Entrega</h4>
                    </div>
                    {isSearchingCep && (
                      <span className="flex items-center gap-1 text-[9px] text-orange-500 font-bold">
                        <Loader2 className="h-3 w-3 animate-spin" /> Buscando...
                      </span>
                    )}
                  </div>

                  {/* CEP Field */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                      CEP
                      <span className="text-[8px] text-orange-500 font-bold tracking-normal uppercase">(Busca automática ao digitar 8 números)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cep}
                        onChange={(e) => setCep(e.target.value)}
                        onBlur={handleCepBlur}
                        placeholder="Ex: 01001-000"
                        id="input-profile-cep"
                        className="w-full rounded-xl border border-white/40 bg-white/40 py-2.5 px-3.5 text-xs text-gray-800 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                      />
                    </div>
                  </div>

                  {/* Street & Number Row */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Rua / Logradouro</label>
                      <input
                        type="text"
                        required
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="Nome da rua..."
                        id="input-profile-street"
                        className="w-full rounded-xl border border-white/40 bg-white/40 py-2.5 px-3.5 text-xs text-gray-800 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Número</label>
                      <input
                        type="text"
                        required
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        placeholder="Ex: 123"
                        id="input-profile-number"
                        className="w-full rounded-xl border border-white/40 bg-white/40 py-2.5 px-3.5 text-xs text-gray-800 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                      />
                    </div>
                  </div>

                  {/* Neighborhood & City Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Bairro</label>
                      <input
                        type="text"
                        required
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        placeholder="Seu bairro..."
                        id="input-profile-neighborhood"
                        className="w-full rounded-xl border border-white/40 bg-white/40 py-2.5 px-3.5 text-xs text-gray-800 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Cidade</label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Sua cidade..."
                        id="input-profile-city"
                        className="w-full rounded-xl border border-white/40 bg-white/40 py-2.5 px-3.5 text-xs text-gray-800 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                      />
                    </div>
                  </div>

                  {/* Complement */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Complemento (Opcional)</label>
                    <input
                      type="text"
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      placeholder="Apto, bloco, casa..."
                      id="input-profile-complement"
                      className="w-full rounded-xl border border-white/40 bg-white/40 py-2.5 px-3.5 text-xs text-gray-800 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                    />
                  </div>

                  {/* Reference */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Ponto de Referência (Opcional)</label>
                    <input
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Próximo ao mercado..."
                      id="input-profile-reference"
                      className="w-full rounded-xl border border-white/40 bg-white/40 py-2.5 px-3.5 text-xs text-gray-800 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                    />
                  </div>
                </div>

                {/* Error and Success Notifications */}
                {saveError && (
                  <div className="flex items-center gap-2 rounded-2xl bg-red-500/10 border border-red-500/15 p-4.5 text-xs font-bold text-red-600 shadow-sm animate-shake">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{saveError}</span>
                  </div>
                )}

                {saveSuccess && (
                  <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/15 p-4.5 text-xs font-bold text-emerald-600 shadow-sm">
                    <Check className="h-4 w-4 shrink-0 bg-emerald-500 text-white rounded-full p-0.5" />
                    <span>Informações da conta salvas com sucesso!</span>
                  </div>
                )}

                {/* Submit and Logout Buttons */}
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    id="btn-profile-submit"
                    className="w-full h-13 rounded-2xl bg-orange-600 text-xs font-extrabold text-white shadow-lg shadow-orange-500/15 hover:bg-orange-700 transition flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-75 disabled:pointer-events-none"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Salvando dados...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Salvar Alterações
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => logout()}
                    id="btn-profile-logout"
                    className="w-full h-11 rounded-2xl bg-white/40 border border-red-200/50 hover:bg-red-50/50 text-xs font-bold text-red-600 transition flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair da Conta (Logout)
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="orders-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-4"
            >
              {profile?.role === 'motoboy' && (
                <div className="bg-indigo-50 border border-indigo-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-indigo-600 text-white p-2 rounded-xl shrink-0">
                      <Bike className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-indigo-950">Você é Motoboy Parceiro 🏍️</p>
                      <p className="text-[10px] text-indigo-700 leading-snug">
                        Esta tela exibe apenas seus pedidos feitos como cliente. Para realizar entregas, acesse seu painel.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveView('motoboy')}
                    className="shrink-0 bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition shadow-sm cursor-pointer"
                  >
                    Painel Motoboy
                  </button>
                </div>
              )}
              {myOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-white/45 backdrop-blur-md rounded-3xl border border-white/30 py-16">
                  <ShoppingBag className="h-10 w-10 text-gray-300 mb-3" />
                  <h3 className="font-sans text-xs font-extrabold text-gray-900 mb-1">Nenhum Pedido Encontrado</h3>
                  <p className="text-[10px] text-gray-500 max-w-xs mb-5">Você ainda não realizou nenhum pedido em nosso restaurante.</p>
                  <button
                    onClick={() => setActiveView('menu')}
                    className="rounded-xl bg-orange-600 px-5 py-2.5 text-[10px] font-bold text-white hover:bg-orange-700 transition"
                  >
                    Ir para o Cardápio
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Modern Sub-tab Switcher inside Orders */}
                  <div className="flex border-b border-gray-200/60 pb-1.5 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrdersSubTab('active')}
                      className={`flex-1 pb-2.5 text-xs font-bold transition-all border-b-2 text-center flex items-center justify-center gap-1.5 ${
                        ordersSubTab === 'active'
                          ? 'border-orange-500 text-orange-600 font-extrabold'
                          : 'border-transparent text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <span>Ativos</span>
                      <span className={`inline-flex items-center justify-center h-4.5 px-1.5 text-[9px] font-black rounded-full transition-colors ${
                        ordersSubTab === 'active' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {activeOrders.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrdersSubTab('history')}
                      className={`flex-1 pb-2.5 text-xs font-bold transition-all border-b-2 text-center flex items-center justify-center gap-1.5 ${
                        ordersSubTab === 'history'
                          ? 'border-orange-500 text-orange-600 font-extrabold'
                          : 'border-transparent text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <span>Histórico</span>
                      <span className={`inline-flex items-center justify-center h-4.5 px-1.5 text-[9px] font-black rounded-full transition-colors ${
                        ordersSubTab === 'history' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {completedOrders.length}
                      </span>
                    </button>
                  </div>

                  {displayedOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center bg-white/20 rounded-3xl border border-dashed border-gray-200 py-12">
                      <ShoppingBag className="h-8 w-8 text-gray-300 mb-2.5 animate-pulse" />
                      <h4 className="font-sans text-xs font-extrabold text-gray-700 mb-0.5">
                        {ordersSubTab === 'active' ? 'Nenhum Pedido Ativo' : 'Histórico Vazio'}
                      </h4>
                      <p className="text-[10px] text-gray-400 max-w-xs">
                        {ordersSubTab === 'active' 
                          ? 'Não há pedidos em andamento no momento.' 
                          : 'Você não possui pedidos finalizados ou recusados.'}
                      </p>
                    </div>
                  ) : (
                    displayedOrders.map((order) => {
                    const statusInfo = getOrderStatusInfo(order.status, order.statusEntrega);
                    const isExpanded = expandedOrderId === order.id;

                    return (
                      <div
                        key={order.id}
                        className="bg-white/45 backdrop-blur-md rounded-3xl border border-white/30 overflow-hidden shadow-sm hover:shadow-md transition"
                      >
                        {/* Order card header */}
                        <div
                          onClick={() => toggleExpandOrder(order.id)}
                          className="p-4 flex flex-col gap-2.5 cursor-pointer hover:bg-white/10 transition"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-sans text-xs font-extrabold text-gray-900">
                                {order.id}
                              </span>
                              <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">
                                {new Date(order.createdAt).toLocaleDateString('pt-BR')} às {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-wider border ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </div>

                          <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-600 font-semibold">
                              {order.tipoPedido === 'entrega' ? (
                                <span className="flex items-center gap-1 bg-orange-500/10 text-orange-700 rounded-full px-2 py-0.5 border border-orange-500/10 text-[9px]">
                                  <Bike className="h-3 w-3" /> Entrega
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 bg-blue-500/10 text-blue-700 rounded-full px-2 py-0.5 border border-blue-500/10 text-[9px]">
                                  <Package className="h-3 w-3" /> Retirada
                                </span>
                              )}
                              <span className="text-gray-300">|</span>
                              <span>{getPaymentMethodLabel(order.paymentMethod)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-extrabold text-gray-900">
                                {formatPrice(order.valorTotal || order.total)}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Real-time Order Tracking Status Progress */}
                        <div className="px-4 pb-4 bg-white/20 border-t border-white/10">
                          {order.status === 'refused' ? (
                            <div className="mt-3 p-3.5 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-2.5 text-rose-700 animate-pulse">
                              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-xs font-bold uppercase tracking-wider text-rose-800">Pedido Recusado pelo Restaurante</p>
                                {order.motivoRecusa && (
                                  <p className="text-xs font-semibold text-rose-600 mt-1 leading-relaxed">
                                    <strong>Motivo:</strong> {order.motivoRecusa}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-[8px] text-gray-400 uppercase font-extrabold tracking-wider pt-3 pb-2">Status do Pedido</p>
                              
                              {/* Visual Progress Bar */}
                              <div className="relative flex items-center justify-between w-full px-4 mt-2">
                                {/* Grey background track line */}
                                <div className="absolute top-3 left-6 right-6 h-0.5 bg-gray-200 z-0"></div>
                                
                                {/* Colored active track line */}
                                <div 
                                  className="absolute top-3 left-6 h-0.5 bg-orange-500 transition-all duration-500 z-0"
                                  style={{ 
                                    width: statusInfo.step >= 4 ? 'calc(100% - 3rem)' : 
                                           statusInfo.step >= 3.5 ? '75%' : 
                                           statusInfo.step >= 3 ? '50%' : 
                                           statusInfo.step >= 2 ? '25%' : '0%' 
                                  }}
                                ></div>

                                {/* Step 1: Recebido */}
                                <div className="relative flex flex-col items-center z-10">
                                  <div className={`h-6.5 w-6.5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                    statusInfo.step >= 1 
                                      ? 'bg-orange-500 text-white ring-4 ring-orange-100' 
                                      : 'bg-white border border-gray-200 text-gray-400'
                                  }`}>
                                    <Package className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="text-[8px] font-extrabold uppercase mt-1 text-gray-600">Recebido</span>
                                </div>

                                {/* Step 2: Preparação */}
                                <div className="relative flex flex-col items-center z-10">
                                  <div className={`h-6.5 w-6.5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                    statusInfo.step >= 2 
                                      ? 'bg-orange-500 text-white ring-4 ring-orange-100' 
                                      : 'bg-white border border-gray-200 text-gray-400'
                                  }`}>
                                    <Clock3 className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="text-[8px] font-extrabold uppercase mt-1 text-gray-600">Preparo</span>
                                </div>

                                {/* Step 3: Pronto ou A Caminho */}
                                <div className="relative flex flex-col items-center z-10">
                                  <div className={`h-6.5 w-6.5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                    statusInfo.step >= 3 
                                      ? 'bg-orange-500 text-white ring-4 ring-orange-100' 
                                      : 'bg-white border border-gray-200 text-gray-400'
                                  }`}>
                                    {statusInfo.step >= 3.5 ? <Bike className="h-3.5 w-3.5 animate-bounce" /> : <Package className="h-3.5 w-3.5" />}
                                  </div>
                                  <span className="text-[8px] font-extrabold uppercase mt-1 text-gray-600">
                                    {statusInfo.step >= 3.5 ? 'A Caminho' : 'Pronto'}
                                  </span>
                                </div>

                                {/* Step 4: Entregue */}
                                <div className="relative flex flex-col items-center z-10">
                                  <div className={`h-6.5 w-6.5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                    statusInfo.step >= 4 
                                      ? 'bg-emerald-500 text-white ring-4 ring-emerald-100' 
                                      : 'bg-white border border-gray-200 text-gray-400'
                                  }`}>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="text-[8px] font-extrabold uppercase mt-1 text-gray-600">Concluído</span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Expanded Items & Address */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden border-t border-white/10"
                            >
                              <div className="p-4 bg-white/30 flex flex-col gap-4 text-xs font-semibold text-gray-700">
                                {/* Products List */}
                                <div>
                                  <p className="text-[8px] text-gray-400 uppercase font-extrabold tracking-wider mb-2">Itens do Pedido</p>
                                  <div className="flex flex-col gap-2">
                                    {(order.itens || order.items || []).map((item, idx) => (
                                      <div key={idx} className="flex justify-between items-center text-xs">
                                        <div>
                                          <span className="text-gray-900 font-extrabold">{item.quantity}x</span>{' '}
                                          <span className="text-gray-700 font-medium">{item.productName}</span>
                                        </div>
                                        <span className="font-extrabold text-gray-900">{formatPrice(item.price * item.quantity)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Order Details & Summary prices */}
                                <div className="border-t border-dashed border-white/20 pt-3 flex flex-col gap-1.5">
                                  <div className="flex justify-between text-gray-500">
                                    <span>Subtotal</span>
                                    <span>{formatPrice(order.valorProdutos || order.subtotal)}</span>
                                  </div>
                                  {order.tipoPedido === 'entrega' && (
                                    <div className="flex justify-between text-gray-500">
                                      <span>Taxa de Entrega</span>
                                      <span>{formatPrice(order.taxaEntrega || order.deliveryFee)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between text-gray-900 font-extrabold text-xs pt-1 border-t border-white/5">
                                    <span>Valor Total</span>
                                    <span>{formatPrice(order.valorTotal || order.total)}</span>
                                  </div>
                                </div>

                                {/* Shipping details */}
                                {order.tipoPedido === 'entrega' && order.endereco && (
                                  <div className="border-t border-dashed border-white/20 pt-3">
                                    <p className="text-[8px] text-gray-400 uppercase font-extrabold tracking-wider mb-1.5">Endereço de Entrega</p>
                                    <div className="flex gap-2 items-start text-xs font-medium text-gray-600 leading-relaxed">
                                      <MapPin className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                      <div>
                                        {typeof order.endereco === 'object' ? (
                                          <>
                                            <p className="font-bold text-gray-800">
                                              {order.endereco.street}, {order.endereco.number}
                                            </p>
                                            <p>{order.endereco.neighborhood} - {order.endereco.city}</p>
                                            {order.endereco.complement && <p className="text-[10px] text-gray-400">Complemento: {order.endereco.complement}</p>}
                                          </>
                                        ) : (
                                          <p className="text-gray-800 font-bold">{order.endereco}</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Real-time chat integration */}
                                {order.tipoPedido === 'entrega' && order.motoboyId && (
                                  <ChatButtonWithBadge
                                    orderId={order.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedChatOrder(order);
                                    }}
                                    variant="filled"
                                    size="full"
                                  />
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
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
    </div>
  );
}
