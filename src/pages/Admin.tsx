import React, { useState, useEffect } from 'react';
import {
  ListOrdered,
  Plus,
  Trash2,
  Edit2,
  Settings,
  FolderOpen,
  ArrowRight,
  Sparkles,
  Phone,
  MapPin,
  Clock,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Utensils,
  Check,
  CheckCircle2,
  Clock3,
  Truck,
  Users,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Percent,
  Bell,
  Download,
  Upload,
  Lock,
  Palette,
  FileJson,
  Save,
  MessageSquare,
  X,
  AlertCircle,
  RotateCw
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { Product, Category, RestaurantSettings, OrderStatus, Order, UserProfile } from '../types';
import { formatPrice, formatDate } from '../utils';
import { updateThemeColors } from '../utils/theme';
import { motion, AnimatePresence } from 'motion/react';
// @ts-ignore
import restaurantBanner from '../assets/images/restaurant_banner_1783985102418.jpg';
import OrderChatModal from '../components/OrderChatModal';
import ChatButtonWithBadge from '../components/ChatButtonWithBadge';
import AdminChatDashboard from '../components/AdminChatDashboard';
import ImageUploader from '../components/ImageUploader';
import { ConfirmationModal } from '../components/ConfirmationModal';

type AdminTab = 'orders' | 'products' | 'categories' | 'settings' | 'employees' | 'systemSettings' | 'chats';

export default function Admin() {
  const {
    products,
    categories,
    orders,
    settings,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    updateOrderStatus,
    updateOrder,
    updateSettings,
    getUsers,
    updateUserProfile,
    setActiveView,
    refreshData,
  } = useApp();

  const { user, profile, loading, setIsAuthOpen } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('orders');
  const [selectedChatOrder, setSelectedChatOrder] = useState<any | null>(null);
  const [confirmStatusModal, setConfirmStatusModal] = useState<{
    isOpen: boolean;
    orderId: string;
    targetStatus: OrderStatus;
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'orange' | 'blue' | 'emerald' | 'rose' | 'amber';
  } | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleConfirmStatusChange = async () => {
    if (!confirmStatusModal) return;

    // Regra 6: Proteção rígida na ação de aceitar
    if (confirmStatusModal.targetStatus === 'preparing') {
      const targetOrder = orders.find(o => o.id === confirmStatusModal.orderId);
      if (targetOrder) {
        const isOnline = targetOrder.paymentMethod === 'mercadopago';
        const isPaid = targetOrder.paymentStatus === 'paid' || targetOrder.statusPagamento === 'pago' || targetOrder.mercadopagoStatus === 'approved';
        if (isOnline && !isPaid) {
          alert('O pagamento online ainda não foi confirmado.');
          setIsUpdatingStatus(false);
          setConfirmStatusModal(null);
          return;
        }
      }
    }

    setIsUpdatingStatus(true);
    try {
      await updateOrderStatus(confirmStatusModal.orderId, confirmStatusModal.targetStatus);
    } catch (e) {
      console.error('Error updating order status:', e);
    } finally {
      setIsUpdatingStatus(false);
      setConfirmStatusModal(null);
    }
  };

  // --- EMPLOYEES MANAGEMENT STATE ---
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'cliente' | 'motoboy' | 'admin' | 'superadmin'>('all');

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await getUsers();
      setUsersList(data);
    } catch (e) {
      console.error('Erro ao buscar usuários:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'superadmin') {
      fetchUsers();
    }
  }, [profile]);

  const getDeliveryCount = (userId: string) => {
    return orders.filter(o => o.motoboyId === userId && o.status === 'delivered').length;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
        <p className="text-xs text-gray-500 font-semibold">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] px-4 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10 text-orange-600 border border-orange-500/20 mb-4">
          <Settings className="h-8 w-8 animate-spin-slow" />
        </span>
        <h2 className="font-sans text-lg font-extrabold text-gray-900 mb-2">Acesso ao Painel Restrito</h2>
        <p className="text-xs text-gray-500 max-w-xs leading-relaxed mb-6">
          Por favor, faça login com sua conta para poder acessar as configurações do restaurante e gerenciar os pedidos em tempo real.
        </p>
        <button
          onClick={() => setIsAuthOpen(true)}
          className="rounded-2xl bg-orange-600 px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-orange-500/15 hover:bg-orange-700 transition"
        >
          Entrar na Minha Conta
        </button>
      </div>
    );
  }

  if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] px-4 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-600 border border-red-500/20 mb-4">
          <ShieldAlert className="h-8 w-8" />
        </span>
        <h2 className="font-sans text-lg font-extrabold text-gray-900 mb-2">Acesso não autorizado.</h2>
        <p className="text-xs text-gray-500 max-w-xs leading-relaxed mb-6">
          Esta área é exclusiva para administradores do Maestria Grill.
        </p>
        <button
          onClick={() => setActiveView('home')}
          className="rounded-2xl bg-gray-950 px-6 py-3.5 text-xs font-bold text-white transition hover:bg-gray-800"
        >
          Voltar para o Início
        </button>
      </div>
    );
  }

  // --- ORDER MANAGEMENT STATE ---
  const [selectedOrderStatusFilter, setSelectedOrderStatusFilter] = useState<string>('all');
  const [refusingOrderId, setRefusingOrderId] = useState<string | null>(null);
  const [refusalReason, setRefusalReason] = useState('');
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);

  const activeOrders = orders;

  const filteredOrders = activeOrders.filter((order) => {
    if (selectedOrderStatusFilter === 'all') return true;
    if (selectedOrderStatusFilter === 'pending') {
      return order.status === 'pending' || order.status === 'awaiting_payment';
    }
    return order.status === selectedOrderStatusFilter;
  });

  const getOrderStatusText = (order: Order) => {
    if (order.status === 'awaiting_payment') return 'Aguardando Pagamento';
    if (order.status === 'pending') return 'Recebido';
    if (order.status === 'preparing') return 'Em Preparo';
    if (order.status === 'refused') return 'Recusado';
    if (order.status === 'delivered') return 'Entregue / Concluído';

    if (order.status === 'ready') {
      if (order.tipoPedido === 'retirada') {
        return 'Pronto p/ Retirada no Balcão';
      }
      if (order.statusEntrega === 'aceito') {
        return 'Motoboy Aceitou (A caminho da loja)';
      }
      if (order.statusEntrega === 'retirado') {
        return 'Retirado p/ Motoboy (Em entrega)';
      }
      if (order.statusEntrega === 'a_caminho') {
        return 'Motoboy em Trânsito ao Cliente';
      }
      if (order.statusEntrega === 'entregue') {
        return 'Entregue pelo Motoboy';
      }
      return 'Pronto (Aguardando Motoboy)';
    }

    return 'Desconhecido';
  };

  const getOrderStatusBadgeStyle = (order: Order) => {
    if (order.status === 'awaiting_payment') return 'bg-amber-50 text-amber-800 border-amber-300';
    if (order.status === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (order.status === 'preparing') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (order.status === 'refused') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (order.status === 'delivered') return 'bg-emerald-50 text-emerald-700 border-emerald-200';

    if (order.status === 'ready') {
      if (order.tipoPedido === 'retirada') {
        return 'bg-purple-50 text-purple-700 border-purple-200';
      }
      if (order.statusEntrega === 'aceito') {
        return 'bg-sky-50 text-sky-800 border-sky-300';
      }
      if (order.statusEntrega === 'retirado') {
        return 'bg-indigo-50 text-indigo-800 border-indigo-300';
      }
      if (order.statusEntrega === 'a_caminho') {
        return 'bg-amber-50 text-amber-800 border-amber-300';
      }
      if (order.statusEntrega === 'entregue') {
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      }
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }

    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getPaymentMethodDisplay = (order: Order): string => {
    if (order.paymentMethod === 'mercadopago') {
      return 'Mercado Pago (Online)';
    }
    if (order.paymentMethod === 'card') {
      return order.tipoPedido === 'retirada' ? 'Cartão (No Balcão)' : 'Cartão (Maquininha na Entrega)';
    }
    if (order.paymentMethod === 'cash') {
      return order.tipoPedido === 'retirada' ? 'Dinheiro (No Balcão)' : 'Dinheiro (Na Entrega)';
    }
    if (order.paymentMethod === 'pix') {
      return 'Pix';
    }
    return order.paymentMethod || 'Não informado';
  };

  const renderPaymentBadge = (order: Order) => {
    const isOnline = order.paymentMethod === 'mercadopago';
    const isPaid = order.paymentStatus === 'paid' || order.statusPagamento === 'pago' || order.mercadopagoStatus === 'approved';
    const isRefused = order.paymentStatus === 'refused' || order.paymentStatus === 'cancelled' || order.mercadopagoStatus === 'rejected';
    const orderTotal = formatPrice(order.valorTotal || order.total);

    // 1. MERCADO PAGO / ONLINE
    if (isOnline) {
      if (isPaid) {
        return (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[9px] font-extrabold text-emerald-700 border border-emerald-500/20">
            🟢 PAGO (Mercado Pago)
          </span>
        );
      }
      if (isRefused) {
        return (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[9px] font-extrabold text-rose-700 border border-rose-500/20">
            🔴 Pagamento online recusado
          </span>
        );
      }
      return (
        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[9px] font-extrabold text-amber-700 border border-amber-500/20">
          🟠 Aguardando confirmação do pagamento online
        </span>
      );
    }

    // 2. PAGAMENTO NA ENTREGA (DELIVERY)
    if (order.tipoPedido === 'entrega') {
      const methodLabel = order.paymentMethod === 'card' ? 'Cartão' : 'Dinheiro';
      if (isPaid || order.status === 'delivered') {
        return (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[9px] font-extrabold text-emerald-700 border border-emerald-500/20">
            🟢 Pago na Entrega ({methodLabel})
          </span>
        );
      }
      return (
        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[9px] font-extrabold text-amber-800 border border-amber-500/20">
          🟡 Cobrar {orderTotal} na entrega ({methodLabel})
        </span>
      );
    }

    // 3. PAGAMENTO NO BALCÃO (RETIRADA)
    if (order.tipoPedido === 'retirada') {
      const methodLabel = order.paymentMethod === 'card' ? 'Cartão' : 'Dinheiro';
      if (isPaid || order.status === 'delivered') {
        return (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[9px] font-extrabold text-emerald-700 border border-emerald-500/20">
            🟢 Pago no Balcão ({methodLabel})
          </span>
        );
      }
      return (
        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-2.5 py-0.5 text-[9px] font-extrabold text-purple-700 border border-purple-500/20">
          🟡 Cobrar {orderTotal} no balcão ({methodLabel})
        </span>
      );
    }

    // Fallback genérico
    if (isPaid) {
      return (
        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[9px] font-extrabold text-emerald-700 border border-emerald-500/20">
          🟢 PAGO
        </span>
      );
    }
    return (
      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[9px] font-extrabold text-amber-700 border border-amber-500/20">
        🟡 PENDENTE
      </span>
    );
  };

  const getStatusBadgeStyles = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'preparing':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'ready':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'delivered':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'refused':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'Recebido';
      case 'preparing': return 'Em Preparo';
      case 'ready': return 'Pronto / Em Entrega';
      case 'delivered': return 'Entregue';
      case 'refused': return 'Recusado';
    }
  };

  // --- PRODUCT MANAGEMENT STATE ---
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Product Form states
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodImage, setProdImage] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodActive, setProdActive] = useState(true);

  // Open form for adding product
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdDesc('');
    setProdPrice('');
    setProdImage('');
    setProdCategory(categories[0]?.id || '');
    setProdActive(true);
    setShowProductForm(true);
  };

  // Open form for editing product
  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdDesc(p.description);
    setProdPrice(p.price.toString());
    setProdImage(p.image);
    setProdCategory(p.categoryId);
    setProdActive(p.active);
    setShowProductForm(true);
  };

  // Save product (Add or Edit)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodPrice || !prodCategory) return;

    const parsedPrice = parseFloat(prodPrice);
    if (isNaN(parsedPrice)) return;

    const productPayload = {
      name: prodName,
      description: prodDesc,
      price: parsedPrice,
      image: prodImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
      categoryId: prodCategory,
      active: prodActive,
    };

    if (editingProduct) {
      await updateProduct(editingProduct.id, productPayload);
    } else {
      await addProduct(productPayload);
    }

    setShowProductForm(false);
    setEditingProduct(null);
  };

  // Toggle active status for quick in-stock / out-of-stock toggling
  const handleToggleProductActive = async (p: Product) => {
    await updateProduct(p.id, { active: !p.active });
  };

  // --- CATEGORY MANAGEMENT STATE ---
  const [newCatName, setNewCatName] = useState('');
  const [newCatImage, setNewCatImage] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingCatImage, setEditingCatImage] = useState('');

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await addCategory(newCatName.trim(), newCatImage.trim() || undefined);
    setNewCatName('');
    setNewCatImage('');
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCatName.trim()) return;
    await updateCategory(editingCategory.id, editingCatName.trim(), editingCatImage.trim() || undefined);
    setEditingCategory(null);
    setEditingCatName('');
    setEditingCatImage('');
  };

  // --- SETTINGS MANAGEMENT STATE ---
  const [settingsName, setSettingsName] = useState(settings?.name || '');
  const [settingsDesc, setSettingsDesc] = useState(settings?.description || '');
  const [settingsLogo, setSettingsLogo] = useState(settings?.logoUrl || '');
  const [settingsBanner, setSettingsBanner] = useState(settings?.bannerUrl || '');
  const [settingsFee, setSettingsFee] = useState(settings?.deliveryFee?.toString() || '0');
  const [settingsPhone, setSettingsPhone] = useState(settings?.phone || '');
  const [settingsAddress, setSettingsAddress] = useState(settings?.address || '');
  const [settingsSaved, setSettingsSaved] = useState(false);

  // --- SYSTEM SETTINGS STATE (SUPER ADMIN ONLY) ---
  const [sysSettings, setSysSettings] = useState<RestaurantSettings | null>(null);
  const [sysSettingsSaved, setSysSettingsSaved] = useState(false);
  const [sysSettingsError, setSysSettingsError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('maintenance');
  
  // Coupon inline form state
  const [couponEditIndex, setCouponEditIndex] = useState<number | null>(null);
  const [couponName, setCouponName] = useState('');
  const [couponCodeStr, setCouponCodeStr] = useState('');
  const [couponDiscountType, setCouponDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [couponDiscountValue, setCouponDiscountValue] = useState(0);
  const [couponValidUntil, setCouponValidUntil] = useState('');
  const [couponMaxUses, setCouponMaxUses] = useState<string>('');
  const [couponActive, setCouponActive] = useState(true);

  // Backup status state
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Synchronize on settings load or tab selection
  useEffect(() => {
    if (settings && !sysSettings) {
      setSysSettings(settings);
    }
  }, [settings]);

  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sysSettings) return;

    try {
      setSysSettingsError(null);
      await updateSettings(sysSettings);
      setSysSettingsSaved(true);
      setTimeout(() => setSysSettingsSaved(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar as configurações do sistema:', err);
      setSysSettingsError('Erro ao gravar configurações do sistema.');
    }
  };

  const updateSysField = (field: keyof RestaurantSettings, value: any) => {
    if (!sysSettings) return;
    const updated = {
      ...sysSettings,
      [field]: value
    };
    setSysSettings(updated);

    if (field === 'primaryColor' || field === 'secondaryColor' || field === 'backgroundColor') {
      updateThemeColors(
        field === 'primaryColor' ? value : updated.primaryColor,
        field === 'secondaryColor' ? value : updated.secondaryColor,
        field === 'backgroundColor' ? value : updated.backgroundColor
      );
    }
  };

  // --- COUPON ACTIONS ---
  const handleSaveCoupon = () => {
    if (!couponCodeStr.trim() || !couponName.trim() || couponDiscountValue <= 0) return;
    if (!sysSettings) return;

    const newCoupon = {
      id: couponEditIndex !== null && couponEditIndex >= 0 && sysSettings.coupons?.[couponEditIndex]
        ? sysSettings.coupons[couponEditIndex].id
        : `cupom-${Date.now()}`,
      name: couponName,
      code: couponCodeStr.toUpperCase().trim(),
      discountType: couponDiscountType,
      discountValue: couponDiscountValue,
      validUntil: couponValidUntil,
      maxUses: couponMaxUses ? parseInt(couponMaxUses) : undefined,
      usedCount: couponEditIndex !== null && couponEditIndex >= 0 && sysSettings.coupons?.[couponEditIndex]
        ? sysSettings.coupons[couponEditIndex].usedCount
        : 0,
      active: couponActive,
    };

    const updatedCoupons = [...(sysSettings.coupons || [])];
    if (couponEditIndex !== null && couponEditIndex >= 0) {
      updatedCoupons[couponEditIndex] = newCoupon;
    } else {
      updatedCoupons.push(newCoupon);
    }

    setSysSettings({
      ...sysSettings,
      coupons: updatedCoupons,
    });

    // Reset coupon form
    setCouponEditIndex(null);
    setCouponName('');
    setCouponCodeStr('');
    setCouponDiscountType('percentage');
    setCouponDiscountValue(0);
    setCouponValidUntil('');
    setCouponMaxUses('');
    setCouponActive(true);
  };

  const handleEditCouponClick = (index: number) => {
    if (!sysSettings || !sysSettings.coupons?.[index]) return;
    const c = sysSettings.coupons[index];
    setCouponEditIndex(index);
    setCouponName(c.name);
    setCouponCodeStr(c.code);
    setCouponDiscountType(c.discountType);
    setCouponDiscountValue(c.discountValue);
    setCouponValidUntil(c.validUntil || '');
    setCouponMaxUses(c.maxUses?.toString() || '');
    setCouponActive(c.active);
  };

  const handleDeleteCoupon = (index: number) => {
    if (!sysSettings || !sysSettings.coupons) return;
    const updatedCoupons = sysSettings.coupons.filter((_, i) => i !== index);
    setSysSettings({
      ...sysSettings,
      coupons: updatedCoupons,
    });
  };

  const handleCancelCouponEdit = () => {
    setCouponEditIndex(null);
    setCouponName('');
    setCouponCodeStr('');
    setCouponDiscountType('percentage');
    setCouponDiscountValue(0);
    setCouponValidUntil('');
    setCouponMaxUses('');
    setCouponActive(true);
  };

  // --- BACKUP ACTIONS ---
  const handleExportBackup = () => {
    if (!sysSettings) return;
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sysSettings, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `maestria_grill_settings_backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setBackupMessage({ type: 'success', text: 'Backup exportado com sucesso!' });
      setTimeout(() => setBackupMessage(null), 3000);
    } catch (err) {
      setBackupMessage({ type: 'error', text: 'Erro ao exportar backup.' });
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBackupMessage(null);
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && typeof parsed === 'object' && 'name' in parsed) {
            setSysSettings({
              ...parsed,
              lastBackupDate: new Date().toLocaleDateString('pt-BR'),
            });
            setBackupMessage({ type: 'success', text: 'Backup carregado! Clique em "Gravar Configurações" para salvar permanentemente.' });
          } else {
            setBackupMessage({ type: 'error', text: 'Arquivo inválido. Formato de backup incorreto.' });
          }
        } catch (err) {
          setBackupMessage({ type: 'error', text: 'Erro ao processar arquivo de backup.' });
        }
      };
    }
  };

  // --- DELETE CONFIRMATION STATE ---
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
    type: 'product' | 'category';
  } | null>(null);

  const handleExecuteDelete = async () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'product') {
      await deleteProduct(deleteConfirm.id);
    } else if (deleteConfirm.type === 'category') {
      await deleteCategory(deleteConfirm.id);
      if (editingCategory?.id === deleteConfirm.id) {
        setEditingCategory(null);
        setEditingCatName('');
        setEditingCatImage('');
      }
    }
    setDeleteConfirm(null);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsName) return;

    await updateSettings({
      name: settingsName,
      description: settingsDesc,
      logoUrl: settingsLogo,
      bannerUrl: settingsBanner,
      deliveryFee: parseFloat(settingsFee) || 0,
      phone: settingsPhone,
      address: settingsAddress,
    });

    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-transparent pb-28">
      {/* Admin Title bar */}
      <div className="bg-white/20 backdrop-blur-md px-4 py-4 border-b border-white/20">
        <div className="mx-auto max-w-lg flex items-center justify-between">
          <div>
            <h2 className="font-sans text-lg font-extrabold text-gray-900">Painel Administrativo</h2>
            <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wider">Fase 1 (MVP) &bull; Demonstração</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 items-center gap-1.5 rounded-full bg-orange-500/10 border border-orange-500/15 px-2.5 py-0.5 text-[10px] font-bold text-orange-600">
              <Sparkles className="h-3.5 w-3.5" />
              Admin Ativo
            </span>
          </div>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="border-b border-white/20 bg-white/20 backdrop-blur-md overflow-x-auto whitespace-nowrap scrollbar-none">
        <div className="mx-auto max-w-lg px-2 flex justify-start min-w-max">
          <button
            onClick={() => setActiveTab('orders')}
            id="tab-btn-orders"
            className={`flex flex-col items-center justify-center py-3.5 px-3 border-b-2 text-xs font-bold transition-all ${
              activeTab === 'orders'
                ? 'border-orange-500 text-orange-600 font-extrabold'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <ListOrdered className="h-4.5 w-4.5 mb-1" />
            Pedidos ({activeOrders.length})
          </button>

          <button
            onClick={() => setActiveTab('products')}
            id="tab-btn-products"
            className={`flex flex-col items-center justify-center py-3.5 px-3 border-b-2 text-xs font-bold transition-all ${
              activeTab === 'products'
                ? 'border-orange-500 text-orange-600 font-extrabold'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <Utensils className="h-4.5 w-4.5 mb-1" />
            Produtos
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            id="tab-btn-categories"
            className={`flex flex-col items-center justify-center py-3.5 px-3 border-b-2 text-xs font-bold transition-all ${
              activeTab === 'categories'
                ? 'border-orange-500 text-orange-600 font-extrabold'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <FolderOpen className="h-4.5 w-4.5 mb-1" />
            Categorias
          </button>

          <button
            onClick={() => setActiveTab('employees')}
            id="tab-btn-employees"
            className={`flex flex-col items-center justify-center py-3.5 px-3 border-b-2 text-xs font-bold transition-all ${
              activeTab === 'employees'
                ? 'border-orange-500 text-orange-600 font-extrabold'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <Users className="h-4.5 w-4.5 mb-1" />
            Equipe
          </button>

          <button
            onClick={() => setActiveTab('chats')}
            id="tab-btn-chats"
            className={`flex flex-col items-center justify-center py-3.5 px-3 border-b-2 text-xs font-bold transition-all ${
              activeTab === 'chats'
                ? 'border-orange-500 text-orange-600 font-extrabold'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <MessageSquare className="h-4.5 w-4.5 mb-1" />
            Central de Chats
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            id="tab-btn-settings"
            className={`flex flex-col items-center justify-center py-3.5 px-3 border-b-2 text-xs font-bold transition-all ${
              activeTab === 'settings'
                ? 'border-orange-500 text-orange-600 font-extrabold'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <Settings className="h-4.5 w-4.5 mb-1" />
            Ajustes
          </button>

          {profile?.role === 'superadmin' && (
            <button
              onClick={() => setActiveTab('systemSettings')}
              id="tab-btn-system-settings"
              className={`flex flex-col items-center justify-center py-3.5 px-3 border-b-2 text-xs font-bold transition-all ${
                activeTab === 'systemSettings'
                  ? 'border-orange-500 text-orange-600 font-extrabold'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Sparkles className="h-4.5 w-4.5 mb-1 text-rose-500 animate-pulse" />
              ⚙️ Sistema
            </button>
          )}
        </div>
      </div>

      <div className={`mx-auto px-4 py-5 transition-all duration-300 ${activeTab === 'chats' ? 'max-w-6xl' : 'max-w-lg'}`}>
        <AnimatePresence mode="wait">
          {/* ======================================= */}
          {/* 1. ORDERS TAB */}
          {/* ======================================= */}
          {activeTab === 'orders' && (
            <motion.div
              key="orders-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4"
            >
              {/* Order Status Filters & Instant Refresh */}
              <div className="flex items-center justify-between gap-2 pb-2">
                <div className="overflow-x-auto flex gap-1.5 scrollbar-none flex-1">
                  {['all', 'pending', 'preparing', 'ready', 'delivered'].map((f) => (
                    <button
                      key={f}
                      id={`filter-order-${f}`}
                      onClick={() => setSelectedOrderStatusFilter(f)}
                      className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${
                        selectedOrderStatusFilter === f
                          ? 'bg-gray-950 text-white'
                          : 'bg-white/40 border border-white/30 text-gray-600 hover:bg-white/60'
                      }`}
                    >
                      {f === 'all' ? 'Todos' : getStatusLabel(f as OrderStatus)}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    setIsRefreshingOrders(true);
                    await refreshData();
                    setTimeout(() => setIsRefreshingOrders(false), 600);
                  }}
                  disabled={isRefreshingOrders}
                  title="Atualizar lista de pedidos agora"
                  className="flex-shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-bold bg-white/50 border border-white/40 text-gray-700 hover:bg-white/80 transition flex items-center gap-1.5 shadow-2xs"
                >
                  <RotateCw className={`h-3 w-3 text-orange-600 ${isRefreshingOrders ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Atualizar</span>
                </button>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl bg-white/40 backdrop-blur-md border border-white/30 py-16 px-4 text-center">
                  <ListOrdered className="h-10 w-10 text-gray-300" />
                  <h3 className="mt-4 text-sm font-bold text-gray-800">Nenhum pedido</h3>
                  <p className="mt-1 text-xs text-gray-400">Pedidos feitos pelo cardápio aparecerão aqui instantaneamente.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {filteredOrders.map((order) => (
                    <div
                      key={order.id}
                      id={`order-card-${order.id}`}
                      className="rounded-3xl border border-white/35 bg-white/40 backdrop-blur-md p-5 shadow-sm"
                    >
                      {/* Order Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400">PEDIDO</span>
                          <h4 className="font-sans text-sm font-extrabold text-gray-900">{order.id}</h4>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getOrderStatusBadgeStyle(order)}`}>
                          {getOrderStatusText(order)}
                        </span>
                      </div>

                      {/* Customer Details */}
                      <div className="mt-4 flex flex-col gap-1.5 text-xs text-gray-600 border-t border-b border-white/20 py-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-800">{order.customerName}</span>
                          {order.tipoPedido === 'retirada' ? (
                            <span className="flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-500/15">
                              🏪 Retirada
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 rounded-md bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-700 border border-orange-500/15">
                              📦 Entrega
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          <span>{order.customerPhone}</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                          {order.tipoPedido === 'retirada' ? (
                            <span className="font-semibold text-purple-700">Cliente irá retirar no local.</span>
                          ) : (
                            <span className="leading-tight">
                              {typeof order.endereco === 'object' && order.endereco !== null ? (
                                <>
                                  {(order.endereco as any).street}, nº {(order.endereco as any).number}
                                  {(order.endereco as any).complement && ` - ${(order.endereco as any).complement}`}
                                  <br />
                                  {(order.endereco as any).neighborhood}, {(order.endereco as any).city} - CEP {(order.endereco as any).cep}
                                  {(order.endereco as any).reference && (
                                    <span className="block text-[10px] text-gray-400 font-medium mt-0.5">
                                      Ref: {(order.endereco as any).reference}
                                    </span>
                                  )}
                                </>
                              ) : (
                                order.address || 'Endereço não informado'
                              )}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 font-semibold text-gray-400 text-[10px]">
                          <span>Feito em: {formatDate(order.createdAt)}</span>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="mt-3">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Itens do Pedido</span>
                        <div className="flex flex-col gap-2">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs font-semibold">
                              <span className="text-gray-800 font-medium">
                                <span className="text-orange-600 font-bold">{item.quantity}x</span> {item.productName}
                              </span>
                              <span className="text-gray-600">{formatPrice(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Financial values summary */}
                      <div className="mt-4 border-t border-dashed border-white/25 pt-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center flex-wrap gap-1">
                          <span className="text-[10px] text-gray-400 font-medium uppercase">Forma de pag.:</span>
                          <span className="text-[10px] font-extrabold text-gray-800 uppercase">{getPaymentMethodDisplay(order)}</span>
                          {renderPaymentBadge(order)}
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 font-medium uppercase block">Total:</span>
                          <span className="font-sans text-sm font-extrabold text-orange-600">{formatPrice(order.valorTotal || order.total)}</span>
                        </div>
                      </div>

                      {/* Order Action/Transition triggers */}
                      <div className="mt-4.5 flex gap-2 pt-1 border-t border-white/20">
                        {order.tipoPedido === 'entrega' && order.motoboyId && (
                          <ChatButtonWithBadge
                            orderId={order.id}
                            onClick={() => setSelectedChatOrder(order)}
                            size="icon"
                            variant="outline"
                          />
                        )}

                        {(order.status === 'pending' || order.status === 'awaiting_payment') && (() => {
                          const isOnline = order.paymentMethod === 'mercadopago';
                          const isPaid = order.paymentStatus === 'paid' || order.statusPagamento === 'pago' || order.mercadopagoStatus === 'approved';
                          const isRefused = order.paymentStatus === 'refused' || order.paymentStatus === 'cancelled' || order.mercadopagoStatus === 'rejected';

                          // 1. Mercado Pago pendente ou recusado (não permitir Aceitar e Preparar)
                          if (isOnline && !isPaid) {
                            if (isRefused) {
                              return (
                                <div className="flex-1 flex items-center justify-between gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs">
                                  <span className="text-[11px] font-extrabold text-rose-700 flex items-center gap-1.5">
                                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                                    🔴 Pagamento online recusado
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRefusingOrderId(order.id);
                                      setRefusalReason('Pagamento online recusado');
                                    }}
                                    id={`btn-status-refuse-${order.id}`}
                                    className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline cursor-pointer"
                                  >
                                    Recusar Pedido
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <div className="flex-1 flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                                <span className="text-[11px] font-extrabold text-amber-800 flex items-center gap-1.5">
                                  <Clock className="h-4 w-4 shrink-0 text-amber-600 animate-pulse" />
                                  🟠 Aguardando confirmação do pagamento online
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRefusingOrderId(order.id);
                                    setRefusalReason('Cancelado: Pagamento online não concluído');
                                  }}
                                  id={`btn-status-refuse-${order.id}`}
                                  className="flex items-center gap-1 bg-white/80 border border-amber-300 text-gray-700 rounded-lg px-2.5 py-1 text-[10px] font-bold hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition cursor-pointer"
                                  title="Recusar ou Cancelar Pedido"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Recusar
                                </button>
                              </div>
                            );
                          }

                          // 2. Pedidos liberados para Aceitar e Preparar (Pagamento na Entrega, Balcão ou Mercado Pago Pago)
                          return (
                            <div className="flex-1 flex gap-2 w-full">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isOnline && !isPaid) {
                                    alert('O pagamento online ainda não foi confirmado.');
                                    return;
                                  }
                                  setConfirmStatusModal({
                                    isOpen: true,
                                    orderId: order.id,
                                    targetStatus: 'preparing',
                                    title: 'Aceitar e Preparar Pedido',
                                    message: `Deseja aceitar o Pedido #${order.id} e alterar o status para "Em Preparo"?`,
                                    confirmLabel: 'Aceitar e Preparar',
                                    variant: 'orange'
                                  });
                                }}
                                id={`btn-status-preparing-${order.id}`}
                                className="flex-1 flex items-center justify-center gap-1 bg-orange-600 text-white rounded-xl py-2.5 text-xs font-bold hover:bg-orange-700 transition shadow-sm active:scale-95 cursor-pointer"
                              >
                                <Check className="h-4 w-4" />
                                Aceitar e Preparar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRefusingOrderId(order.id);
                                  setRefusalReason('');
                                }}
                                id={`btn-status-refuse-${order.id}`}
                                className="flex-1 flex items-center justify-center gap-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl py-2.5 text-xs font-bold hover:bg-rose-100 transition cursor-pointer"
                              >
                                <X className="h-4 w-4" />
                                Recusar Pedido
                              </button>
                            </div>
                          );
                        })()}
                        {order.status === 'refused' && (
                          <div className="flex-1 flex flex-col gap-1.5 p-3 rounded-xl bg-red-500/5 border border-red-500/15">
                            <div className="flex items-center gap-1.5 text-red-700 text-xs font-bold">
                              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                              <span>Pedido Recusado</span>
                            </div>
                            {order.motivoRecusa && (
                              <p className="text-[10px] text-gray-500 font-medium leading-normal">
                                <strong>Motivo:</strong> {order.motivoRecusa}
                              </p>
                            )}
                          </div>
                        )}
                        {order.status === 'preparing' && (
                          <div className="flex-1 flex gap-2 w-full">
                            <button
                              onClick={() => {
                                setConfirmStatusModal({
                                  isOpen: true,
                                  orderId: order.id,
                                  targetStatus: 'ready',
                                  title: 'Marcar Pedido como Pronto',
                                  message: `Deseja alterar o status do Pedido #${order.id} para "Pronto"? O pedido ficará disponível para os motoboys para entrega.`,
                                  confirmLabel: 'Marcar como Pronto',
                                  variant: 'blue'
                                });
                              }}
                              id={`btn-status-ready-${order.id}`}
                              className="flex-1 flex items-center justify-center gap-1 bg-blue-600 text-white rounded-xl py-2.5 text-xs font-bold hover:bg-blue-700 transition"
                            >
                              <Check className="h-4 w-4" />
                              Marcar como Pronto
                            </button>
                            <button
                              onClick={() => {
                                setRefusingOrderId(order.id);
                                setRefusalReason('');
                              }}
                              id={`btn-status-cancel-${order.id}`}
                              className="flex items-center justify-center gap-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl py-2.5 px-3.5 text-xs font-bold hover:bg-rose-100 transition"
                            >
                              <X className="h-4 w-4" />
                              Cancelar Pedido
                            </button>
                          </div>
                        )}
                        {order.status === 'ready' && order.tipoPedido === 'entrega' && (
                          <div className="flex flex-col gap-3.5 w-full">
                            {/* Motoboy Header Info */}
                            <div className="flex items-center justify-between p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 text-white font-bold text-sm shadow-sm">
                                  🏍️
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Motoboy Responsável</span>
                                  <p className="text-xs font-extrabold text-gray-900">
                                    {order.motoboyId
                                      ? (usersList.find(u => u.uid === order.motoboyId)?.name || 'Motoboy Atribuído')
                                      : 'Nenhum motoboy aceitou ainda'}
                                  </p>
                                  {order.motoboyId && usersList.find(u => u.uid === order.motoboyId)?.phone && (
                                    <p className="text-[10px] text-gray-500 font-medium">
                                      {usersList.find(u => u.uid === order.motoboyId)?.phone}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {order.motoboyId && (
                                <ChatButtonWithBadge
                                  orderId={order.id}
                                  onClick={() => setSelectedChatOrder(order)}
                                  size="icon"
                                  variant="outline"
                                />
                              )}
                            </div>

                            {/* Motoboy Delivery Timeline / Status Tracker */}
                            <div className="p-3.5 rounded-2xl bg-white/50 border border-white/30 backdrop-blur-sm">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1">
                                <Truck className="h-3.5 w-3.5 text-orange-600" />
                                Acompanhamento de Entrega em Tempo Real
                              </div>

                              <div className="grid grid-cols-4 gap-1 relative my-2">
                                {/* Step 1: Aceito */}
                                <div className={`flex flex-col items-center text-center gap-1 ${
                                  order.statusEntrega === 'aceito' || order.statusEntrega === 'retirado' || order.statusEntrega === 'a_caminho' || order.statusEntrega === 'entregue' || order.status === 'delivered'
                                    ? 'text-sky-700 font-bold'
                                    : 'text-gray-300 font-medium'
                                }`}>
                                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] ${
                                    order.statusEntrega === 'aceito' || order.statusEntrega === 'retirado' || order.statusEntrega === 'a_caminho' || order.statusEntrega === 'entregue' || order.status === 'delivered'
                                      ? 'bg-sky-600 text-white font-black shadow-sm'
                                      : 'bg-gray-200 text-gray-400'
                                  }`}>
                                    1
                                  </div>
                                  <span className="text-[9px] leading-tight">Aceito</span>
                                </div>

                                {/* Step 2: Retirado */}
                                <div className={`flex flex-col items-center text-center gap-1 ${
                                  order.statusEntrega === 'retirado' || order.statusEntrega === 'a_caminho' || order.statusEntrega === 'entregue' || order.status === 'delivered'
                                    ? 'text-indigo-700 font-bold'
                                    : 'text-gray-300 font-medium'
                                }`}>
                                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] ${
                                    order.statusEntrega === 'retirado' || order.statusEntrega === 'a_caminho' || order.statusEntrega === 'entregue' || order.status === 'delivered'
                                      ? 'bg-indigo-600 text-white font-black shadow-sm'
                                      : 'bg-gray-200 text-gray-400'
                                  }`}>
                                    2
                                  </div>
                                  <span className="text-[9px] leading-tight">Retirado</span>
                                </div>

                                {/* Step 3: Em Trânsito */}
                                <div className={`flex flex-col items-center text-center gap-1 ${
                                  order.statusEntrega === 'a_caminho' || order.statusEntrega === 'entregue' || order.status === 'delivered'
                                    ? 'text-amber-700 font-bold'
                                    : 'text-gray-300 font-medium'
                                }`}>
                                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] ${
                                    order.statusEntrega === 'a_caminho' || order.statusEntrega === 'entregue' || order.status === 'delivered'
                                      ? 'bg-amber-600 text-white font-black shadow-sm'
                                      : 'bg-gray-200 text-gray-400'
                                  }`}>
                                    3
                                  </div>
                                  <span className="text-[9px] leading-tight">A Caminho</span>
                                </div>

                                {/* Step 4: Entregue */}
                                <div className={`flex flex-col items-center text-center gap-1 ${
                                  order.statusEntrega === 'entregue' || order.status === 'delivered'
                                    ? 'text-emerald-700 font-bold'
                                    : 'text-gray-300 font-medium'
                                }`}>
                                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] ${
                                    order.statusEntrega === 'entregue' || order.status === 'delivered'
                                      ? 'bg-emerald-600 text-white font-black shadow-sm'
                                      : 'bg-gray-200 text-gray-400'
                                  }`}>
                                    4
                                  </div>
                                  <span className="text-[9px] leading-tight">Entregue</span>
                                </div>
                              </div>

                              {/* Detail description box */}
                              <div className="mt-2.5 p-2.5 rounded-xl bg-orange-50/80 border border-orange-100 text-[11px] text-orange-950 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-orange-600 shrink-0" />
                                <div>
                                  {!order.motoboyId && 'Aguardando algum motoboy aceitar a corrida no aplicativo.'}
                                  {order.motoboyId && order.statusEntrega === 'aceito' && 'Motoboy aceitou a corrida e está a caminho do restaurante para retirar o pedido.'}
                                  {order.motoboyId && order.statusEntrega === 'retirado' && 'Motoboy retirou o pedido na cozinha e está organizando a bag.'}
                                  {order.motoboyId && order.statusEntrega === 'a_caminho' && 'Motoboy está em trânsito indo ao endereço do cliente.'}
                                  {order.motoboyId && order.statusEntrega === 'entregue' && 'Entrega realizada com sucesso pelo motoboy.'}
                                </div>
                              </div>
                            </div>

                            {/* Manual Override Action Buttons (Finalize or Cancel) */}
                            <div className="flex gap-2 w-full">
                              <button
                                onClick={() => {
                                  setConfirmStatusModal({
                                    isOpen: true,
                                    orderId: order.id,
                                    targetStatus: 'delivered',
                                    title: 'Finalizar Pedido Manualmente',
                                    message: `Deseja finalizar manualmente o Pedido #${order.id} e alterar o status para "Entregue"?`,
                                    confirmLabel: 'Finalizar Pedido',
                                    variant: 'emerald'
                                  });
                                }}
                                id={`btn-status-delivered-${order.id}`}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300/70 rounded-xl py-2 px-3 text-xs font-bold transition"
                              >
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                Finalizar Entrega Manualmente
                              </button>

                              <button
                                onClick={() => {
                                  setRefusingOrderId(order.id);
                                  setRefusalReason('');
                                }}
                                id={`btn-status-cancel-delivery-${order.id}`}
                                className="flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl py-2 px-3 text-xs font-bold transition"
                              >
                                <X className="h-4 w-4 text-rose-600 shrink-0" />
                                Cancelar Entrega / Pedido
                              </button>
                            </div>
                          </div>
                        )}

                        {order.status === 'ready' && order.tipoPedido === 'retirada' && (
                          <div className="flex-1 flex gap-2 w-full">
                            <button
                              onClick={() => {
                                setConfirmStatusModal({
                                  isOpen: true,
                                  orderId: order.id,
                                  targetStatus: 'delivered',
                                  title: 'Finalizar Retirada no Balcão',
                                  message: `O cliente retirou o Pedido #${order.id}? Clique para marcar como concluído.`,
                                  confirmLabel: 'Marcar como Retirado',
                                  variant: 'emerald'
                                });
                              }}
                              id={`btn-status-delivered-${order.id}`}
                              className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 text-white rounded-xl py-2.5 text-xs font-bold hover:bg-emerald-700 transition"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Marcar como Retirado pelo Cliente
                            </button>
                            <button
                              onClick={() => {
                                setRefusingOrderId(order.id);
                                setRefusalReason('');
                              }}
                              id={`btn-status-cancel-pickup-${order.id}`}
                              className="flex items-center justify-center gap-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl py-2.5 px-3.5 text-xs font-bold hover:bg-rose-100 transition"
                            >
                              <X className="h-4 w-4" />
                              Cancelar Pedido
                            </button>
                          </div>
                        )}
                        {order.status === 'delivered' && (
                          <div className="flex-1 flex items-center justify-center gap-1 bg-white/20 border border-white/20 text-gray-500 rounded-xl py-2.5 text-xs font-bold">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            Pedido Entregue
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ======================================= */}
          {/* 2. PRODUCTS TAB */}
          {/* ======================================= */}
          {activeTab === 'products' && (
            <motion.div
              key="products-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4"
            >
              {/* Add Product Button */}
              {!showProductForm && (
                <button
                  onClick={handleOpenAddProduct}
                  id="btn-admin-add-product"
                  className="flex items-center justify-center gap-1.5 rounded-2xl bg-orange-600 py-3.5 text-xs font-bold text-white shadow-md shadow-orange-500/10 hover:bg-orange-700 transition"
                >
                  <Plus className="h-4.5 w-4.5" />
                  Cadastrar Novo Produto
                </button>
              )}

              {/* Product Form Drawer/Panel */}
              {showProductForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="rounded-3xl border border-white/35 bg-white/40 backdrop-blur-md p-5 shadow-sm"
                >
                  <h3 className="font-sans text-sm font-extrabold text-gray-900 mb-4">
                    {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                  </h3>

                  <form onSubmit={handleSaveProduct} className="flex flex-col gap-3.5">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nome do Produto</label>
                      <input
                        type="text"
                        required
                        id="form-prod-name"
                        value={prodName}
                        onChange={(e) => setProdName(e.target.value)}
                        placeholder="Ex: Hambúrguer de Costela"
                        className="w-full rounded-xl border border-white/30 bg-white/45 py-2.5 px-3.5 text-xs text-gray-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Descrição</label>
                      <textarea
                        id="form-prod-desc"
                        value={prodDesc}
                        onChange={(e) => setProdDesc(e.target.value)}
                        placeholder="Ingredientes, modo de preparo..."
                        rows={2}
                        className="w-full rounded-xl border border-white/30 bg-white/45 py-2.5 px-3.5 text-xs text-gray-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Preço (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          id="form-prod-price"
                          value={prodPrice}
                          onChange={(e) => setProdPrice(e.target.value)}
                          placeholder="39.90"
                          className="w-full rounded-xl border border-white/30 bg-white/45 py-2.5 px-3.5 text-xs text-gray-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Categoria</label>
                        <select
                          id="form-prod-category"
                          value={prodCategory}
                          onChange={(e) => setProdCategory(e.target.value)}
                          className="w-full rounded-xl border border-white/30 bg-white/45 py-2.5 px-3.5 text-xs text-gray-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <ImageUploader
                        label="Foto do Produto"
                        value={prodImage}
                        onChange={(url) => setProdImage(url)}
                        bucket="product-images"
                        required
                      />
                    </div>

                    <div className="flex items-center gap-3 py-1.5">
                      <button
                        type="button"
                        id="form-btn-toggle-active"
                        onClick={() => setProdActive(!prodActive)}
                        className="text-orange-600"
                      >
                        {prodActive ? <ToggleRight className="h-7 w-7" /> : <ToggleLeft className="h-7 w-7 text-gray-400" />}
                      </button>
                      <span className="text-xs font-semibold text-gray-600">Disponível em estoque (Ativo)</span>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        type="submit"
                        id="form-btn-submit"
                        className="flex-1 rounded-xl bg-orange-600 py-3 text-xs font-bold text-white hover:bg-orange-700 transition"
                      >
                        Salvar Produto
                      </button>
                      <button
                        type="button"
                        id="form-btn-cancel"
                        onClick={() => setShowProductForm(false)}
                        className="rounded-xl border border-white/30 bg-white/20 px-4 py-3 text-xs font-bold text-gray-500 hover:bg-white/45 transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Products list items */}
              <div className="flex flex-col gap-3">
                {products.map((p) => {
                  const cat = categories.find((c) => c.id === p.categoryId);
                  return (
                    <div
                      key={p.id}
                      id={`admin-prod-${p.id}`}
                      className="rounded-2xl border border-white/35 bg-white/40 backdrop-blur-md p-3 shadow-sm flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="h-12 w-12 rounded-xl object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <h4 className="font-sans text-xs font-bold text-gray-900 leading-tight">{p.name}</h4>
                          <span className="inline-block text-[9px] font-bold text-orange-600 bg-orange-500/10 px-1.5 py-0.5 rounded-md mt-0.5">
                            {cat ? cat.name : 'Sem categoria'}
                          </span>
                          <span className="text-xs font-bold text-gray-500 ml-2">{formatPrice(p.price)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Quick stock toggler */}
                        <button
                          onClick={() => handleToggleProductActive(p)}
                          id={`btn-quick-toggle-${p.id}`}
                          className="p-1.5 text-gray-400 hover:text-gray-600"
                          title={p.active ? 'Marcar como esgotado' : 'Disponibilizar'}
                        >
                          {p.active ? (
                            <ToggleRight className="h-6 w-6 text-orange-500" />
                          ) : (
                            <ToggleLeft className="h-6 w-6 text-gray-300" />
                          )}
                        </button>

                        <button
                          onClick={() => handleOpenEditProduct(p)}
                          id={`btn-edit-prod-${p.id}`}
                          className="p-1.5 rounded-lg border border-white/20 text-gray-500 hover:bg-white/45 hover:text-gray-900 transition"
                          title="Editar"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        
                        <button
                          onClick={() => {
                            setDeleteConfirm({
                              id: p.id,
                              name: p.name,
                              type: 'product'
                            });
                          }}
                          id={`btn-delete-prod-${p.id}`}
                          className="p-1.5 rounded-lg border border-white/20 text-gray-400 hover:bg-rose-500/10 hover:text-rose-600 transition"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ======================================= */}
          {/* 3. CATEGORIES TAB */}
          {/* ======================================= */}
          {activeTab === 'categories' && (
            <motion.div
              key="categories-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4"
            >
              <div className="rounded-3xl border border-white/35 bg-white/40 backdrop-blur-md p-5 shadow-sm">
                <h3 className="font-sans text-sm font-extrabold text-gray-900 mb-3">
                  {editingCategory ? 'Editar Categoria' : 'Criar Nova Categoria'}
                </h3>
                
                <form onSubmit={editingCategory ? handleEditCategory : handleCreateCategory} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="form-cat-name" className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Nome da Categoria</label>
                      <input
                        type="text"
                        required
                        id="form-cat-name"
                        value={editingCategory ? editingCatName : newCatName}
                        onChange={(e) => {
                          if (editingCategory) {
                            setEditingCatName(e.target.value);
                          } else {
                            setNewCatName(e.target.value);
                          }
                        }}
                        placeholder="Ex: Pizzas, Caldos, Massas..."
                        className="rounded-xl border border-white/30 bg-white/45 py-2.5 px-3.5 text-xs text-gray-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <ImageUploader
                        label="Foto da Categoria"
                        value={editingCategory ? editingCatImage : newCatImage}
                        onChange={(url) => {
                          if (editingCategory) {
                            setEditingCatImage(url);
                          } else {
                            setNewCatImage(url);
                          }
                        }}
                        bucket="category-images"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    {editingCategory && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategory(null);
                          setEditingCatName('');
                          setEditingCatImage('');
                        }}
                        className="rounded-xl border border-white/30 bg-white/20 py-2.5 px-4 text-xs font-bold text-gray-500 hover:bg-white/45 transition"
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      type="submit"
                      id="form-cat-submit"
                      className="rounded-xl bg-orange-600 py-2.5 px-5 text-xs font-bold text-white hover:bg-orange-700 transition"
                    >
                      {editingCategory ? 'Salvar Alterações' : 'Adicionar Categoria'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Categories list */}
              <div className="rounded-3xl border border-white/35 bg-white/40 backdrop-blur-md p-5 shadow-sm">
                <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Categorias Existentes</h3>
                <div className="divide-y divide-white/20">
                  {categories.map((c) => (
                    <div key={c.id} className="flex justify-between items-center py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-white/50 border border-white/30 flex items-center justify-center overflow-hidden shrink-0">
                          {c.image ? (
                            <img src={c.image} alt={c.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-sm font-bold text-gray-400">{c.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-800">{c.name}</span>
                          <span className="text-[10px] text-gray-400 font-mono font-medium">/{c.slug}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingCategory(c);
                            setEditingCatName(c.name);
                            setEditingCatImage(c.image || '');
                          }}
                          id={`btn-edit-cat-${c.id}`}
                          className="p-1.5 rounded-lg border border-white/20 text-gray-500 hover:bg-white/45 hover:text-gray-900 transition"
                          title="Editar Categoria"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteConfirm({
                              id: c.id,
                              name: c.name,
                              type: 'category'
                            });
                          }}
                          id={`btn-delete-cat-${c.id}`}
                          className="p-1.5 rounded-lg border border-white/20 text-gray-400 hover:bg-rose-500/10 hover:text-rose-600 transition"
                          title="Excluir Categoria"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ======================================= */}
          {/* 4. SETTINGS TAB */}
          {/* ======================================= */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4"
            >
              <div className="rounded-3xl border border-white/35 bg-white/40 backdrop-blur-md p-5 shadow-sm">
                <h3 className="font-sans text-sm font-extrabold text-gray-900 mb-4">Configuração do Restaurante</h3>

                <form onSubmit={handleSaveSettings} className="flex flex-col gap-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nome do Restaurante</label>
                    <input
                      type="text"
                      required
                      id="form-settings-name"
                      value={settingsName}
                      onChange={(e) => setSettingsName(e.target.value)}
                      placeholder="Gourmet Bistro"
                      className="w-full rounded-xl border border-white/30 bg-white/45 py-2.5 px-3.5 text-xs text-gray-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Descrição Comercial</label>
                    <textarea
                      id="form-settings-desc"
                      value={settingsDesc}
                      onChange={(e) => setSettingsDesc(e.target.value)}
                      rows={2}
                      placeholder="Digite um slogan cativante..."
                      className="w-full rounded-xl border border-white/30 bg-white/45 py-2.5 px-3.5 text-xs text-gray-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ícone / Logo (Emoji)</label>
                      <input
                        type="text"
                        id="form-settings-logo"
                        value={settingsLogo}
                        onChange={(e) => setSettingsLogo(e.target.value)}
                        placeholder="🍔"
                        className="w-full rounded-xl border border-white/30 bg-white/45 py-2.5 px-3.5 text-xs text-gray-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Taxa de Entrega (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        id="form-settings-fee"
                        value={settingsFee}
                        onChange={(e) => setSettingsFee(e.target.value)}
                        placeholder="7.00"
                        className="w-full rounded-xl border border-white/30 bg-white/45 py-2.5 px-3.5 text-xs text-gray-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Telefone de Contato</label>
                    <input
                      type="text"
                      id="form-settings-phone"
                      value={settingsPhone}
                      onChange={(e) => setSettingsPhone(e.target.value)}
                      placeholder="(11) 99999-8888"
                      className="w-full rounded-xl border border-white/30 bg-white/45 py-2.5 px-3.5 text-xs text-gray-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Endereço Físico</label>
                    <input
                      type="text"
                      id="form-settings-address"
                      value={settingsAddress}
                      onChange={(e) => setSettingsAddress(e.target.value)}
                      placeholder="Av. Paulista, 1000 - São Paulo"
                      className="w-full rounded-xl border border-white/30 bg-white/45 py-2.5 px-3.5 text-xs text-gray-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                    />
                  </div>

                  <div>
                    <ImageUploader
                      label="Imagem do Banner"
                      value={settingsBanner}
                      onChange={(url) => setSettingsBanner(url)}
                      bucket="restaurant-images"
                    />
                  </div>

                  {settingsSaved && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-xl bg-emerald-50 text-emerald-700 text-center py-2 text-xs font-bold"
                    >
                      Configurações gravadas com sucesso!
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    id="form-settings-submit"
                    className="rounded-xl bg-orange-600 py-3 text-xs font-bold text-white hover:bg-orange-700 transition mt-2"
                  >
                    Gravar Configurações
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* ======================================= */}
          {/* 5. EMPLOYEES TAB */}
          {/* ======================================= */}
          {activeTab === 'employees' && (
            <motion.div
              key="employees-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4"
            >
              {/* Header with quick stats */}
              <div className="bg-white/45 backdrop-blur-md rounded-3xl p-5 border border-white/30 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-sans text-sm font-extrabold text-gray-900">
                      Funcionários & Motoboys
                    </h3>
                    <p className="text-[10px] text-gray-500 font-medium">Controle de papéis, ativação e status da equipe</p>
                  </div>
                  <button
                    onClick={fetchUsers}
                    type="button"
                    className="text-[10px] font-bold text-orange-600 hover:text-orange-700 bg-orange-500/10 rounded-full px-3 py-1 border border-orange-500/15"
                  >
                    Atualizar
                  </button>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/40 p-3 rounded-2xl border border-white/20 text-center">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total Equipe</p>
                    <p className="text-base font-extrabold text-gray-900 mt-0.5">{usersList.length}</p>
                  </div>
                  <div className="bg-white/40 p-3 rounded-2xl border border-white/20 text-center">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Motoboys</p>
                    <p className="text-base font-extrabold text-orange-600 mt-0.5">
                      {usersList.filter(u => u.role === 'motoboy').length}
                    </p>
                  </div>
                  <div className="bg-white/40 p-3 rounded-2xl border border-white/20 text-center">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Online</p>
                    <p className="text-base font-extrabold text-emerald-600 mt-0.5">
                      {usersList.filter(u => u.role === 'motoboy' && u.online).length}
                    </p>
                  </div>
                </div>

                {/* Search & Filter */}
                <div className="flex flex-col gap-2.5">
                  <input
                    type="text"
                    placeholder="Buscar por nome ou e-mail..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3.5 text-xs text-gray-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                  />
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {['all', 'cliente', 'motoboy', 'admin', 'superadmin'].map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setRoleFilter(role as any)}
                        className={`flex-shrink-0 rounded-full px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                          roleFilter === role
                            ? 'bg-orange-600 text-white'
                            : 'bg-white/40 border border-white/30 text-gray-600 hover:bg-white/60'
                        }`}
                      >
                        {role === 'all'
                          ? 'Todos'
                          : role === 'cliente'
                          ? 'Clientes'
                          : role === 'motoboy'
                          ? 'Motoboys'
                          : role === 'admin'
                          ? 'Admins'
                          : 'Super Admins'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Users list container */}
              {loadingUsers ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white/30 rounded-3xl border border-white/20">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Sincronizando equipe...</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {usersList
                    .filter((u) => {
                      const matchesSearch =
                        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        u.email?.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesRole = roleFilter === 'all' || u.role === roleFilter || (!u.role && roleFilter === 'cliente');
                      return matchesSearch && matchesRole;
                    })
                    .map((employee) => {
                      const deliveries = getDeliveryCount(employee.id);
                      const isMotoboy = employee.role === 'motoboy';
                      const isActive = employee.active !== false; // Default to active if undefined

                      return (
                        <div
                          key={employee.id}
                          className="bg-white/45 backdrop-blur-md rounded-3xl p-4 border border-white/30 flex flex-col gap-3 shadow-sm hover:shadow-md transition"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-sans text-xs font-extrabold text-gray-900">
                                  {employee.name}
                                </h4>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                                    employee.role === 'superadmin'
                                      ? 'bg-rose-100 text-rose-700'
                                      : employee.role === 'admin'
                                      ? 'bg-purple-100 text-purple-700'
                                      : isMotoboy
                                      ? 'bg-orange-100 text-orange-700'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}
                                >
                                  {employee.role === 'superadmin'
                                    ? '👑 Super Admin'
                                    : employee.role === 'admin'
                                    ? '🛠️ Admin'
                                    : isMotoboy
                                    ? '🛵 Motoboy'
                                    : '👤 Cliente'}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-500 font-medium">{employee.email}</p>
                              {employee.phone && (
                                <p className="text-[10px] text-gray-400 font-bold">{employee.phone}</p>
                              )}
                            </div>

                            {/* Status badges for motoboys */}
                            {isMotoboy && (
                              <div className="flex flex-col items-end gap-1.5">
                                <span
                                  className={`flex h-5 items-center gap-1 rounded-full px-2 text-[8px] font-bold uppercase tracking-wider ${
                                    employee.online
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-gray-100 text-gray-500 border border-gray-200'
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      employee.online ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                                    }`}
                                  ></span>
                                  {employee.online ? 'Online' : 'Offline'}
                                </span>

                                <span
                                  className={`flex h-5 items-center gap-1 rounded-full px-2 text-[8px] font-bold uppercase tracking-wider ${
                                    isActive
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-red-50 text-red-700 border border-red-200'
                                  }`}
                                >
                                  {isActive ? 'Ativo' : 'Inativo'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Extra info for motoboys */}
                          {isMotoboy && (
                            <div className="grid grid-cols-2 gap-2 bg-white/30 rounded-2xl p-2 border border-white/10 text-[10px] text-gray-600 font-semibold">
                              <div>
                                <span className="text-gray-400 block text-[8px] uppercase font-extrabold">Entregas</span>
                                <span className="font-extrabold text-gray-800">{deliveries} concluídas</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[8px] uppercase font-extrabold">Última Atividade</span>
                                <span className="font-bold text-gray-800 truncate block">
                                  {employee.ultimaAtualizacao
                                    ? new Date(employee.ultimaAtualizacao).toLocaleString('pt-BR', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        day: '2-digit',
                                        month: '2-digit',
                                      })
                                    : 'Nenhuma registrada'}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Administrative Actions */}
                          {employee.id !== user.uid && (
                            <div className="flex flex-wrap gap-2 mt-1 border-t border-white/15 pt-3 w-full">
                              {employee.role === 'superadmin' ? (
                                <span className="text-[10px] text-gray-400 font-semibold italic">
                                  Super Administrador não pode ser alterado
                                </span>
                              ) : profile?.role === 'admin' && employee.role === 'admin' ? (
                                <span className="text-[10px] text-gray-400 font-semibold italic">
                                  Ações restritas para Super Admin
                                </span>
                              ) : (
                                <>
                                  {employee.role === 'admin' ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await updateUserProfile(employee.id, { role: 'superadmin' });
                                          fetchUsers();
                                        }}
                                        className="flex-1 min-w-[90px] flex items-center justify-center gap-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold py-2 transition"
                                      >
                                        <Sparkles className="h-3 w-3 text-rose-500" />
                                        Tornar Super Admin
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await updateUserProfile(employee.id, { role: 'motoboy', active: true });
                                          fetchUsers();
                                        }}
                                        className="flex-1 min-w-[90px] flex items-center justify-center gap-1 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-[10px] font-bold py-2 transition"
                                      >
                                        <UserCheck className="h-3 w-3" />
                                        Tornar Motoboy
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await updateUserProfile(employee.id, { role: 'cliente' });
                                          fetchUsers();
                                        }}
                                        className="flex-1 min-w-[90px] flex items-center justify-center gap-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold py-2 transition"
                                      >
                                        <UserX className="h-3 w-3" />
                                        Tornar Cliente
                                      </button>
                                    </>
                                  ) : employee.role === 'motoboy' ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await updateUserProfile(employee.id, { role: 'cliente', online: false });
                                          fetchUsers();
                                        }}
                                        className="flex-1 min-w-[90px] flex items-center justify-center gap-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold py-2 transition"
                                      >
                                        <UserX className="h-3 w-3" />
                                        Tornar Cliente
                                      </button>
                                      {profile?.role === 'superadmin' && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              await updateUserProfile(employee.id, { role: 'admin' });
                                              fetchUsers();
                                            }}
                                            className="flex-1 min-w-[90px] flex items-center justify-center gap-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-bold py-2 transition"
                                          >
                                            <ShieldCheck className="h-3 w-3" />
                                            Tornar Admin
                                          </button>
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              await updateUserProfile(employee.id, { role: 'superadmin' });
                                              fetchUsers();
                                            }}
                                            className="flex-1 min-w-[90px] flex items-center justify-center gap-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold py-2 transition"
                                          >
                                            <Sparkles className="h-3 w-3 text-rose-500" />
                                            Tornar Super Admin
                                          </button>
                                        </>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await updateUserProfile(employee.id, { role: 'motoboy', active: true });
                                          fetchUsers();
                                        }}
                                        className="flex-1 min-w-[90px] flex items-center justify-center gap-1 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-[10px] font-bold py-2 transition"
                                      >
                                        <UserCheck className="h-3 w-3" />
                                        Tornar Motoboy
                                      </button>
                                      {profile?.role === 'superadmin' && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              await updateUserProfile(employee.id, { role: 'admin' });
                                              fetchUsers();
                                            }}
                                            className="flex-1 min-w-[90px] flex items-center justify-center gap-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-bold py-2 transition"
                                          >
                                            <ShieldCheck className="h-3 w-3" />
                                            Tornar Admin
                                          </button>
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              await updateUserProfile(employee.id, { role: 'superadmin' });
                                              fetchUsers();
                                            }}
                                            className="flex-1 min-w-[90px] flex items-center justify-center gap-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold py-2 transition"
                                          >
                                            <Sparkles className="h-3 w-3 text-rose-500" />
                                            Tornar Super Admin
                                          </button>
                                        </>
                                      )}
                                    </>
                                  )}

                                  {/* Enable/Disable user action (Allowed for any non-superadmin targets, or full targets for Super Admin) */}
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await updateUserProfile(employee.id, { active: !isActive });
                                      fetchUsers();
                                    }}
                                    className={`flex-1 min-w-[90px] flex items-center justify-center gap-1 rounded-xl text-[10px] font-bold py-2 transition ${
                                      isActive
                                        ? 'bg-red-50 hover:bg-red-100 text-red-700'
                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                    }`}
                                  >
                                    {isActive ? 'Desativar' : 'Ativar'}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                  {usersList.length === 0 && (
                    <div className="text-center py-10 bg-white/30 rounded-3xl border border-white/20">
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Nenhum funcionário encontrado</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ======================================= */}
          {/* 6. SYSTEM SETTINGS (SUPER ADMIN ONLY) */}
          {/* ======================================= */}
          {activeTab === 'systemSettings' && profile?.role === 'superadmin' && sysSettings && (
            <motion.div
              key="system-settings-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4"
            >
              <div className="rounded-3xl border border-white/35 bg-white/40 backdrop-blur-md p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="h-5 w-5 text-rose-500 animate-spin" style={{ animationDuration: '6s' }} />
                  <h3 className="font-sans text-sm font-extrabold text-gray-900">Configurações do Sistema</h3>
                </div>
                <p className="text-[10px] text-gray-500 leading-normal mb-4 font-semibold">
                  Módulo de Controle e Gestão Exclusivo do Super Admin. Altere as regras de funcionamento e identidade do Maestria Grill em tempo real.
                </p>

                <form onSubmit={handleSaveSystemSettings} className="flex flex-col gap-4">

                  {/* SECTION 1: MODO MANUTENÇÃO */}
                  <div className="border border-white/20 rounded-2xl overflow-hidden bg-white/25">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === 'maintenance' ? null : 'maintenance')}
                      className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-gray-800 hover:bg-white/45 transition"
                    >
                      <span className="flex items-center gap-2">
                        <Lock className={`h-4.5 w-4.5 ${sysSettings.maintenanceMode ? 'text-rose-500 animate-bounce' : 'text-gray-400'}`} />
                        1. Modo Manutenção
                      </span>
                      <div className="flex items-center gap-2">
                        {sysSettings.maintenanceMode ? (
                          <span className="rounded-full bg-rose-500/15 border border-rose-500/25 px-2 py-0.5 text-[8px] font-bold text-rose-600">ATIVADO</span>
                        ) : (
                          <span className="rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[8px] font-bold text-emerald-600">DESATIVADO</span>
                        )}
                        {expandedSection === 'maintenance' ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </div>
                    </button>

                    {expandedSection === 'maintenance' && (
                      <div className="p-4 border-t border-white/10 bg-white/10 flex flex-col gap-3">
                        <p className="text-[10px] text-gray-500 font-semibold leading-relaxed">
                          Quando ativado, os clientes visualizarão uma tela de manutenção e não conseguirão fazer pedidos. Apenas Administradores e Super Admins continuam acessando normalmente.
                        </p>
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/35 border border-white/15">
                          <span className="text-[11px] font-bold text-gray-700">Bloquear Acesso Geral (Manutenção)</span>
                          <button
                            type="button"
                            onClick={() => updateSysField('maintenanceMode', !sysSettings.maintenanceMode)}
                            className="text-gray-600 transition"
                          >
                            {sysSettings.maintenanceMode ? (
                              <ToggleRight className="h-9 w-9 text-rose-500" />
                            ) : (
                              <ToggleLeft className="h-9 w-9 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 2: INFORMAÇÕES DO RESTAURANTE */}
                  <div className="border border-white/20 rounded-2xl overflow-hidden bg-white/25">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === 'info' ? null : 'info')}
                      className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-gray-800 hover:bg-white/45 transition"
                    >
                      <span className="flex items-center gap-2">
                        <Utensils className="h-4.5 w-4.5 text-gray-400" />
                        2. Informações do Restaurante
                      </span>
                      {expandedSection === 'info' ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </button>

                    {expandedSection === 'info' && (
                      <div className="p-4 border-t border-white/10 bg-white/10 flex flex-col gap-3.5">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nome Comercial</label>
                          <input
                            type="text"
                            required
                            value={sysSettings.name || ''}
                            onChange={(e) => updateSysField('name', e.target.value)}
                            className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Slogan / Descrição</label>
                          <textarea
                            value={sysSettings.description || ''}
                            onChange={(e) => updateSysField('description', e.target.value)}
                            rows={2}
                            className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Logo (Emoji)</label>
                            <input
                              type="text"
                              value={sysSettings.logoUrl || ''}
                              onChange={(e) => updateSysField('logoUrl', e.target.value)}
                              className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">WhatsApp</label>
                            <input
                              type="text"
                              value={sysSettings.whatsapp || ''}
                              onChange={(e) => updateSysField('whatsapp', e.target.value)}
                              className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Instagram</label>
                            <input
                              type="text"
                              value={sysSettings.instagram || ''}
                              onChange={(e) => updateSysField('instagram', e.target.value)}
                              className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Facebook</label>
                            <input
                              type="text"
                              value={sysSettings.facebook || ''}
                              onChange={(e) => updateSysField('facebook', e.target.value)}
                              className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">E-mail Comercial</label>
                          <input
                            type="email"
                            value={sysSettings.email || ''}
                            onChange={(e) => updateSysField('email', e.target.value)}
                            className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Horário de Funcionamento</label>
                          <input
                            type="text"
                            value={sysSettings.horarioFuncionamento || ''}
                            onChange={(e) => updateSysField('horarioFuncionamento', e.target.value)}
                            placeholder="ex: Terça a Domingo das 18h às 23h"
                            className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Endereço Físico</label>
                          <input
                            type="text"
                            value={sysSettings.address || ''}
                            onChange={(e) => updateSysField('address', e.target.value)}
                            className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 3: CONFIGURAÇÕES DE ENTREGA */}
                  <div className="border border-white/20 rounded-2xl overflow-hidden bg-white/25">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === 'delivery' ? null : 'delivery')}
                      className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-gray-800 hover:bg-white/45 transition"
                    >
                      <span className="flex items-center gap-2">
                        <Truck className="h-4.5 w-4.5 text-gray-400" />
                        3. Configurações de Entrega
                      </span>
                      {expandedSection === 'delivery' ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </button>

                    {expandedSection === 'delivery' && (
                      <div className="p-4 border-t border-white/10 bg-white/10 flex flex-col gap-3.5">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Taxa de Entrega (R$)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={sysSettings.deliveryFee}
                              onChange={(e) => updateSysField('deliveryFee', parseFloat(e.target.value) || 0)}
                              className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Valor Mínimo Pedido (R$)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={sysSettings.minOrderValue || 0}
                              onChange={(e) => updateSysField('minOrderValue', parseFloat(e.target.value) || 0)}
                              className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Distância Máxima (km)</label>
                            <input
                              type="number"
                              value={sysSettings.maxDeliveryDistance || 0}
                              onChange={(e) => updateSysField('maxDeliveryDistance', parseInt(e.target.value) || 0)}
                              className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tempo de Entrega</label>
                            <input
                              type="text"
                              value={sysSettings.avgDeliveryTime || ''}
                              onChange={(e) => updateSysField('avgDeliveryTime', e.target.value)}
                              placeholder="ex: 35 - 50 min"
                              className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tempo de Retirada</label>
                          <input
                            type="text"
                            value={sysSettings.avgPickupTime || ''}
                            onChange={(e) => updateSysField('avgPickupTime', e.target.value)}
                            placeholder="ex: 15 - 25 min"
                            className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                          />
                        </div>

                        <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/35 border border-white/15 mt-1">
                          <span className="text-[11px] font-bold text-gray-700">Permitir Entrega (Delivery)</span>
                          <button
                            type="button"
                            onClick={() => updateSysField('allowDelivery', !sysSettings.allowDelivery)}
                          >
                            {sysSettings.allowDelivery ? (
                              <ToggleRight className="h-8 w-8 text-orange-600" />
                            ) : (
                              <ToggleLeft className="h-8 w-8 text-gray-400" />
                            )}
                          </button>
                        </div>

                        <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/35 border border-white/15">
                          <span className="text-[11px] font-bold text-gray-700">Permitir Retirada no Balcão</span>
                          <button
                            type="button"
                            onClick={() => updateSysField('allowPickup', !sysSettings.allowPickup)}
                          >
                            {sysSettings.allowPickup ? (
                              <ToggleRight className="h-8 w-8 text-orange-600" />
                            ) : (
                              <ToggleLeft className="h-8 w-8 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 4: FORMAS DE PAGAMENTO */}
                  <div className="border border-white/20 rounded-2xl overflow-hidden bg-white/25">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === 'payment' ? null : 'payment')}
                      className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-gray-800 hover:bg-white/45 transition"
                    >
                      <span className="flex items-center gap-2">
                        <CreditCard className="h-4.5 w-4.5 text-gray-400" />
                        4. Formas de Pagamento
                      </span>
                      {expandedSection === 'payment' ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </button>

                    {expandedSection === 'payment' && (
                      <div className="p-4 border-t border-white/10 bg-white/10 flex flex-col gap-3">
                        <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/35 border border-white/15">
                          <span className="text-[11px] font-bold text-gray-700">Pix Instantâneo</span>
                          <button
                            type="button"
                            onClick={() => updateSysField('paymentPix', !sysSettings.paymentPix)}
                          >
                            {sysSettings.paymentPix ? (
                              <ToggleRight className="h-8 w-8 text-orange-600" />
                            ) : (
                              <ToggleLeft className="h-8 w-8 text-gray-400" />
                            )}
                          </button>
                        </div>

                        <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/35 border border-white/15">
                          <span className="text-[11px] font-bold text-gray-700">Cartão de Crédito (Na entrega)</span>
                          <button
                            type="button"
                            onClick={() => updateSysField('paymentCreditCard', !sysSettings.paymentCreditCard)}
                          >
                            {sysSettings.paymentCreditCard ? (
                              <ToggleRight className="h-8 w-8 text-orange-600" />
                            ) : (
                              <ToggleLeft className="h-8 w-8 text-gray-400" />
                            )}
                          </button>
                        </div>

                        <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/35 border border-white/15">
                          <span className="text-[11px] font-bold text-gray-700">Cartão de Débito (Na entrega)</span>
                          <button
                            type="button"
                            onClick={() => updateSysField('paymentDebitCard', !sysSettings.paymentDebitCard)}
                          >
                            {sysSettings.paymentDebitCard ? (
                              <ToggleRight className="h-8 w-8 text-orange-600" />
                            ) : (
                              <ToggleLeft className="h-8 w-8 text-gray-400" />
                            )}
                          </button>
                        </div>

                        <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/35 border border-white/15">
                          <span className="text-[11px] font-bold text-gray-700">Dinheiro físico</span>
                          <button
                            type="button"
                            onClick={() => updateSysField('paymentCash', !sysSettings.paymentCash)}
                          >
                            {sysSettings.paymentCash ? (
                              <ToggleRight className="h-8 w-8 text-orange-600" />
                            ) : (
                              <ToggleLeft className="h-8 w-8 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 5: GERENCIAMENTO DE CUPONS */}
                  <div className="border border-white/20 rounded-2xl overflow-hidden bg-white/25">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === 'coupons' ? null : 'coupons')}
                      className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-gray-800 hover:bg-white/45 transition"
                    >
                      <span className="flex items-center gap-2">
                        <Percent className="h-4.5 w-4.5 text-gray-400" />
                        5. Gerenciamento de Cupons
                      </span>
                      {expandedSection === 'coupons' ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </button>

                    {expandedSection === 'coupons' && (
                      <div className="p-4 border-t border-white/10 bg-white/10 flex flex-col gap-4">
                        {/* Inline Coupon list */}
                        <div className="flex flex-col gap-2">
                          <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Cupons Cadastrados</h4>
                          {(sysSettings.coupons || []).length === 0 ? (
                            <p className="text-[10px] text-gray-400 italic">Nenhum cupom cadastrado.</p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {(sysSettings.coupons || []).map((c, idx) => (
                                <div key={c.id || idx} className="flex justify-between items-center p-2.5 rounded-xl bg-white/40 border border-white/10">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-xs font-extrabold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-md">{c.code}</span>
                                      <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full ${c.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-150 text-gray-500'}`}>
                                        {c.active ? 'Ativo' : 'Inativo'}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-gray-600 font-semibold mt-1">{c.name}</p>
                                    <p className="text-[9px] text-gray-400">
                                      Desconto: <span className="font-bold">{c.discountType === 'percentage' ? `${c.discountValue}%` : `R$ ${c.discountValue}`}</span>
                                      {c.maxUses && ` • Máx: ${c.usedCount}/${c.maxUses}`}
                                      {c.validUntil && ` • Validade: ${c.validUntil}`}
                                    </p>
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleEditCouponClick(idx)}
                                      className="p-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 transition"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCoupon(idx)}
                                      className="p-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Inline Coupon Form */}
                        <div className="rounded-2xl border border-dashed border-gray-300 p-3 bg-white/20 mt-1">
                          <h4 className="text-[10px] font-bold text-gray-800 mb-2 uppercase">
                            {couponEditIndex !== null ? '✏️ Editar Cupom' : '➕ Novo Cupom'}
                          </h4>
                          
                          <div className="flex flex-col gap-2.5">
                            <div>
                              <label className="block text-[8px] font-extrabold text-gray-500 uppercase mb-0.5">Nome do Cupom</label>
                              <input
                                type="text"
                                placeholder="Desconto de Boas-vindas"
                                value={couponName}
                                onChange={(e) => setCouponName(e.target.value)}
                                className="w-full rounded-lg border border-white/30 bg-white/45 py-1.5 px-2.5 text-xs text-gray-800 outline-none"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[8px] font-extrabold text-gray-500 uppercase mb-0.5">Código (Letras/Números)</label>
                                <input
                                  type="text"
                                  placeholder="BEMVINDO"
                                  value={couponCodeStr}
                                  onChange={(e) => setCouponCodeStr(e.target.value)}
                                  className="w-full rounded-lg border border-white/30 bg-white/45 py-1.5 px-2.5 text-xs text-gray-800 outline-none uppercase font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] font-extrabold text-gray-500 uppercase mb-0.5">Tipo de Desconto</label>
                                <select
                                  value={couponDiscountType}
                                  onChange={(e: any) => setCouponDiscountType(e.target.value)}
                                  className="w-full rounded-lg border border-white/30 bg-white/45 py-1.5 px-2 text-xs text-gray-800 outline-none"
                                >
                                  <option value="percentage">Porcentagem (%)</option>
                                  <option value="fixed">Valor Fixo (R$)</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[8px] font-extrabold text-gray-500 uppercase mb-0.5">Valor do Desconto</label>
                                <input
                                  type="number"
                                  placeholder="10"
                                  value={couponDiscountValue || ''}
                                  onChange={(e) => setCouponDiscountValue(parseFloat(e.target.value) || 0)}
                                  className="w-full rounded-lg border border-white/30 bg-white/45 py-1.5 px-2.5 text-xs text-gray-800 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] font-extrabold text-gray-500 uppercase mb-0.5">Data de Validade</label>
                                <input
                                  type="date"
                                  value={couponValidUntil}
                                  onChange={(e) => setCouponValidUntil(e.target.value)}
                                  className="w-full rounded-lg border border-white/30 bg-white/45 py-1.5 px-2 text-xs text-gray-800 outline-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[8px] font-extrabold text-gray-500 uppercase mb-0.5">Limite de Usos (Opcional)</label>
                                <input
                                  type="number"
                                  placeholder="Sem limite"
                                  value={couponMaxUses}
                                  onChange={(e) => setCouponMaxUses(e.target.value)}
                                  className="w-full rounded-lg border border-white/30 bg-white/45 py-1.5 px-2.5 text-xs text-gray-800 outline-none"
                                />
                              </div>
                              <div className="flex items-center justify-between p-1 bg-white/25 rounded-lg border border-white/10 mt-2.5">
                                <span className="text-[9px] font-bold text-gray-500 uppercase ml-1">Status Ativo</span>
                                <button
                                  type="button"
                                  onClick={() => setCouponActive(!couponActive)}
                                >
                                  {couponActive ? (
                                    <ToggleRight className="h-7 w-7 text-orange-600" />
                                  ) : (
                                    <ToggleLeft className="h-7 w-7 text-gray-400" />
                                  )}
                                </button>
                              </div>
                            </div>

                            <div className="flex gap-2 justify-end mt-1">
                              {couponEditIndex !== null && (
                                <button
                                  type="button"
                                  onClick={handleCancelCouponEdit}
                                  className="rounded-lg border border-white/40 bg-white/25 py-1.5 px-3 text-[10px] font-bold text-gray-500 hover:bg-white/45 transition"
                                >
                                  Cancelar
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={handleSaveCoupon}
                                className="rounded-lg bg-orange-600 hover:bg-orange-700 text-white py-1.5 px-4 text-[10px] font-bold transition"
                              >
                                {couponEditIndex !== null ? 'Salvar Cupom' : 'Adicionar Cupom'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 6: BANNER PROMOCIONAL */}
                  <div className="border border-white/20 rounded-2xl overflow-hidden bg-white/25">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === 'banner' ? null : 'banner')}
                      className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-gray-800 hover:bg-white/45 transition"
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-4.5 w-4.5 text-gray-400" />
                        6. Banner Promocional
                      </span>
                      {expandedSection === 'banner' ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </button>

                    {expandedSection === 'banner' && (
                      <div className="p-4 border-t border-white/10 bg-white/10 flex flex-col gap-3.5">
                        <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/35 border border-white/15 mb-1">
                          <span className="text-[11px] font-bold text-gray-700">Ativar Banner Promocional</span>
                          <button
                            type="button"
                            onClick={() => updateSysField('promoBannerEnabled', !sysSettings.promoBannerEnabled)}
                          >
                            {sysSettings.promoBannerEnabled ? (
                              <ToggleRight className="h-8 w-8 text-orange-600" />
                            ) : (
                              <ToggleLeft className="h-8 w-8 text-gray-400" />
                            )}
                          </button>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Título do Banner</label>
                          <input
                            type="text"
                            value={sysSettings.promoBannerTitle || ''}
                            onChange={(e) => updateSysField('promoBannerTitle', e.target.value)}
                            className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Descrição</label>
                          <textarea
                            value={sysSettings.promoBannerDesc || ''}
                            onChange={(e) => updateSysField('promoBannerDesc', e.target.value)}
                            rows={2}
                            className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Imagem URL</label>
                          <input
                            type="url"
                            value={sysSettings.promoBannerImage || ''}
                            onChange={(e) => updateSysField('promoBannerImage', e.target.value)}
                            placeholder="https://images.unsplash.com/..."
                            className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Texto do Botão</label>
                            <input
                              type="text"
                              value={sysSettings.promoBannerBtnText || ''}
                              onChange={(e) => updateSysField('promoBannerBtnText', e.target.value)}
                              className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Link de Destino</label>
                            <input
                              type="text"
                              value={sysSettings.promoBannerBtnLink || ''}
                              onChange={(e) => updateSysField('promoBannerBtnLink', e.target.value)}
                              className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data Início</label>
                            <input
                              type="date"
                              value={sysSettings.promoBannerStart || ''}
                              onChange={(e) => updateSysField('promoBannerStart', e.target.value)}
                              className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data Término</label>
                            <input
                              type="date"
                              value={sysSettings.promoBannerEnd || ''}
                              onChange={(e) => updateSysField('promoBannerEnd', e.target.value)}
                              className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 7: CONFIGURAÇÕES DOS MOTOBOYS */}
                  <div className="border border-white/20 rounded-2xl overflow-hidden bg-white/25">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === 'motoboy' ? null : 'motoboy')}
                      className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-gray-800 hover:bg-white/45 transition"
                    >
                      <span className="flex items-center gap-2">
                        <Users className="h-4.5 w-4.5 text-gray-400" />
                        7. Configurações dos Motoboys
                      </span>
                      {expandedSection === 'motoboy' ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </button>

                    {expandedSection === 'motoboy' && (
                      <div className="p-4 border-t border-white/10 bg-white/10 flex flex-col gap-3.5">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Distribuição de Pedidos</label>
                          <select
                            value={sysSettings.motoboyDistribution || 'manual'}
                            onChange={(e: any) => updateSysField('motoboyDistribution', e.target.value)}
                            className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                          >
                            <option value="manual">Manual (Pelo Painel Admin)</option>
                            <option value="automatic">Fila de Aceite Inteligente (Automático)</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Corrida Máxima (km)</label>
                            <input
                              type="number"
                              value={sysSettings.motoboyMaxDistance || 0}
                              onChange={(e) => updateSysField('motoboyMaxDistance', parseInt(e.target.value) || 0)}
                              className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Pedidos Máximos Simultâneos</label>
                            <input
                              type="number"
                              value={sysSettings.motoboyMaxSimultaneousOrders || 3}
                              onChange={(e) => updateSysField('motoboyMaxSimultaneousOrders', parseInt(e.target.value) || 0)}
                              className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tempo limite de Aceite (segundos)</label>
                          <input
                            type="number"
                            value={sysSettings.motoboyMaxAcceptTime || 60}
                            onChange={(e) => updateSysField('motoboyMaxAcceptTime', parseInt(e.target.value) || 0)}
                            className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 8: NOTIFICAÇÕES */}
                  <div className="border border-white/20 rounded-2xl overflow-hidden bg-white/25">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === 'notifications' ? null : 'notifications')}
                      className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-gray-800 hover:bg-white/45 transition"
                    >
                      <span className="flex items-center gap-2">
                        <Bell className="h-4.5 w-4.5 text-gray-400" />
                        8. Notificações do Sistema
                      </span>
                      {expandedSection === 'notifications' ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </button>

                    {expandedSection === 'notifications' && (
                      <div className="p-4 border-t border-white/10 bg-white/10 flex flex-col gap-3">
                        <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/35 border border-white/15">
                          <span className="text-[11px] font-bold text-gray-700">Notificações por Push no Navegador</span>
                          <button
                            type="button"
                            onClick={() => updateSysField('notifyPush', !sysSettings.notifyPush)}
                          >
                            {sysSettings.notifyPush ? (
                              <ToggleRight className="h-8 w-8 text-orange-600" />
                            ) : (
                              <ToggleLeft className="h-8 w-8 text-gray-400" />
                            )}
                          </button>
                        </div>

                        <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/35 border border-white/15">
                          <span className="text-[11px] font-bold text-gray-700">Notificações por E-mail</span>
                          <button
                            type="button"
                            onClick={() => updateSysField('notifyEmail', !sysSettings.notifyEmail)}
                          >
                            {sysSettings.notifyEmail ? (
                              <ToggleRight className="h-8 w-8 text-orange-600" />
                            ) : (
                              <ToggleLeft className="h-8 w-8 text-gray-400" />
                            )}
                          </button>
                        </div>

                        <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/35 border border-white/15">
                          <span className="text-[11px] font-bold text-gray-700">Notificações por SMS</span>
                          <button
                            type="button"
                            onClick={() => updateSysField('notifySms', !sysSettings.notifySms)}
                          >
                            {sysSettings.notifySms ? (
                              <ToggleRight className="h-8 w-8 text-orange-600" />
                            ) : (
                              <ToggleLeft className="h-8 w-8 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 9: APARÊNCIA */}
                  <div className="border border-white/20 rounded-2xl overflow-hidden bg-white/25">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === 'appearance' ? null : 'appearance')}
                      className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-gray-800 hover:bg-white/45 transition"
                    >
                      <span className="flex items-center gap-2">
                        <Palette className="h-4.5 w-4.5 text-gray-400" />
                        9. Aparência e Identidade
                      </span>
                      {expandedSection === 'appearance' ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </button>

                    {expandedSection === 'appearance' && (
                      <div className="p-4 border-t border-white/10 bg-white/10 flex flex-col gap-3.5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cor Primária</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={sysSettings.primaryColor || '#ea580c'}
                                onChange={(e) => updateSysField('primaryColor', e.target.value)}
                                className="h-9 w-9 rounded-xl border border-white/30 cursor-pointer bg-transparent p-0 overflow-hidden shrink-0"
                              />
                              <input
                                type="text"
                                value={sysSettings.primaryColor || '#ea580c'}
                                onChange={(e) => updateSysField('primaryColor', e.target.value)}
                                placeholder="#ea580c"
                                className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500 font-mono"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cor Secundária</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={sysSettings.secondaryColor || '#fb923c'}
                                onChange={(e) => updateSysField('secondaryColor', e.target.value)}
                                className="h-9 w-9 rounded-xl border border-white/30 cursor-pointer bg-transparent p-0 overflow-hidden shrink-0"
                              />
                              <input
                                type="text"
                                value={sysSettings.secondaryColor || '#fb923c'}
                                onChange={(e) => updateSysField('secondaryColor', e.target.value)}
                                placeholder="#fb923c"
                                className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500 font-mono"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cor de Fundo do Site</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={sysSettings.backgroundColor || '#fff7f4'}
                                onChange={(e) => updateSysField('backgroundColor', e.target.value)}
                                className="h-9 w-9 rounded-xl border border-white/30 cursor-pointer bg-transparent p-0 overflow-hidden shrink-0"
                              />
                              <input
                                type="text"
                                value={sysSettings.backgroundColor || '#fff7f4'}
                                onChange={(e) => updateSysField('backgroundColor', e.target.value)}
                                placeholder="#fff7f4"
                                className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500 font-mono"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Background Color Quick Presets */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Atalhos de Fundo Rápido</label>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: 'Creme Soft', color: '#fff7f4' },
                              { label: 'Cinza Suave', color: '#f8fafc' },
                              { label: 'Branco', color: '#ffffff' },
                              { label: 'Azul Slate', color: '#f1f5f9' },
                              { label: 'Laranja Leve', color: '#fff3ed' },
                              { label: 'Escuro Slate', color: '#0f172a' },
                              { label: 'Grafite Dark', color: '#18181b' },
                            ].map((preset) => (
                              <button
                                key={preset.color}
                                type="button"
                                onClick={() => updateSysField('backgroundColor', preset.color)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold border transition ${
                                  (sysSettings.backgroundColor || '#fff7f4').toLowerCase() === preset.color.toLowerCase()
                                    ? 'border-orange-500 bg-orange-50 text-orange-950 shadow-sm'
                                    : 'border-white/30 bg-white/40 text-gray-700 hover:bg-white/60'
                                }`}
                              >
                                <span 
                                  className="w-3 h-3 rounded-full border border-gray-300 shrink-0" 
                                  style={{ backgroundColor: preset.color }} 
                                />
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nome de Exibição do App</label>
                          <input
                            type="text"
                            value={sysSettings.appNameExhibited || ''}
                            onChange={(e) => updateSysField('appNameExhibited', e.target.value)}
                            placeholder="Maestria Grill App"
                            className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Fundo da Home URL</label>
                          <input
                            type="url"
                            value={sysSettings.homeImage || ''}
                            onChange={(e) => updateSysField('homeImage', e.target.value)}
                            placeholder="https://images.unsplash.com/..."
                            className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Splash Screen Background URL</label>
                          <input
                            type="url"
                            value={sysSettings.splashImage || ''}
                            onChange={(e) => updateSysField('splashImage', e.target.value)}
                            placeholder="https://images.unsplash.com/..."
                            className="w-full rounded-xl border border-white/30 bg-white/45 py-2 px-3 text-xs text-gray-800 outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 10: BACKUP */}
                  <div className="border border-white/20 rounded-2xl overflow-hidden bg-white/25">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === 'backup' ? null : 'backup')}
                      className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-gray-800 hover:bg-white/45 transition"
                    >
                      <span className="flex items-center gap-2">
                        <FileJson className="h-4.5 w-4.5 text-gray-400" />
                        10. Backup de Segurança
                      </span>
                      {expandedSection === 'backup' ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </button>

                    {expandedSection === 'backup' && (
                      <div className="p-4 border-t border-white/10 bg-white/10 flex flex-col gap-3.5">
                        <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase">
                          <span>Último Backup</span>
                          <span className="text-gray-700">{sysSettings.lastBackupDate || 'Não registrado'}</span>
                        </div>

                        <p className="text-[10px] text-gray-500 font-semibold leading-relaxed">
                          Exporte ou importe as configurações completas do sistema em formato JSON para fins de backup ou replicação.
                        </p>

                        <div className="grid grid-cols-2 gap-3 mt-1">
                          <button
                            type="button"
                            onClick={handleExportBackup}
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white py-2.5 px-3 text-[10px] font-bold transition shadow-sm"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Exportar JSON
                          </button>

                          <label className="flex items-center justify-center gap-1.5 rounded-xl border border-white/45 bg-white/30 text-gray-600 hover:bg-white/45 py-2.5 px-3 text-[10px] font-bold cursor-pointer transition shadow-sm">
                            <Upload className="h-3.5 w-3.5" />
                            Importar JSON
                            <input
                              type="file"
                              accept=".json"
                              onChange={handleImportBackup}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {backupMessage && (
                          <div className={`mt-2 p-2.5 rounded-xl text-center text-[10px] font-bold border ${
                            backupMessage.type === 'success'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {backupMessage.text}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* TOAST FEEDBACK */}
                  {sysSettingsError && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-center py-2.5 text-xs font-bold"
                    >
                      {sysSettingsError}
                    </motion.div>
                  )}

                  {sysSettingsSaved && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-center py-2.5 text-xs font-bold"
                    >
                      ⚙️ Configurações gravadas com sucesso!
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    id="form-system-settings-submit"
                    className="rounded-xl bg-orange-600 hover:bg-orange-700 py-3 text-xs font-bold text-white shadow-md shadow-orange-500/10 transition mt-2 flex items-center justify-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Gravar Configurações do Sistema
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* ======================================= */}
          {/* 7. CHATS TAB */}
          {/* ======================================= */}
          {activeTab === 'chats' && (
            <motion.div
              key="tab-chats"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ duration: 0.2 }}
            >
              <AdminChatDashboard />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/30 bg-white/80 p-6 shadow-2xl backdrop-blur-lg"
            >
              <h3 className="font-sans text-base font-extrabold text-gray-900 mb-2">
                Confirmar Exclusão
              </h3>
              <p className="text-xs text-gray-600 mb-5 leading-relaxed">
                {deleteConfirm.type === 'product' ? (
                  <>Tem certeza que deseja excluir o produto <span className="font-bold text-gray-800">"{deleteConfirm.name}"</span>? Esta ação não poderá ser desfeita.</>
                ) : (
                  <>Tem certeza que deseja excluir a categoria <span className="font-bold text-gray-800">"{deleteConfirm.name}"</span>? Isso não apagará os produtos dela, mas eles ficarão sem categoria associada.</>
                )}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="rounded-xl border border-white/45 bg-white/20 py-2.5 px-4 text-xs font-bold text-gray-500 hover:bg-white/50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDelete}
                  className="rounded-xl bg-rose-600 py-2.5 px-5 text-xs font-bold text-white hover:bg-rose-700 transition"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Refusal Reason Modal */}
      <AnimatePresence>
        {refusingOrderId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRefusingOrderId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/30 bg-white/80 p-6 shadow-2xl backdrop-blur-lg"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                  <X className="h-5 w-5" />
                </span>
                <h3 className="font-sans text-base font-extrabold text-gray-900">
                  Recusar ou Cancelar Pedido #{refusingOrderId}
                </h3>
              </div>
              <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                Por favor, informe o motivo do cancelamento ou recusa deste pedido. Esta informação ficará registrada e visível no acompanhamento do cliente.
              </p>
              
              <div className="mb-5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Motivo do Cancelamento / Recusa</label>
                <textarea
                  required
                  rows={3}
                  value={refusalReason}
                  onChange={(e) => setRefusalReason(e.target.value)}
                  placeholder="Ex: No momento estamos sem motoboys disponíveis para sua região, ou ingrediente esgotado..."
                  className="w-full rounded-2xl border border-gray-200 bg-white py-3 px-4 text-xs font-semibold text-gray-800 outline-none transition focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 placeholder-gray-400"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setRefusingOrderId(null)}
                  className="rounded-xl border border-white/45 bg-white/20 py-2.5 px-4 text-xs font-bold text-gray-500 hover:bg-white/50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!refusalReason.trim()}
                  onClick={async () => {
                    await updateOrder(refusingOrderId, { status: 'refused', motivoRecusa: refusalReason });
                    setRefusingOrderId(null);
                  }}
                  className="rounded-xl bg-rose-600 py-2.5 px-5 text-xs font-bold text-white hover:bg-rose-700 transition disabled:opacity-40 disabled:pointer-events-none"
                >
                  Confirmar Recusa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {selectedChatOrder && (
        <OrderChatModal
          orderId={selectedChatOrder.id}
          orderNumber={selectedChatOrder.id}
          customerName={selectedChatOrder.customerName}
          isOpen={!!selectedChatOrder}
          onClose={() => setSelectedChatOrder(null)}
        />
      )}

      {confirmStatusModal && (
        <ConfirmationModal
          isOpen={confirmStatusModal.isOpen}
          title={confirmStatusModal.title}
          message={confirmStatusModal.message}
          confirmLabel={confirmStatusModal.confirmLabel}
          variant={confirmStatusModal.variant}
          isLoading={isUpdatingStatus}
          onConfirm={handleConfirmStatusChange}
          onCancel={() => setConfirmStatusModal(null)}
        />
      )}
    </div>
  );
}
