import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initMercadoPago, Payment, StatusScreen } from '@mercadopago/sdk-react';
import { Loader2, ShieldCheck, Lock, AlertCircle } from 'lucide-react';
import { fetchApi } from '../utils/api';

interface MercadoPagoCheckoutBrickProps {
  amount: number;
  orderId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: Array<{ productId: string; productName: string; quantity: number; price: number }>;
  deliveryFee: number;
  selectedSubMethod?: 'all' | 'pix' | 'card';
  onSuccess: (paymentData: any) => void;
  onError: (errorMessage: string) => void;
}

const PUBLIC_KEY =
  (import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY as string) ||
  'APP_USR-45e3bea4-d7ee-4847-af4b-251fba799c6f';

// Initialize SDK with Public Key
try {
  initMercadoPago(PUBLIC_KEY, { locale: 'pt-BR' });
} catch (e) {
  console.warn('Mercado Pago SDK initialization:', e);
}

export default function MercadoPagoCheckoutBrick({
  amount,
  orderId,
  customerName,
  customerEmail = 'cliente@maestriagrill.com',
  customerPhone = '',
  items,
  deliveryFee,
  selectedSubMethod = 'all',
  onSuccess,
  onError,
}: MercadoPagoCheckoutBrickProps) {
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [loadingPref, setLoadingPref] = useState(true);
  const [prefError, setPrefError] = useState<string | null>(null);

  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [brickReady, setBrickReady] = useState(false);

  const validEmail = customerEmail && customerEmail.includes('@') && customerEmail.includes('.')
    ? customerEmail
    : 'cliente@maestriagrill.com';

  // Fetch preference ID from backend using order details
  useEffect(() => {
    let isMounted = true;
    async function createPreference() {
      try {
        setLoadingPref(true);
        setPrefError(null);
        setBrickReady(false);

        const data = await fetchApi('/api/mercadopago/create-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderData: {
              id: orderId,
              customerName,
              customerEmail: validEmail,
              customerPhone,
              total: amount,
              deliveryFee,
              items,
            },
          }),
        });

        if (!data || !data.id) {
          throw new Error('Falha ao gerar a preferência de pagamento do Mercado Pago.');
        }

        if (isMounted) {
          setPreferenceId(data.id);
        }
      } catch (err: any) {
        console.error('[Mercado Pago Preference Error]:', err);
        if (isMounted) {
          setPrefError(err.message || 'Erro ao carregar preferência.');
          onError(err.message || 'Erro ao carregar preferência do Mercado Pago.');
        }
      } finally {
        if (isMounted) {
          setLoadingPref(false);
        }
      }
    }

    createPreference();
    return () => {
      isMounted = false;
    };
  }, [orderId, amount, customerName, validEmail, customerPhone, deliveryFee, items, onError]);

  // Handle payment processing via official Brick callback
  const handleSubmit = useCallback(
    async (param: any) => {
      const { formData } = param;
      try {
        const result = await fetchApi('/api/mercadopago/process-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formData,
            orderData: {
              id: orderId,
              customerName,
              customerEmail: validEmail,
              customerPhone,
              total: amount,
              deliveryFee,
              items,
            },
          }),
        });

        if (result && result.success && result.id) {
          const newPaymentId = String(result.id);
          setPaymentId(newPaymentId);

          if (result.status === 'approved') {
            onSuccess(result);
          }
        } else {
          const errorMsg = result?.error || result?.details || 'Falha ao processar pagamento.';
          onError(errorMsg);
          throw new Error(errorMsg);
        }
      } catch (err: any) {
        console.error('[Process Payment Exception]:', err);
        const errMsg = err.message || 'Erro na comunicação com o servidor de pagamentos.';
        onError(errMsg);
        throw new Error(errMsg);
      }
    },
    [orderId, customerName, validEmail, customerPhone, amount, deliveryFee, items, onSuccess, onError]
  );

  // Stable initialization config for Brick
  const initializationConfig = useMemo(() => {
    if (!preferenceId) return undefined;
    return {
      amount: Math.round(amount * 100) / 100,
      preferenceId,
      payer: {
        email: validEmail,
      },
    };
  }, [amount, preferenceId, validEmail]);

  // Stable customization config for Brick
  const customizationConfig = useMemo(() => {
    let paymentMethods: any = {
      ticket: 'all',
      bankTransfer: 'all',
      creditCard: 'all',
      debitCard: 'all',
      mercadoPago: 'all',
    };

    if (selectedSubMethod === 'pix') {
      paymentMethods = {
        ticket: 'none',
        bankTransfer: 'all',
        creditCard: 'none',
        debitCard: 'none',
        mercadoPago: 'none',
      };
    } else if (selectedSubMethod === 'card') {
      paymentMethods = {
        ticket: 'none',
        bankTransfer: 'none',
        creditCard: 'all',
        debitCard: 'all',
        mercadoPago: 'none',
      };
    }

    return {
      paymentMethods,
      visual: {
        hideFormTitle: false,
        style: {
          theme: 'default' as const,
          customVariables: {
            formBackgroundColor: '#ffffff',
            baseColor: '#ea580c',
          },
        },
      },
    };
  }, [selectedSubMethod]);

  // If payment was created, render the official Mercado Pago StatusScreen Brick
  if (paymentId) {
    return (
      <div className="w-full min-h-[300px]">
        <StatusScreen
          initialization={{ paymentId }}
          onReady={() => console.log('Status Screen Brick do Mercado Pago pronto.')}
          onError={(error) => console.error('Status Screen Brick error:', error)}
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Maestria Grill Outer Layout Frame */}
      <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200/80 p-3.5 rounded-2xl">
        <div className="flex items-center gap-2.5 text-emerald-950">
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <span className="block text-xs font-extrabold">Pagamento On-line Transparente</span>
            <span className="block text-[10px] text-emerald-700 font-medium">
              Processado em ambiente seguro diretamente no site
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-white px-2.5 py-1 rounded-lg border border-gray-100 shadow-2xs">
          <Lock className="h-3 w-3 text-emerald-600" /> SSL 256-bit
        </div>
      </div>

      {prefError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{prefError}</span>
        </div>
      )}

      {/* Official Mercado Pago Payment Brick Container */}
      <div className="relative min-h-[350px] rounded-3xl border border-gray-200/80 bg-white p-2 shadow-xs overflow-hidden">
        {loadingPref ? (
          <div className="flex flex-col items-center justify-center min-h-[320px] gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            <p className="text-xs font-bold text-gray-600">Carregando Checkout Transparente...</p>
          </div>
        ) : preferenceId && initializationConfig ? (
          <>
            {!brickReady && (
              <div className="absolute inset-0 bg-white flex flex-col items-center justify-center gap-3 z-10">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                <p className="text-xs font-bold text-gray-600">Carregando formulário de pagamento seguro...</p>
              </div>
            )}
            <div key={`${preferenceId}-${selectedSubMethod}`}>
              <Payment
                initialization={initializationConfig}
                customization={customizationConfig}
                onSubmit={handleSubmit}
                onReady={() => setBrickReady(true)}
                onError={(error: any) => {
                  console.error('[Mercado Pago Payment Brick Error]:', error);
                  setBrickReady(true);
                  if (error?.message) {
                    setPrefError(`Aviso Mercado Pago: ${error.message}`);
                  }
                }}
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

