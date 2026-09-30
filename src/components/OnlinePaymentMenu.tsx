import React, { useState, useEffect } from 'react';
import {
  QrCode,
  CreditCard,
  Copy,
  Check,
  ShieldCheck,
  Loader2,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { fetchApi } from '../utils/api';
import MercadoPagoCheckoutBrick from './MercadoPagoCheckoutBrick';

interface OnlinePaymentMenuProps {
  amount: number;
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: Array<{ productId: string; productName: string; quantity: number; price: number }>;
  deliveryFee: number;
  selectedSubMethod?: 'pix' | 'card' | 'all';
  onSuccess: (paymentData: any) => void;
  onError: (errorMessage: string) => void;
}

export default function OnlinePaymentMenu({
  amount,
  orderId,
  customerName,
  customerEmail,
  customerPhone,
  items,
  deliveryFee,
  selectedSubMethod = 'pix',
  onSuccess,
  onError,
}: OnlinePaymentMenuProps) {
  const [activeTab, setActiveTab] = useState<'pix' | 'card'>(
    selectedSubMethod === 'card' ? 'card' : 'pix'
  );

  // Pix state
  const [loadingPix, setLoadingPix] = useState(false);
  const [pixData, setPixData] = useState<{
    paymentId: string;
    qrCode: string;
    qrCodeBase64: string;
    status: string;
  } | null>(null);
  const [pixError, setPixError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [paymentApproved, setPaymentApproved] = useState(false);

  // Preference / Card direct link state
  const [loadingPref, setLoadingPref] = useState(false);
  const [initPoint, setInitPoint] = useState<string | null>(null);

  // Sync tab with props
  useEffect(() => {
    if (selectedSubMethod === 'card') {
      setActiveTab('card');
    } else if (selectedSubMethod === 'pix') {
      setActiveTab('pix');
    }
  }, [selectedSubMethod]);

  // Generate Pix on tab selection
  const handleGeneratePix = async () => {
    if (loadingPix || paymentApproved) return;
    try {
      setLoadingPix(true);
      setPixError(null);

      const res = await fetchApi('/api/mercadopago/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderData: {
            id: orderId,
            total: amount,
            customerName,
            customerEmail,
            customerPhone,
            deliveryFee,
            items,
          },
        }),
      });

      if (res && res.success && res.paymentId) {
        setPixData({
          paymentId: String(res.paymentId),
          qrCode: res.qrCode || '',
          qrCodeBase64: res.qrCodeBase64 || '',
          status: res.status || 'pending',
        });
      } else {
        throw new Error(res?.error || res?.details || 'Falha ao gerar QR Code Pix.');
      }
    } catch (err: any) {
      console.error('[Generate Pix Error]:', err);
      setPixError(err.message || 'Não foi possível gerar o código Pix. Tente novamente.');
      onError(err.message);
    } finally {
      setLoadingPix(false);
    }
  };

  // Generate Direct Preference Link for Card Checkout
  const handleGeneratePreference = async () => {
    if (initPoint || loadingPref) return;
    try {
      setLoadingPref(true);
      const res = await fetchApi('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderData: {
            id: orderId,
            total: amount,
            customerName,
            customerEmail,
            customerPhone,
            deliveryFee,
            items,
          },
        }),
      });

      if (res && res.init_point) {
        setInitPoint(res.init_point);
      }
    } catch (err: any) {
      console.error('[Preference Link Error]:', err);
    } finally {
      setLoadingPref(false);
    }
  };

  // Auto-generate Pix when Pix tab is selected
  useEffect(() => {
    if (activeTab === 'pix' && !pixData && !loadingPix) {
      handleGeneratePix();
    }
    if (activeTab === 'card') {
      handleGeneratePreference();
    }
  }, [activeTab]);

  // Polling Pix payment status
  useEffect(() => {
    if (!pixData?.paymentId || paymentApproved) return;

    const checkStatus = async () => {
      try {
        const res = await fetchApi(`/api/mercadopago/payment-status/${pixData.paymentId}`);
        if (res && res.status === 'approved') {
          setPaymentApproved(true);
          onSuccess(res);
        }
      } catch (err) {
        console.warn('[Pix Polling Check Warning]:', err);
      }
    };

    const interval = setInterval(checkStatus, 3500);
    return () => clearInterval(interval);
  }, [pixData?.paymentId, paymentApproved, onSuccess]);

  // Manual Check Button Handler
  const handleManualCheckStatus = async () => {
    if (!pixData?.paymentId) return;
    try {
      setIsCheckingStatus(true);
      const res = await fetchApi(`/api/mercadopago/payment-status/${pixData.paymentId}`);
      if (res && res.status === 'approved') {
        setPaymentApproved(true);
        onSuccess(res);
      } else {
        alert('Ainda aguardando a confirmação do pagamento no seu banco...');
      }
    } catch (err) {
      console.error('[Manual Check Error]:', err);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Copy Pix Code to Clipboard
  const handleCopyPix = () => {
    if (!pixData?.qrCode) return;
    navigator.clipboard.writeText(pixData.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="w-full space-y-4 text-left">
      {/* Header Badge */}
      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl">
        <div className="flex items-center gap-2.5 text-emerald-950">
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <span className="block text-xs font-extrabold">Pagamento On-line Transparente</span>
            <span className="block text-[10px] text-emerald-700 font-medium">
              Sincronizado diretamente com a API do Mercado Pago
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-white px-2.5 py-1 rounded-lg border border-gray-100 shadow-2xs">
          <Lock className="h-3 w-3 text-emerald-600" /> SSL 256-bit
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl border border-gray-200 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('pix')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl transition ${
            activeTab === 'pix'
              ? 'bg-emerald-600 text-white shadow-md font-extrabold scale-[1.02]'
              : 'text-gray-700 hover:text-gray-900 font-medium hover:bg-gray-200/60'
          }`}
        >
          <QrCode className="h-4 w-4" />
          <span>Pix (Instantâneo)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('card')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl transition ${
            activeTab === 'card'
              ? 'bg-emerald-600 text-white shadow-md font-extrabold scale-[1.02]'
              : 'text-gray-700 hover:text-gray-900 font-medium hover:bg-gray-200/60'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Cartão de Crédito/Débito</span>
        </button>
      </div>

      {/* TAB 1: PIX CONTENT */}
      {activeTab === 'pix' && (
        <div className="space-y-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm text-center">
          {paymentApproved ? (
            <div className="p-6 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto animate-bounce" />
              <h4 className="text-base font-extrabold text-emerald-900">
                Pagamento Pix Aprovado com Sucesso!
              </h4>
              <p className="text-xs text-emerald-700 font-medium">
                O seu pagamento foi confirmado e seu pedido já foi enviado ao restaurante!
              </p>
            </div>
          ) : loadingPix ? (
            <div className="py-10 space-y-3">
              <Loader2 className="h-9 w-9 text-emerald-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-gray-700">
                Gerando QR Code Pix diretamente com o Mercado Pago...
              </p>
            </div>
          ) : pixError ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3 text-red-800 text-xs">
              <AlertCircle className="h-6 w-6 text-red-600 mx-auto" />
              <p className="font-bold">{pixError}</p>
              <button
                type="button"
                onClick={handleGeneratePix}
                className="inline-flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm hover:bg-red-700"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Tentar Gerar Novamente
              </button>
            </div>
          ) : pixData ? (
            <div className="space-y-4">
              {/* QR Code Image */}
              <div className="inline-block p-3 bg-white rounded-2xl border-2 border-emerald-500/30 shadow-md">
                {pixData.qrCodeBase64 ? (
                  <img
                    src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                    alt="QR Code Pix Mercado Pago"
                    className="w-48 h-48 sm:w-56 sm:h-56 mx-auto rounded-lg object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center bg-gray-50 text-gray-400 text-xs font-bold">
                    [QR Code Pix Indisponível]
                  </div>
                )}
              </div>

              {/* Amount Display */}
              <div>
                <span className="text-[11px] text-gray-500 font-bold uppercase block">
                  Valor Total do Pix
                </span>
                <span className="text-2xl font-black text-emerald-700">
                  R$ {amount.toFixed(2).replace('.', ',')}
                </span>
              </div>

              {/* Pix Copia e Cola Payload */}
              <div className="space-y-2 text-left">
                <label className="text-xs font-extrabold text-gray-700 block">
                  Código Pix Copia e Cola:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={pixData.qrCode}
                    className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-[11px] font-mono text-gray-800 truncate focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-extrabold text-xs text-white shadow-md transition shrink-0 ${
                      copied ? 'bg-emerald-600' : 'bg-orange-600 hover:bg-orange-700'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copiar Pix</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Instructions & Automatic Polling Status */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-950 text-left space-y-1.5">
                <p className="font-extrabold flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Aguardando confirmação do banco...
                </p>
                <p className="text-[11px] text-emerald-800 leading-relaxed font-medium">
                  Abra o aplicativo do seu banco, escolha <strong>Pix &gt; Pagar com QR Code ou Pix Copia e Cola</strong>. Assim que pagar, esta tela será atualizada automaticamente!
                </p>
              </div>

              {/* Manual Check Status Button */}
              <button
                type="button"
                onClick={handleManualCheckStatus}
                disabled={isCheckingStatus}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white text-xs font-extrabold py-3 px-4 rounded-xl shadow-md hover:bg-gray-800 transition"
              >
                {isCheckingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span>Já fiz o pagamento no meu banco</span>
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 2: CREDIT / DEBIT CARD CONTENT */}
      {activeTab === 'card' && (
        <div className="space-y-4">
          {/* Direct Mercado Pago Direct Link Card */}
          {initPoint && (
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl space-y-3 text-center">
              <div className="flex items-center justify-center gap-2 text-sky-900 font-extrabold text-xs">
                <ExternalLink className="h-4 w-4 text-sky-600" />
                <span>Pagar via Checkout Seguro Mercado Pago</span>
              </div>
              <p className="text-[11px] text-sky-800 leading-relaxed font-medium">
                Para pagamento com cartão de crédito, débito ou saldo do Mercado Pago com 100% de compatibilidade em todos os navegadores, clique abaixo:
              </p>
              <button
                type="button"
                onClick={() => window.open(initPoint, '_blank')}
                className="w-full flex items-center justify-center gap-2 bg-sky-600 text-white text-xs font-extrabold py-3 px-4 rounded-xl shadow-md hover:bg-sky-700 active:scale-98 transition"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir Checkout do Mercado Pago
              </button>
            </div>
          )}

          {/* Embedded Form (Mercado Pago Brick) */}
          <div className="pt-2">
            <MercadoPagoCheckoutBrick
              amount={amount}
              orderId={orderId}
              customerName={customerName}
              customerEmail={customerEmail}
              customerPhone={customerPhone}
              selectedSubMethod="card"
              items={items}
              deliveryFee={deliveryFee}
              onSuccess={onSuccess}
              onError={onError}
            />
          </div>
        </div>
      )}
    </div>
  );
}
