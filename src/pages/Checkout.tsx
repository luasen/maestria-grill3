import React, { useState, useEffect } from 'react';
import { ChevronLeft, Check, Clipboard, DollarSign, CreditCard, Landmark, CheckCircle, Clock, Truck, MapPin, User, AlertCircle, ShieldCheck, Lock, Sparkles, ExternalLink } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { Coupon } from '../types';
import MercadoPagoCheckoutBrick from '../components/MercadoPagoCheckoutBrick';
import OnlinePaymentMenu from '../components/OnlinePaymentMenu';
import { fetchApi } from '../utils/api';

export default function Checkout() {
  const { cart, subtotal, deliveryFee, clearCart } = useCart();
  const { createOrder, settings, setActiveView, updateSettings } = useApp();
  const { user, profile, loading: authLoading, updateUserAddress, setIsAuthOpen } = useAuth();

  // Profile data sync
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Choice of Pedido Type
  const [tipoPedido, setTipoPedido] = useState<'entrega' | 'retirada'>('entrega');

  // Address fields (Fase 1 / Delivery Flow)
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [complement, setComplement] = useState('');
  const [reference, setReference] = useState('');
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Payment options: Online (Checkout Transparente) vs Delivery (Offline)
  const [paymentOption, setPaymentOption] = useState<'mercadopago' | 'delivery'>('mercadopago');
  const [onlineSubMethod, setOnlineSubMethod] = useState<'pix' | 'card' | 'all'>('pix');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | 'cash'>('pix');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Success & Pending Mercado Pago States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<any>(null);
  const [pendingOrder, setPendingOrder] = useState<any>(null);
  const [mpInitPoint, setMpInitPoint] = useState<string | null>(null);
  const [mpError, setMpError] = useState<string | null>(null);
  const [pixCopied, setPixCopied] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  const isPickupAllowed = settings?.allowPickup !== false; // default true
  const isDeliveryAllowed = settings?.allowDelivery !== false; // default true

  // Adjust order type based on what is allowed in settings
  useEffect(() => {
    if (!isPickupAllowed && tipoPedido === 'retirada') {
      setTipoPedido('entrega');
    } else if (!isDeliveryAllowed && tipoPedido === 'entrega') {
      setTipoPedido('retirada');
    }
  }, [settings, isPickupAllowed, isDeliveryAllowed]);

  const isPixEnabled = settings?.paymentPix !== false; // default true
  const isCardEnabled = (settings?.paymentCreditCard !== false) || (settings?.paymentDebitCard !== false); // default true
  const isCashEnabled = settings?.paymentCash !== false; // default true

  // Ensure selected payment method is enabled
  useEffect(() => {
    if (paymentMethod === 'pix' && !isPixEnabled) {
      if (isCardEnabled) setPaymentMethod('card');
      else if (isCashEnabled) setPaymentMethod('cash');
    } else if (paymentMethod === 'card' && !isCardEnabled) {
      if (isPixEnabled) setPaymentMethod('pix');
      else if (isCashEnabled) setPaymentMethod('cash');
    } else if (paymentMethod === 'cash' && !isCashEnabled) {
      if (isPixEnabled) setPaymentMethod('pix');
      else if (isCardEnabled) setPaymentMethod('card');
    }
  }, [settings, isPixEnabled, isCardEnabled, isCashEnabled, paymentMethod]);

  // Sync state if profile loads or changes
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
      if (profile.address) {
        setCep(profile.address.cep || '');
        setStreet(profile.address.street || '');
        setNumber(profile.address.number || '');
        setNeighborhood(profile.address.neighborhood || '');
        setCity(profile.address.city || '');
        setComplement(profile.address.complement || '');
        setReference(profile.address.reference || '');
      }
    }
  }, [profile]);

  // Apply Coupon Handler
  const handleApplyCoupon = () => {
    setCouponError(null);
    setCouponSuccess(null);
    if (!couponCode.trim()) return;

    const code = couponCode.trim().toUpperCase();
    const coupon = settings?.coupons?.find(c => c.code.toUpperCase() === code);

    if (!coupon) {
      setCouponError('Cupom inválido ou inexistente.');
      setAppliedCoupon(null);
      return;
    }

    if (!coupon.active) {
      setCouponError('Este cupom está inativo.');
      setAppliedCoupon(null);
      return;
    }

    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) {
      setCouponError('Este cupom expirou.');
      setAppliedCoupon(null);
      return;
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      setCouponError('Este cupom atingiu o limite máximo de usos.');
      setAppliedCoupon(null);
      return;
    }

    setAppliedCoupon(coupon);
    setCouponSuccess(`Cupom "${coupon.name}" de ${coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : formatPrice(coupon.discountValue)} aplicado!`);
  };

  // Adjust financial fields based on order type selection and coupons
  const finalDeliveryFee = tipoPedido === 'retirada' ? 0 : deliveryFee;

  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      discountAmount = (subtotal * appliedCoupon.discountValue) / 100;
    } else {
      discountAmount = appliedCoupon.discountValue;
    }
  }

  // Ensure discount doesn't exceed subtotal
  if (discountAmount > subtotal) {
    discountAmount = subtotal;
  }

  const finalTotal = subtotal + finalDeliveryFee - discountAmount;

  // Auto-fill mock customer details for easy testing of MVP!
  const handleAutoFill = () => {
    setName('Maria Silva Oliveira');
    setPhone('(11) 98765-4321');
    if (tipoPedido === 'entrega') {
      setCep('01311-200');
      setStreet('Avenida Paulista');
      setNumber('1000');
      setNeighborhood('Bela Vista');
      setCity('São Paulo');
      setComplement('Apto 42B');
      setReference('Próximo ao Metrô Trianon');
    }
  };

  const validate = () => {
    const tempErrors: Record<string, string> = {};
    if (!name.trim()) tempErrors.name = 'Nome completo é obrigatório';
    if (!phone.trim()) tempErrors.phone = 'Telefone para contato é obrigatório';
    
    if (tipoPedido === 'entrega') {
      if (!cep.trim()) tempErrors.cep = 'CEP é obrigatório';
      if (!street.trim()) tempErrors.street = 'Rua é obrigatória';
      if (!number.trim()) tempErrors.number = 'Número é obrigatório';
      if (!neighborhood.trim()) tempErrors.neighborhood = 'Bairro é obrigatório';
      if (!city.trim()) tempErrors.city = 'Cidade é obrigatória';
    }
    
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (paymentOption === 'mercadopago') {
      setIsSubmitting(true);
      setMpError(null);
      try {
        const orderItems = cart.map((item) => ({
          productId: item.productId,
          productName: item.name,
          quantity: item.quantity,
          price: item.price,
        }));

        const formattedAddress = tipoPedido === 'retirada'
          ? 'Retirada no Restaurante'
          : `${street}, nº ${number} - ${neighborhood}, ${city} - CEP: ${cep}`;

        if (tipoPedido === 'entrega' && user) {
          await updateUserAddress({
            cep,
            street,
            number,
            neighborhood,
            city,
            complement: complement || undefined,
            reference: reference || undefined,
          });
        }

        const newOrder = await createOrder({
          customerName: name,
          customerPhone: phone,
          address: formattedAddress,
          complement: complement || undefined,
          paymentMethod: 'mercadopago',
          paymentStatus: 'pending',
          statusPagamento: 'pendente',
          items: orderItems,
          subtotal,
          deliveryFee: finalDeliveryFee,
          total: finalTotal,
          
          tipoPedido,
          status: 'awaiting_payment',
          valorProdutos: subtotal,
          taxaEntrega: finalDeliveryFee,
          valorTotal: finalTotal,
          formaEntrega: tipoPedido === 'entrega' ? 'Entrega' : 'Retirada',
          endereco: tipoPedido === 'entrega' ? {
            cep,
            street,
            number,
            neighborhood,
            city,
            complement: complement || undefined,
            reference: reference || undefined,
          } : 'Retirada',
          usuario: user ? {
            uid: user.uid,
            name,
            email: user.email || '',
            phone,
          } : undefined,
          itens: orderItems,
          horarioPedido: new Date().toISOString(),
          cupom: appliedCoupon ? appliedCoupon.code : undefined,
          desconto: discountAmount > 0 ? discountAmount : undefined,
        });

        if (appliedCoupon && settings) {
          const updatedCoupons = settings.coupons?.map(c => {
            if (c.id === appliedCoupon.id) {
              return { ...c, usedCount: (c.usedCount || 0) + 1 };
            }
            return c;
          });
          if (updatedCoupons) {
            try {
              await updateSettings({
                ...settings,
                coupons: updatedCoupons
              });
            } catch (e) {
              console.error('Erro ao atualizar contador de uso do cupom:', e);
            }
          }
        }

        setPendingOrder(newOrder);

        // Fetch Mercado Pago preference using fetchApi
        try {
          const prefData = await fetchApi('/api/mercadopago/create-preference', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderData: {
                id: newOrder.id,
                customerName: name,
                customerEmail: user?.email || 'cliente@maestriagrill.com',
                customerPhone: phone,
                total: finalTotal,
                deliveryFee: finalDeliveryFee,
                items: orderItems,
              },
            }),
          });

          if (prefData && (prefData.init_point || prefData.sandbox_init_point)) {
            const redirectUrl = prefData.init_point || prefData.sandbox_init_point;
            setMpInitPoint(redirectUrl);
          } else if (prefData && prefData.error) {
            setMpError(prefData.details || prefData.error);
          }
        } catch (prefErr: any) {
          console.error('Erro ao gerar preferência Mercado Pago:', prefErr);
          setMpError(prefErr.message || 'Erro ao comunicar com Mercado Pago.');
        }
      } catch (err: any) {
        console.error('Error creating order for Mercado Pago:', err);
        setMpError('Ocorreu um erro ao preparar o pedido. Tente novamente.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Direct submission for Cash or Card Machine on delivery
    setIsSubmitting(true);
    try {
      const orderItems = cart.map((item) => ({
        productId: item.productId,
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
      }));

      const formattedAddress = tipoPedido === 'retirada'
        ? 'Retirada no Restaurante'
        : `${street}, nº ${number} - ${neighborhood}, ${city} - CEP: ${cep}`;

      if (tipoPedido === 'entrega' && user) {
        await updateUserAddress({
          cep,
          street,
          number,
          neighborhood,
          city,
          complement: complement || undefined,
          reference: reference || undefined,
        });
      }

      const newOrder = await createOrder({
        customerName: name,
        customerPhone: phone,
        address: formattedAddress,
        complement: complement || undefined,
        paymentMethod,
        paymentStatus: 'pending',
        statusPagamento: 'pendente',
        items: orderItems,
        subtotal,
        deliveryFee: finalDeliveryFee,
        total: finalTotal,
        
        tipoPedido,
        status: 'pending',
        valorProdutos: subtotal,
        taxaEntrega: finalDeliveryFee,
        valorTotal: finalTotal,
        formaEntrega: tipoPedido === 'entrega' ? 'Entrega' : 'Retirada',
        endereco: tipoPedido === 'entrega' ? {
          cep,
          street,
          number,
          neighborhood,
          city,
          complement: complement || undefined,
          reference: reference || undefined,
        } : 'Retirada',
        usuario: user ? {
          uid: user.uid,
          name,
          email: user.email || '',
          phone,
        } : undefined,
        itens: orderItems,
        horarioPedido: new Date().toISOString(),
        cupom: appliedCoupon ? appliedCoupon.code : undefined,
        desconto: discountAmount > 0 ? discountAmount : undefined,
      });

      if (appliedCoupon && settings) {
        const updatedCoupons = settings.coupons?.map(c => {
          if (c.id === appliedCoupon.id) {
            return { ...c, usedCount: (c.usedCount || 0) + 1 };
          }
          return c;
        });
        if (updatedCoupons) {
          try {
            await updateSettings({
              ...settings,
              coupons: updatedCoupons
            });
          } catch (e) {
            console.error('Erro ao atualizar contador de uso do cupom:', e);
          }
        }
      }

      setPlacedOrder(newOrder);
      clearCart();
    } catch (err) {
      console.error('Error creating order:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyPixKey = () => {
    setPixCopied(true);
    navigator.clipboard.writeText('00020126360014br.gov.bcb.pix0114gourmetbistromvp');
    setTimeout(() => setPixCopied(false), 2000);
  };

  // Loading indicator for authentication check
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
        <p className="text-xs text-gray-500 font-semibold">Carregando...</p>
      </div>
    );
  }

  // Private Route Protection Guard
  if (!user) {
    return (
      <div className="min-h-screen bg-transparent pb-28">
        <div className="bg-white/20 backdrop-blur-md px-4 py-4 border-b border-white/20">
          <div className="mx-auto max-w-lg w-full flex items-center gap-2">
            <button
              onClick={() => setActiveView('cart')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/50 border border-white/35 text-gray-600 hover:bg-white/80 transition"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="font-sans text-base font-extrabold text-gray-900">Finalizar Pedido</h2>
          </div>
        </div>

        <div className="mx-auto max-w-lg px-4 py-16 text-center flex flex-col items-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10 text-orange-600 border border-orange-500/20 mb-5">
            <User className="h-8 w-8" />
          </span>
          <h2 className="font-sans text-lg font-extrabold text-gray-900 mb-2">Login Obrigatório</h2>
          <p className="text-xs text-gray-500 max-w-xs leading-relaxed mb-6">
            Para continuar com seu pedido, salve seus endereços preferidos e acompanhe o preparo em tempo real, identifique-se na plataforma.
          </p>
          <button
            onClick={() => setIsAuthOpen(true)}
            className="rounded-2xl bg-orange-600 w-full max-w-xs py-3.5 text-xs font-bold text-white shadow-lg shadow-orange-500/15 hover:bg-orange-700 transition"
          >
            Entrar ou Criar uma Conta
          </button>
        </div>
      </div>
    );
  }

  // Success screen after placing the order
  if (placedOrder) {
    return (
      <div className="min-h-screen bg-transparent pb-28 pt-8 px-4 text-center">
        <div className="mx-auto max-w-lg">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-3xl border border-white/40 bg-white/45 p-6 shadow-xl backdrop-blur-md"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <CheckCircle className="h-10 w-10" />
            </div>

            <h2 className="mt-5 font-sans text-xl font-extrabold text-gray-900">Pedido Confirmado!</h2>
            <p className="mt-1 text-xs text-emerald-600 font-semibold uppercase tracking-wider">Código: {placedOrder.id}</p>
            <p className="mt-2 text-xs text-gray-500 leading-relaxed px-4">
              Obrigado, <strong>{placedOrder.customerName}</strong>! Seu pedido foi enviado para a cozinha do Maestria Grill e já está aguardando confirmação.
            </p>

            {/* Delivery vs Pickup info on Success */}
            <div className="mt-5 rounded-2xl bg-white/40 border border-white/20 p-4 text-left">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                {placedOrder.tipoPedido === 'retirada' ? (
                  <>
                    <Clock className="h-4 w-4 text-purple-600" /> Detalhes da Retirada
                  </>
                ) : (
                  <>
                    <Truck className="h-4 w-4 text-orange-500" /> Detalhes da Entrega
                  </>
                )}
              </h3>
              
              <div className="text-xs text-gray-600 flex flex-col gap-1.5">
                {placedOrder.tipoPedido === 'retirada' ? (
                  <>
                    <div>
                      <span className="font-bold text-gray-700 block text-[10px] uppercase">Endereço de Retirada</span>
                      <span className="font-medium text-gray-800">{settings?.address || 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-700 block text-[10px] uppercase">Previsão para Retirada</span>
                      <span className="font-semibold text-purple-700">25 a 35 minutos</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="font-bold text-gray-700 block text-[10px] uppercase">Endereço do Destinatário</span>
                      <span className="font-medium text-gray-800 break-words">{placedOrder.address}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-700 block text-[10px] uppercase">Status de Preparo</span>
                      <span className="font-semibold text-orange-600">Aguardando confirmação...</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Details Table */}
            <div className="mt-5 border-t border-white/20 pt-4 text-left text-xs text-gray-500">
              <div className="flex justify-between py-1">
                <span className="font-medium">Forma de pagamento:</span>
                <span className="font-bold text-gray-800 uppercase">{placedOrder.paymentMethod}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-medium">Total Pago:</span>
                <span className="font-bold text-gray-900">{formatPrice(placedOrder.total)}</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-2">
              {(profile?.role === 'admin' || profile?.role === 'superadmin') && (
                <button
                  onClick={() => setActiveView('admin')}
                  id="success-btn-admin"
                  className="w-full rounded-2xl bg-gray-900 py-3.5 text-xs font-bold text-white transition hover:bg-black"
                >
                  Ver Pedidos no Painel Admin
                </button>
              )}
              <button
                onClick={() => setActiveView('home')}
                id="success-btn-home"
                className="w-full rounded-2xl border border-white/30 bg-white/20 py-3.5 text-xs font-bold text-gray-700 transition hover:bg-white/45"
              >
                Voltar ao Início
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent pb-28">
      {/* Header bar back button */}
      <div className="bg-white/20 backdrop-blur-md px-4 py-4 border-b border-white/20 flex items-center justify-between">
        <div className="mx-auto max-w-lg w-full flex items-center gap-2">
          <button
            onClick={() => setActiveView('cart')}
            id="checkout-btn-back"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/50 border border-white/35 text-gray-600 hover:bg-white/80 transition"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="font-sans text-base font-extrabold text-gray-900">Checkout do Pedido</h2>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-5">
        {/* Quick autofill for grading/testing */}
        <div className="mb-4 rounded-2xl bg-orange-500/10 border border-orange-500/15 p-3 flex items-center justify-between text-xs text-orange-800">
          <span className="font-medium">Preencher dados de teste rápido?</span>
          <button
            type="button"
            onClick={handleAutoFill}
            id="btn-checkout-autofill"
            className="rounded-lg bg-orange-600 px-2.5 py-1.5 font-bold text-white hover:bg-orange-700 transition"
          >
            Preencher
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Choice of Order Type: Delivery vs Pickup */}
          {isPickupAllowed && isDeliveryAllowed && (
            <div className="rounded-2xl border border-white/35 bg-white/40 backdrop-blur-md p-1.5 flex gap-1.5 shadow-sm">
              <button
                type="button"
                onClick={() => setTipoPedido('entrega')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                  tipoPedido === 'entrega'
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-500/10'
                    : 'text-gray-500 hover:bg-white/40'
                }`}
              >
                <Truck className="h-4 w-4" /> 📦 Entrega
              </button>
              <button
                type="button"
                onClick={() => setTipoPedido('retirada')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                  tipoPedido === 'retirada'
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-500/10'
                    : 'text-gray-500 hover:bg-white/40'
                }`}
              >
                <MapPin className="h-4 w-4" /> 🏪 Retirada
              </button>
            </div>
          )}

          {/* Customer info card */}
          <div className="rounded-3xl border border-white/35 bg-white/40 backdrop-blur-md p-5 shadow-sm">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Seus Dados</h3>
            
            <div className="flex flex-col gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">Nome Completo</label>
                <input
                  type="text"
                  id="checkout-name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do destinatário"
                  className={`w-full rounded-xl border py-2.5 px-3.5 text-xs text-gray-800 outline-none transition focus:ring-4 focus:ring-orange-500/10 ${
                    errors.name ? 'border-rose-500 focus:border-rose-500 bg-white/40' : 'border-white/30 bg-white/45 focus:border-orange-500'
                  }`}
                />
                {errors.name && <span className="text-[10px] text-rose-500 mt-1 block">{errors.name}</span>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">Telefone / WhatsApp</label>
                <input
                  type="tel"
                  id="checkout-phone-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className={`w-full rounded-xl border py-2.5 px-3.5 text-xs text-gray-800 outline-none transition focus:ring-4 focus:ring-orange-500/10 ${
                    errors.phone ? 'border-rose-500 focus:border-rose-500 bg-white/40' : 'border-white/30 bg-white/45 focus:border-orange-500'
                  }`}
                />
                {errors.phone && <span className="text-[10px] text-rose-500 mt-1 block">{errors.phone}</span>}
              </div>
            </div>
          </div>

          {/* Delivery form OR Pickup details card */}
          {tipoPedido === 'entrega' ? (
            <div className="rounded-3xl border border-white/35 bg-white/40 backdrop-blur-md p-5 shadow-sm flex flex-col gap-3.5">
              <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Endereço de Entrega</h3>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="col-span-1">
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">CEP</label>
                  <input
                    type="text"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    placeholder="00000-000"
                    className={`w-full rounded-xl border py-2.5 px-3.5 text-xs text-gray-800 outline-none transition focus:ring-4 focus:ring-orange-500/10 ${
                      errors.cep ? 'border-rose-500 focus:border-rose-500 bg-white/40' : 'border-white/30 bg-white/45 focus:border-orange-500'
                    }`}
                  />
                  {errors.cep && <span className="text-[10px] text-rose-500 mt-1 block">{errors.cep}</span>}
                </div>

                <div className="col-span-1">
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">Bairro</label>
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Bairro de entrega"
                    className={`w-full rounded-xl border py-2.5 px-3.5 text-xs text-gray-800 outline-none transition focus:ring-4 focus:ring-orange-500/10 ${
                      errors.neighborhood ? 'border-rose-500 focus:border-rose-500 bg-white/40' : 'border-white/30 bg-white/45 focus:border-orange-500'
                    }`}
                  />
                  {errors.neighborhood && <span className="text-[10px] text-rose-500 mt-1 block">{errors.neighborhood}</span>}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">Rua / Logradouro</label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Nome da rua ou avenida"
                  className={`w-full rounded-xl border py-2.5 px-3.5 text-xs text-gray-800 outline-none transition focus:ring-4 focus:ring-orange-500/10 ${
                    errors.street ? 'border-rose-500 focus:border-rose-500 bg-white/40' : 'border-white/30 bg-white/45 focus:border-orange-500'
                  }`}
                />
                {errors.street && <span className="text-[10px] text-rose-500 mt-1 block">{errors.street}</span>}
              </div>

              <div className="grid grid-cols-3 gap-3.5">
                <div className="col-span-1">
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">Número</label>
                  <input
                    type="text"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="Nº"
                    className={`w-full rounded-xl border py-2.5 px-3.5 text-xs text-gray-800 outline-none transition focus:ring-4 focus:ring-orange-500/10 ${
                      errors.number ? 'border-rose-500 focus:border-rose-500 bg-white/40' : 'border-white/30 bg-white/45 focus:border-orange-500'
                    }`}
                  />
                  {errors.number && <span className="text-[10px] text-rose-500 mt-1 block">{errors.number}</span>}
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Cidade"
                    className={`w-full rounded-xl border py-2.5 px-3.5 text-xs text-gray-800 outline-none transition focus:ring-4 focus:ring-orange-500/10 ${
                      errors.city ? 'border-rose-500 focus:border-rose-500 bg-white/40' : 'border-white/30 bg-white/45 focus:border-orange-500'
                    }`}
                  />
                  {errors.city && <span className="text-[10px] text-rose-500 mt-1 block">{errors.city}</span>}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">Complemento</label>
                <input
                  type="text"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  placeholder="Apto, bloco, casa, etc. (Opcional)"
                  className="w-full rounded-xl border border-white/30 bg-white/45 py-2.5 px-3.5 text-xs text-gray-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">Ponto de Referência</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Próximo a qual comércio ou local? (Opcional)"
                  className="w-full rounded-xl border border-white/30 bg-white/45 py-2.5 px-3.5 text-xs text-gray-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-white/35 bg-white/40 backdrop-blur-md p-5 shadow-sm">
              <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Informações de Retirada</h3>
              
              <div className="flex flex-col gap-4">
                <div className="flex gap-3 items-start">
                  <MapPin className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-gray-400">Endereço do Maestria Grill</span>
                    <p className="text-xs text-gray-800 font-semibold leading-relaxed">
                      {settings?.address || 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <Clock className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-gray-400">Tempo Estimado para Retirada</span>
                    <p className="text-xs text-purple-700 font-extrabold">
                      25 a 35 minutos
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-normal">
                      Prepare-se para buscar o seu churrasco saindo da brasa direto para a sua mesa!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment selector card */}
          <div className="rounded-3xl border border-white/35 bg-white/40 backdrop-blur-md p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-400">Forma de Pagamento</h3>
              <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Checkout Transparente
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="payment-option-online"
                onClick={() => {
                  setPaymentOption('mercadopago');
                  setPendingOrder(null);
                }}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3.5 transition text-center ${
                  paymentOption === 'mercadopago'
                    ? 'border-orange-500 bg-orange-500/15 text-orange-600 font-extrabold border-orange-500/30 shadow-xs'
                    : 'border-white/30 bg-white/35 text-gray-500 hover:bg-white/60'
                }`}
              >
                <div className="flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-[11px] font-bold">Pagamento On-line</span>
                </div>
                <span className="text-[9px] text-gray-500 leading-tight">
                  Pix ou Cartão de Crédito/Débito
                </span>
              </button>

              <button
                type="button"
                id="payment-option-delivery"
                onClick={() => setPaymentOption('delivery')}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3.5 transition text-center ${
                  paymentOption === 'delivery'
                    ? 'border-orange-500 bg-orange-500/15 text-orange-600 font-bold border-orange-500/30 shadow-xs'
                    : 'border-white/30 bg-white/35 text-gray-500 hover:bg-white/60'
                }`}
              >
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <span className="text-[11px] font-bold">Pagar na Entrega</span>
                </div>
                <span className="text-[9px] text-gray-500 leading-tight">
                  Dinheiro ou Maquininha
                </span>
              </button>
            </div>

            {/* Sub-options for Pagamento On-line */}
            {paymentOption === 'mercadopago' && (
              <div className="pt-3 border-t border-white/20 space-y-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase">
                  Escolha como deseja pagar on-line:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setOnlineSubMethod('pix')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition text-center ${
                      onlineSubMethod === 'pix'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-extrabold shadow-2xs'
                        : 'border-gray-200/80 bg-white/50 text-gray-600 hover:bg-white'
                    }`}
                  >
                    <span className="text-xs font-black text-emerald-600">⚡ Pix</span>
                    <span className="text-[9px] text-gray-500 mt-0.5">Aprovação imediata</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOnlineSubMethod('card')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition text-center ${
                      onlineSubMethod === 'card'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-extrabold shadow-2xs'
                        : 'border-gray-200/80 bg-white/50 text-gray-600 hover:bg-white'
                    }`}
                  >
                    <span className="text-xs font-black text-sky-600">💳 Cartão</span>
                    <span className="text-[9px] text-gray-500 mt-0.5">Crédito ou Débito</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOnlineSubMethod('all')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition text-center ${
                      onlineSubMethod === 'all'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-extrabold shadow-2xs'
                        : 'border-gray-200/80 bg-white/50 text-gray-600 hover:bg-white'
                    }`}
                  >
                    <span className="text-xs font-black text-purple-600">🌐 Todas</span>
                    <span className="text-[9px] text-gray-500 mt-0.5">Pix e Cartão</span>
                  </button>
                </div>
              </div>
            )}

            {/* Offline Delivery Payment Methods */}
            {paymentOption === 'delivery' && (
              <div className="pt-2 border-t border-white/20">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Selecione como deseja pagar no momento da entrega:</p>
                <div className="grid grid-cols-2 gap-2">
                  {isCardEnabled && (
                    <button
                      type="button"
                      id="payment-card"
                      onClick={() => setPaymentMethod('card')}
                      className={`flex items-center justify-center gap-1.5 rounded-2xl border p-3 transition ${
                        paymentMethod === 'card'
                          ? 'border-orange-500 bg-orange-500/15 text-orange-600 font-bold border-orange-500/25'
                          : 'border-white/30 bg-white/35 text-gray-500 hover:bg-white/60'
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      <span className="text-[10px]">Cartão (Maquininha)</span>
                    </button>
                  )}

                  {isCashEnabled && (
                    <button
                      type="button"
                      id="payment-cash"
                      onClick={() => setPaymentMethod('cash')}
                      className={`flex items-center justify-center gap-1.5 rounded-2xl border p-3 transition ${
                        paymentMethod === 'cash'
                          ? 'border-orange-500 bg-orange-500/15 text-orange-600 font-bold border-orange-500/25'
                          : 'border-white/30 bg-white/35 text-gray-500 hover:bg-white/60'
                      }`}
                    >
                      <DollarSign className="h-4 w-4" />
                      <span className="text-[10px]">Dinheiro</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mercado Pago Error Alert */}
          {mpError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{mpError}</span>
            </div>
          )}

          {/* Mercado Pago Checkout Container */}
          {paymentOption === 'mercadopago' && pendingOrder && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-emerald-300/80 bg-white p-4 sm:p-5 shadow-lg space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block">
                    Pagamento On-line - Pedido #{pendingOrder.id}
                  </span>
                  <h4 className="text-sm font-extrabold text-gray-900">
                    {onlineSubMethod === 'pix'
                      ? 'Pagamento via Pix (Checkout Transparente)'
                      : onlineSubMethod === 'card'
                      ? 'Pagamento via Cartão de Crédito/Débito'
                      : 'Pagamento On-line (Pix ou Cartão)'}
                  </h4>
                </div>
                <span className="text-sm font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-1">
                  {formatPrice(finalTotal)}
                </span>
              </div>

              {/* Online Payment Menu (Pix QR Code, Copia e Cola & Cartão) */}
              <div className="pt-1">
                <OnlinePaymentMenu
                  amount={finalTotal}
                  orderId={pendingOrder.id}
                  customerName={name}
                  customerEmail={user?.email || 'cliente@maestriagrill.com'}
                  customerPhone={phone}
                  selectedSubMethod={onlineSubMethod}
                  items={cart.map((item) => ({
                    productId: item.productId,
                    productName: item.name,
                    quantity: item.quantity,
                    price: item.price,
                  }))}
                  deliveryFee={finalDeliveryFee}
                  onSuccess={(result) => {
                    setPlacedOrder({
                      ...pendingOrder,
                      paymentStatus: 'paid',
                      statusPagamento: 'pago',
                      status: 'pending',
                    });
                    clearCart();
                  }}
                  onError={(errMessage) => {
                    setMpError(errMessage);
                  }}
                />
              </div>
            </motion.div>
          )}

          {/* Cupom de Desconto */}
          <div className="rounded-3xl border border-white/35 bg-white/40 backdrop-blur-md p-5 shadow-sm">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Cupom de Desconto</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Ex: BEMVINDO"
                className="flex-1 rounded-xl border border-white/30 bg-white/40 px-3 py-2 text-xs font-semibold placeholder-gray-400 focus:border-orange-500 focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-gray-800 transition shadow-sm"
              >
                Aplicar
              </button>
            </div>
            {couponError && (
              <p className="mt-2 text-[10px] font-semibold text-rose-600 flex items-center gap-1">
                <span className="text-xs">⚠️</span> {couponError}
              </p>
            )}
            {couponSuccess && (
              <p className="mt-2 text-[10px] font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 border border-emerald-100 rounded-xl px-2.5 py-1">
                <span className="text-xs">✅</span> {couponSuccess}
              </p>
            )}
          </div>

          {/* Checkout review specs */}
          <div className="rounded-3xl border border-white/35 bg-white/40 backdrop-blur-md p-5 shadow-sm">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Resumo Final</h3>
            <div className="flex justify-between text-xs py-1.5 border-b border-white/10 text-gray-500 font-medium">
              <span>Valor dos itens</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs py-1.5 border-b border-white/10 text-emerald-600 font-semibold">
                <span>Desconto ({appliedCoupon?.code})</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs py-1.5 border-b border-white/10 text-gray-500 font-medium">
              <span>Taxa de entrega</span>
              <span>{finalDeliveryFee === 0 ? 'Grátis' : formatPrice(finalDeliveryFee)}</span>
            </div>
            <div className="flex justify-between text-sm py-2 text-gray-900 font-extrabold">
              <span>Valor Total</span>
              <span>{formatPrice(finalTotal)}</span>
            </div>
          </div>

          {/* Order confirmation button */}
          <div className="mt-2">
            {paymentOption === 'mercadopago' && pendingOrder ? (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center">
                <span className="text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-emerald-600" /> Pedido #{pendingOrder.id} gerado!
                </span>
                <p className="text-[10px] text-gray-600 mt-1">
                  Selecione seu método de pagamento no quadro do Mercado Pago acima para concluir.
                </p>
              </div>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                id="btn-submit-order"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 py-4 text-xs font-bold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-700 transition active:scale-98 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Processando pedido...
                  </>
                ) : paymentOption === 'mercadopago' ? (
                  <>
                    <ShieldCheck className="h-4 w-4 text-white" />
                    Ir para Pagamento Mercado Pago
                  </>
                ) : (
                  'Confirmar e Enviar Pedido'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
