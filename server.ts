import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { MercadoPagoConfig, Payment, Preference, PaymentRefund } from 'mercadopago';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

// Initialize Supabase Server Client
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServer = SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const firebaseServerApp = initializeApp(firebaseConfig, 'server-app');
const db = getFirestore(firebaseServerApp, firebaseConfig.firestoreDatabaseId);

// Helper to remove any undefined fields before writing to Firestore
function cleanFirestoreData<T extends Record<string, any>>(data: T): Partial<T> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned as Partial<T>;
}

// Environment setup for Mercado Pago Credentials
const MERCADOPAGO_ACCESS_TOKEN =
  process.env.MERCADOPAGO_ACCESS_TOKEN ||
  'APP_USR-4612394528193802-072320-97e3710081e80df08135f600e23b1d04-493924237';

const MERCADOPAGO_WEBHOOK_SECRET =
  process.env.MERCADOPAGO_WEBHOOK_SECRET ||
  '5b243ea8deba910f74cc4cb3553a2876a82af67f992c816108d5abd286d0a686';

const mpClient = new MercadoPagoConfig({
  accessToken: MERCADOPAGO_ACCESS_TOKEN,
});
const mpPayment = new Payment(mpClient);
const mpPreference = new Preference(mpClient);
const mpRefund = new PaymentRefund(mpClient);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // CORS Middleware for Hostinger and external cross-origin requests (e.g. maestriagrill.site)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Ensure uploads directory exists for resilient image storage
  const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // Serve static uploaded files
  app.use('/api/storage/files', express.static(UPLOADS_DIR, {
    maxAge: '1y',
    immutable: true
  }));

  // Fallback upload endpoint when Supabase Storage bucket is not yet created
  app.post('/api/storage/upload', async (req, res) => {
    try {
      const { bucket, fileName, base64Data } = req.body;
      if (!bucket || !fileName || !base64Data) {
        return res.status(400).json({ error: 'Parâmetros incompletos para upload' });
      }

      const safeBucket = String(bucket).replace(/[^a-zA-Z0-9_-]/g, '');
      const safeFileName = String(fileName).replace(/[^a-zA-Z0-9_.-]/g, '');
      const targetDir = path.join(UPLOADS_DIR, safeBucket);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const filePath = path.join(targetDir, safeFileName);
      const cleanBase64 = String(base64Data).replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      fs.writeFileSync(filePath, buffer);

      const publicUrl = `/api/storage/files/${safeBucket}/${safeFileName}`;
      console.log(`[Storage Fallback] Imagem gravada com sucesso em ${publicUrl}`);
      return res.json({ publicUrl, success: true });
    } catch (err: any) {
      console.error('[Storage Fallback Error]:', err);
      return res.status(500).json({ error: err?.message || 'Falha ao salvar imagem' });
    }
  });

  // Seed initial Firestore collections and default configs if empty
  app.post('/api/database/seed', async (req, res) => {
    try {
      const settingsRef = doc(db, 'settings', 'main');
      const settingsSnap = await getDoc(settingsRef);
      if (!settingsSnap.exists()) {
        await updateDoc(settingsRef, {
          name: 'Maestria Grill',
          description: 'O autêntico sabor da brasa com carnes nobres grelhadas com perfeição e paixão em servir.',
          logoUrl: '🥩',
          deliveryFee: 7.00,
          phone: '(11) 99999-8888',
          address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
          whatsapp: '(11) 99999-8888',
          instagram: '@maestriagrill',
          email: 'contato@maestriagrill.com.br',
          horarioFuncionamento: 'Segunda a Sábado, das 18h às 23h30',
          minOrderValue: 30.00,
          maxDeliveryDistance: 10,
          avgDeliveryTime: '35 - 50 min',
          avgPickupTime: '15 - 25 min',
          allowPickup: true,
          allowDelivery: true,
          paymentPix: true,
          paymentCash: true,
          paymentCreditCard: true,
          paymentDebitCard: true,
          primaryColor: '#ea580c',
          secondaryColor: '#f97316',
          backgroundColor: '#fff7f4',
          maintenanceMode: false
        }).catch(async () => {
          // If update fails because doc doesn't exist, use setDoc
          const { setDoc } = await import('firebase/firestore');
          await setDoc(settingsRef, {
            name: 'Maestria Grill',
            description: 'O autêntico sabor da brasa com carnes nobres grelhadas com perfeição e paixão em servir.',
            logoUrl: '🥩',
            deliveryFee: 7.00,
            phone: '(11) 99999-8888',
            address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
            whatsapp: '(11) 99999-8888',
            instagram: '@maestriagrill',
            email: 'contato@maestriagrill.com.br',
            horarioFuncionamento: 'Segunda a Sábado, das 18h às 23h30',
            minOrderValue: 30.00,
            maxDeliveryDistance: 10,
            avgDeliveryTime: '35 - 50 min',
            avgPickupTime: '15 - 25 min',
            allowPickup: true,
            allowDelivery: true,
            paymentPix: true,
            paymentCash: true,
            paymentCreditCard: true,
            paymentDebitCard: true,
            primaryColor: '#ea580c',
            secondaryColor: '#f97316',
            backgroundColor: '#fff7f4',
            maintenanceMode: false
          });
        });
      }
      return res.json({ success: true, message: 'Banco de dados configurado com sucesso!' });
    } catch (e: any) {
      console.error('[DB Seed Error]:', e);
      return res.status(500).json({ error: e?.message || 'Falha ao inicializar dados' });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Maestria Grill Mercado Pago API' });
  });

  // GET Mercado Pago Config Info
  app.get('/api/mercadopago/config', (req, res) => {
    const publicKey =
      process.env.VITE_MERCADOPAGO_PUBLIC_KEY ||
      'APP_USR-45e3bea4-d7ee-4847-af4b-251fba799c6f';
    res.json({
      publicKey,
      isProduction: !publicKey.startsWith('TEST-'),
    });
  });

  // POST /api/mercadopago/process-payment (Checkout Bricks Backend Endpoint)
  app.post('/api/mercadopago/process-payment', async (req, res) => {
    try {
      const { formData, orderData } = req.body;

      if (!formData || !orderData) {
        return res.status(400).json({
          error: 'Dados do pagamento e do pedido são obrigatórios.',
        });
      }

      const rawAppUrl = process.env.APP_URL;
      const isPlaceholderAppUrl = !rawAppUrl || rawAppUrl === 'MY_APP_URL';
      const host = req.headers['x-forwarded-host'] || req.get('host') || 'maestriagrill.site';
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const appBaseUrl = (!isPlaceholderAppUrl ? rawAppUrl : `${protocol}://${host}`).replace(/\/$/, '');
      const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');

      const amount = Number(formData.transaction_amount || orderData.total);
      const email =
        formData.payer?.email ||
        orderData.customerEmail ||
        'cliente@maestriagrill.com';

      const firstName =
        formData.payer?.first_name ||
        (orderData.customerName ? orderData.customerName.split(' ')[0] : 'Cliente');
      const lastName =
        formData.payer?.last_name ||
        (orderData.customerName ? orderData.customerName.split(' ').slice(1).join(' ') : 'Maestria') ||
        'Grill';

      const paymentBody: any = {
        transaction_amount: amount,
        token: formData.token,
        description: `Pedido #${orderData.id} - Maestria Grill`,
        payment_method_id: formData.payment_method_id,
        payer: {
          email,
          first_name: firstName,
          last_name: lastName,
          identification: formData.payer?.identification,
        },
        installments: Number(formData.installments || 1),
        external_reference: String(orderData.id),
      };

      if (!isLocalhost && !appBaseUrl.includes('localhost')) {
        paymentBody.notification_url = `${appBaseUrl}/api/mercadopago/webhook`;
      }

      if (formData.issuer_id) {
        paymentBody.issuer_id = String(formData.issuer_id);
      }

      console.log(`[Mercado Pago API] Criando pagamento para Pedido #${orderData.id}...`);
      const paymentResponse = await mpPayment.create({ body: paymentBody });

      console.log(
        `[Mercado Pago API] Resposta Pagamento #${paymentResponse.id}: Status ${paymentResponse.status}`
      );

      // If approved immediately (e.g. Credit/Debit Card or Mercado Pago Balance)
      if (paymentResponse.status === 'approved') {
        try {
          const orderRef = doc(db, 'orders', String(orderData.id));
          await setDoc(orderRef, cleanFirestoreData({
            paymentStatus: 'paid',
            statusPagamento: 'pago',
            status: 'pending', // Move to pending so restaurant can accept or refuse
            paidAt: new Date().toISOString(),
            mercadopagoPaymentId: String(paymentResponse.id),
            mercadopagoStatus: paymentResponse.status,
            mercadopagoPaymentMethod: paymentResponse.payment_method_id,
          }), { merge: true });
          console.log(`[Firestore] Pedido #${orderData.id} pago! Status alterado para 'pending' (Aguardando aceite do restaurante).`);
        } catch (dbErr) {
          console.error(`[Firestore Error] Erro ao atualizar pedido #${orderData.id}:`, dbErr);
        }
      } else {
        // Save Mercado Pago payment ID to order in Firestore for webhook tracking
        try {
          const orderRef = doc(db, 'orders', String(orderData.id));
          await setDoc(orderRef, cleanFirestoreData({
            mercadopagoPaymentId: String(paymentResponse.id),
            mercadopagoStatus: paymentResponse.status,
            mercadopagoPaymentMethod: paymentResponse.payment_method_id,
          }), { merge: true });
        } catch (dbErr) {
          console.error(`[Firestore Error] Erro ao vincular paymentId no pedido:`, dbErr);
        }
      }

      return res.json({
        success: true,
        status: paymentResponse.status,
        status_detail: paymentResponse.status_detail,
        id: paymentResponse.id,
        payment: paymentResponse,
      });
    } catch (error: any) {
      console.error('[Mercado Pago API Error] Falha no processamento:', error?.cause || error?.message || error);
      return res.status(500).json({
        error: 'Erro ao processar pagamento com o Mercado Pago',
        details: error?.cause?.[0]?.description || error?.message || String(error),
      });
    }
  });

  // POST /api/mercadopago/create-preference (For Preference-based or Wallet Bricks)
  app.post('/api/mercadopago/create-preference', async (req, res) => {
    try {
      const { orderData } = req.body;
      if (!orderData) {
        return res.status(400).json({ error: 'Dados do pedido são obrigatórios.' });
      }

      const rawAppUrl = process.env.APP_URL;
      const isPlaceholderAppUrl = !rawAppUrl || rawAppUrl === 'MY_APP_URL';
      const host = req.headers['x-forwarded-host'] || req.get('host') || 'maestriagrill.site';
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const appBaseUrl = (!isPlaceholderAppUrl ? rawAppUrl : `${protocol}://${host}`).replace(/\/$/, '');
      const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');

      let items = (orderData.items || [])
        .map((item: any) => ({
          id: String(item.productId || item.id || 'item'),
          title: String(item.productName || item.title || item.name || 'Item do Pedido').trim() || 'Item do Pedido',
          unit_price: Number(item.price || item.unit_price || 0),
          quantity: Number(item.quantity || 1),
          currency_id: 'BRL',
        }))
        .filter((i: any) => i.unit_price > 0 && i.quantity > 0);

      if (items.length === 0) {
        items = [{
          id: String(orderData.id || 'pedido'),
          title: `Pedido #${orderData.id || ''} - Maestria Grill`,
          unit_price: Number(orderData.total || orderData.valorTotal || 1),
          quantity: 1,
          currency_id: 'BRL',
        }];
      } else if (orderData.deliveryFee && Number(orderData.deliveryFee) > 0) {
        items.push({
          id: 'delivery_fee',
          title: 'Taxa de Entrega',
          unit_price: Number(orderData.deliveryFee),
          quantity: 1,
          currency_id: 'BRL',
        });
      }

      const customerEmail = String(orderData.customerEmail || 'cliente@maestriagrill.com').trim();
      const validEmail = customerEmail.includes('@') && customerEmail.includes('.')
        ? customerEmail
        : 'cliente@maestriagrill.com';

      const bodyData: any = {
        items,
        payer: {
          name: String(orderData.customerName || 'Cliente').trim() || 'Cliente',
          email: validEmail,
        },
        external_reference: String(orderData.id),
        back_urls: {
          success: `${appBaseUrl}/?orderId=${orderData.id}&payment=success`,
          failure: `${appBaseUrl}/?orderId=${orderData.id}&payment=failure`,
          pending: `${appBaseUrl}/?orderId=${orderData.id}&payment=pending`,
        },
        auto_return: 'approved',
      };

      if (!isLocalhost && !appBaseUrl.includes('localhost')) {
        bodyData.notification_url = `${appBaseUrl}/api/mercadopago/webhook`;
      }

      console.log(`[Mercado Pago Preference] Criando preferência para Pedido #${orderData.id}...`);
      const prefResponse = await mpPreference.create({ body: bodyData });

      return res.json({
        id: prefResponse.id,
        init_point: prefResponse.init_point,
        sandbox_init_point: prefResponse.sandbox_init_point,
      });
    } catch (error: any) {
      console.error('[Mercado Pago Preference Error]:', error?.cause || error?.message || error);
      return res.status(500).json({
        error: 'Erro ao criar preferência de pagamento',
        details: error?.cause?.[0]?.description || error?.message || String(error),
      });
    }
  });

  // POST /api/mercadopago/create-pix (Direct Pix Generation via Mercado Pago API)
  app.post('/api/mercadopago/create-pix', async (req, res) => {
    try {
      const { orderData } = req.body;
      if (!orderData) {
        return res.status(400).json({ error: 'Dados do pedido são obrigatórios.' });
      }

      const rawAppUrl = process.env.APP_URL;
      const isPlaceholderAppUrl = !rawAppUrl || rawAppUrl === 'MY_APP_URL';
      const host = req.headers['x-forwarded-host'] || req.get('host') || 'maestriagrill.site';
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const appBaseUrl = (!isPlaceholderAppUrl ? rawAppUrl : `${protocol}://${host}`).replace(/\/$/, '');
      const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');

      const amount = Number(orderData.total || orderData.valorTotal || 0);
      const customerEmail = String(orderData.customerEmail || 'cliente@maestriagrill.com').trim();
      const validEmail = customerEmail.includes('@') && customerEmail.includes('.')
        ? customerEmail
        : 'cliente@maestriagrill.com';

      const customerName = String(orderData.customerName || 'Cliente').trim();
      const firstName = customerName ? customerName.split(' ')[0] : 'Cliente';
      const lastName = customerName ? customerName.split(' ').slice(1).join(' ') || 'Maestria' : 'Grill';

      const paymentBody: any = {
        transaction_amount: amount,
        description: `Pedido #${orderData.id} - Maestria Grill`,
        payment_method_id: 'pix',
        payer: {
          email: validEmail,
          first_name: firstName,
          last_name: lastName,
        },
        external_reference: String(orderData.id),
      };

      if (orderData.cpf) {
        const cleanCpf = String(orderData.cpf).replace(/\D/g, '');
        if (cleanCpf.length === 11) {
          paymentBody.payer.identification = { type: 'CPF', number: cleanCpf };
        }
      }

      if (!isLocalhost && !appBaseUrl.includes('localhost')) {
        paymentBody.notification_url = `${appBaseUrl}/api/mercadopago/webhook`;
      }

      console.log(`[Mercado Pago Direct Pix] Criando cobrança Pix para Pedido #${orderData.id} (R$ ${amount})...`);
      const paymentResponse = await mpPayment.create({ body: paymentBody });

      const qrCode = paymentResponse.point_of_interaction?.transaction_data?.qr_code;
      const qrCodeBase64 = paymentResponse.point_of_interaction?.transaction_data?.qr_code_base64;
      const ticketUrl = paymentResponse.point_of_interaction?.transaction_data?.ticket_url;

      // Save payment ID to Supabase and Firestore order record
      if (supabaseServer) {
        try {
          await supabaseServer.from('orders').update({
            mercadopago_payment_id: String(paymentResponse.id),
            mercadopago_status: paymentResponse.status,
          }).eq('id', String(orderData.id));
        } catch (sbErr) {
          console.error(`[Supabase Error] Erro ao salvar dados do Pix no pedido #${orderData.id}:`, sbErr);
        }
      }

      try {
        const orderRef = doc(db, 'orders', String(orderData.id));
        await setDoc(orderRef, {
          mercadopagoPaymentId: String(paymentResponse.id),
          mercadopagoStatus: paymentResponse.status,
          mercadopagoPaymentMethod: 'pix',
        }, { merge: true });
      } catch (dbErr) {
        // silent or fallback
      }

      return res.json({
        success: true,
        paymentId: paymentResponse.id,
        status: paymentResponse.status,
        qrCode,
        qrCodeBase64,
        ticketUrl,
      });
    } catch (error: any) {
      console.error('[Mercado Pago Direct Pix Error]:', error?.cause || error?.message || error);
      return res.status(500).json({
        error: 'Erro ao gerar QR Code Pix no Mercado Pago',
        details: error?.cause?.[0]?.description || error?.message || String(error),
      });
    }
  });

  // Helper to fetch order from Supabase or Firestore
  async function getOrderById(orderId: string): Promise<any | null> {
    if (supabaseServer) {
      try {
        const { data, error } = await supabaseServer
          .from('orders')
          .select('*')
          .eq('id', String(orderId))
          .maybeSingle();
        if (!error && data) {
          const rawEndereco = data.endereco;
          return {
            id: data.id,
            customerName: data.customer_name,
            customerEmail: data.customer_email,
            paymentMethod: data.payment_method,
            paymentStatus: data.payment_status,
            status: data.status,
            total: Number(data.total || 0),
            tipoPedido: data.tipo_pedido,
            endereco: rawEndereco,
            motoboyId: data.motoboy_id,
            mercadopagoPaymentId: data.mercadopago_payment_id,
            mercadopagoStatus: data.mercadopago_status,
            refundStatus: data.refund_status || (typeof rawEndereco === 'object' && rawEndereco ? rawEndereco.refundStatus : undefined),
            refundId: data.refund_id || (typeof rawEndereco === 'object' && rawEndereco ? rawEndereco.refundId : undefined),
            refundedAt: data.refunded_at || (typeof rawEndereco === 'object' && rawEndereco ? rawEndereco.refundedAt : undefined),
            refundError: data.refund_error || (typeof rawEndereco === 'object' && rawEndereco ? rawEndereco.refundError : undefined),
            refundAmount: data.refund_amount ? Number(data.refund_amount) : (typeof rawEndereco === 'object' && rawEndereco ? rawEndereco.refundAmount : undefined),
            refundProcessingStartedAt: data.refund_processing_started_at || (typeof rawEndereco === 'object' && rawEndereco ? rawEndereco.refundProcessingStartedAt : undefined),
            motivoRecusa: data.motivo_recusa || (typeof rawEndereco === 'object' && rawEndereco ? rawEndereco.motivoRecusa : undefined),
          };
        }
      } catch (err) {
        console.warn('[server getOrderById Supabase warning]:', err);
      }
    }

    try {
      const snap = await getDoc(doc(db, 'orders', String(orderId)));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
    } catch (err) {
      console.warn('[server getOrderById Firestore warning]:', err);
    }

    return null;
  }

  function humanizeMercadoPagoError(errorMsg: string): string {
    if (!errorMsg) return 'Erro desconhecido ao processar no Mercado Pago.';
    if (errorMsg.includes('pp core refund response missing refund_id')) {
      return 'O pagamento já foi estornado no Mercado Pago ou a adquirente não pôde emitir um novo ID de estorno.';
    }
    if (errorMsg.includes("Collector hasn't enough available money") || errorMsg.includes("hasn't enough available money")) {
      return "Saldo insuficiente na conta Mercado Pago do restaurante para estorno imediato (Collector hasn't enough available money). Adicione saldo à sua conta Mercado Pago ou tente novamente após a liberação dos fundos.";
    }
    if (errorMsg.includes('payment has already been refunded') || errorMsg.includes('already refunded')) {
      return 'Este pagamento já foi estornado anteriormente no Mercado Pago.';
    }
    if (errorMsg.includes('invalid_parameter') || errorMsg.includes('payment_id')) {
      return 'ID de pagamento inválido ou não encontrado no Mercado Pago.';
    }
    return errorMsg;
  }

  // Helper to persist order updates in Supabase and Firestore
  async function saveOrderUpdates(orderId: string, updates: any) {
    if (supabaseServer) {
      try {
        const sbUpdates: any = {};
        if (updates.status !== undefined) sbUpdates.status = updates.status;
        if (updates.paymentStatus !== undefined) sbUpdates.payment_status = updates.paymentStatus;
        if (updates.mercadopagoStatus !== undefined) sbUpdates.mercadopago_status = updates.mercadopagoStatus;

        const { data: currentDb } = await supabaseServer.from('orders').select('endereco').eq('id', String(orderId)).maybeSingle();
        const currentEndereco = typeof currentDb?.endereco === 'object' && currentDb?.endereco !== null ? currentDb.endereco : {};

        sbUpdates.endereco = {
          ...currentEndereco,
          ...(updates.motivoRecusa !== undefined ? { motivoRecusa: updates.motivoRecusa } : {}),
          ...(updates.refundStatus !== undefined ? { refundStatus: updates.refundStatus } : {}),
          ...(updates.refundId !== undefined ? { refundId: updates.refundId } : {}),
          ...(updates.refundedAt !== undefined ? { refundedAt: updates.refundedAt } : {}),
          ...(updates.refundError !== undefined ? { refundError: updates.refundError } : {}),
          ...(updates.refundAmount !== undefined ? { refundAmount: updates.refundAmount } : {}),
          ...(updates.refundProcessingStartedAt !== undefined ? { refundProcessingStartedAt: updates.refundProcessingStartedAt } : {}),
        };

        await supabaseServer.from('orders').update(sbUpdates).eq('id', String(orderId));
      } catch (sbErr) {
        console.error('[server saveOrderUpdates Supabase error]:', sbErr);
      }
    }

    try {
      const orderRef = doc(db, 'orders', String(orderId));
      await setDoc(orderRef, cleanFirestoreData(updates), { merge: true });
    } catch (fsErr) {
      console.error('[server saveOrderUpdates Firestore error]:', fsErr);
    }
  }

  // Safe reconciliation helper: queries real payment state on Mercado Pago to avoid stuck states and duplicate refunds
  async function reconcileOrderRefundWithMercadoPago(
    order: any,
    options: { forceTransitionIfNoRefund?: boolean } = {}
  ): Promise<{
    reconciled: boolean;
    status: 'REEMBOLSADO' | 'FALHA_NO_REEMBOLSO' | 'REEMBOLSO_PROCESSANDO';
    order: any;
    error?: string;
  }> {
    const paymentId = order.mercadopagoPaymentId || order.mercadopago_payment_id;
    if (!paymentId) {
      const failData = {
        refundStatus: 'FALHA_NO_REEMBOLSO',
        refundError: 'ID do pagamento Mercado Pago não localizado no registro do pedido.',
      };
      await saveOrderUpdates(order.id, failData);
      return {
        reconciled: true,
        status: 'FALHA_NO_REEMBOLSO',
        order: { ...order, ...failData },
        error: failData.refundError,
      };
    }

    try {
      console.log(`[Reconciliação MP] Consultando status real do Pagamento #${paymentId} no Mercado Pago...`);
      const paymentInfo = await mpPayment.get({ id: String(paymentId) });
      console.log(
        `[Reconciliação MP] Resposta MP #${paymentId}: status='${paymentInfo.status}', refunded_amount=${paymentInfo.transaction_amount_refunded}, refunds=${paymentInfo.refunds?.length || 0}`
      );

      // Check if refund was completed in Mercado Pago
      const hasApprovedRefund =
        paymentInfo.status === 'refunded' ||
        (Number(paymentInfo.transaction_amount_refunded || 0) > 0 &&
          Number(paymentInfo.transaction_amount_refunded) >= Number(paymentInfo.transaction_amount || 0)) ||
        (Array.isArray(paymentInfo.refunds) && paymentInfo.refunds.some((r: any) => r.status === 'approved'));

      if (hasApprovedRefund) {
        const approvedRefund =
          paymentInfo.refunds?.find((r: any) => r.status === 'approved') || paymentInfo.refunds?.[0];

        const successData: any = {
          status: 'refused',
          paymentStatus: 'refunded',
          statusPagamento: 'reembolsado',
          refundStatus: 'REEMBOLSADO',
          refundId: approvedRefund?.id ? String(approvedRefund.id) : (order.refundId || undefined),
          refundedAt: approvedRefund?.date_created || order.refundedAt || new Date().toISOString(),
          refundAmount: Number(approvedRefund?.amount || paymentInfo.transaction_amount_refunded || order.total),
          refundError: null,
        };

        await saveOrderUpdates(order.id, successData);
        console.log(`[Reconciliação MP Success] Pedido #${order.id} confirmado como REEMBOLSADO no Mercado Pago!`);
        return {
          reconciled: true,
          status: 'REEMBOLSADO',
          order: { ...order, ...successData },
        };
      }

      // Check if refund is still actively pending in Mercado Pago
      const hasAnyRefund = Array.isArray(paymentInfo.refunds) && paymentInfo.refunds.length > 0;
      const isPendingInMp = hasAnyRefund && paymentInfo.refunds.some((r: any) => r.status === 'pending');

      if (isPendingInMp && !options.forceTransitionIfNoRefund) {
        console.log(`[Reconciliação MP] Reembolso do Pedido #${order.id} ainda está como 'pending' no Mercado Pago.`);
        return {
          reconciled: false,
          status: 'REEMBOLSO_PROCESSANDO',
          order,
        };
      }

      // If Mercado Pago confirms NO refund was executed:
      // It is completely safe to transition to FALHA_NO_REEMBOLSO
      const rawError = order.refundError || 'Tentativa anterior não efetuou o estorno no Mercado Pago.';
      const humanized = humanizeMercadoPagoError(rawError);
      const failData: any = {
        status: 'refused',
        refundStatus: 'FALHA_NO_REEMBOLSO',
        refundError: humanized,
      };

      await saveOrderUpdates(order.id, failData);
      console.log(`[Reconciliação MP Reconciled] Pedido #${order.id} verificado no MP: sem estorno efetuado. Atualizado para FALHA_NO_REEMBOLSO para liberar botão de retentativa.`);
      return {
        reconciled: true,
        status: 'FALHA_NO_REEMBOLSO',
        order: { ...order, ...failData },
        error: humanized,
      };
    } catch (queryErr: any) {
      console.error(`[Reconciliação MP Error] Falha ao consultar Mercado Pago para Pagamento #${paymentId}:`, queryErr);
      // Se não for possível determinar com segurança o estado real:
      // manter REEMBOLSO_PROCESSANDO; não iniciar outro estorno automaticamente;
      return {
        reconciled: false,
        status: order.refundStatus || 'REEMBOLSO_PROCESSANDO',
        order,
        error: queryErr?.message || 'Falha na comunicação com o Mercado Pago',
      };
    }
  }

  // POST /api/orders/:orderId/refuse (Order Refusal with Mercado Pago Real Refund)
  app.post('/api/orders/:orderId/refuse', async (req, res) => {
    try {
      const { orderId } = req.params;
      const { motivoRecusa } = req.body;

      if (!motivoRecusa || typeof motivoRecusa !== 'string' || !motivoRecusa.trim()) {
        return res.status(400).json({ error: 'O motivo da recusa é obrigatório.' });
      }

      console.log(`[Order Refusal] Iniciando recusa do Pedido #${orderId}. Motivo: ${motivoRecusa}`);
      let order = await getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Pedido não encontrado.' });
      }

      // 1. If already marked as refunded in DB, never execute another refund
      if (order.refundStatus === 'REEMBOLSADO') {
        return res.status(400).json({
          error: 'Este pedido já foi recusado e estornado anteriormente no Mercado Pago.',
          order,
        });
      }

      const isOnlinePayment = order.paymentMethod === 'mercadopago';
      const isPaid =
        order.paymentStatus === 'paid' ||
        order.statusPagamento === 'pago' ||
        order.payment_status === 'paid' ||
        order.mercadopagoStatus === 'approved' ||
        order.mercadopago_status === 'approved';

      // CASE 1: Offline Payment or Unpaid Order (Cash, Card on delivery, Card at counter, or unpaid online)
      if (!isOnlinePayment || !isPaid) {
        const updateData: any = {
          status: 'refused',
          motivoRecusa: motivoRecusa.trim(),
        };
        await saveOrderUpdates(orderId, updateData);
        console.log(`[Order Refusal] Pedido presencial/não-pago #${orderId} recusado com sucesso.`);
        return res.json({
          success: true,
          refunded: false,
          message: 'Pedido recusado com sucesso.',
          order: { ...order, ...updateData },
        });
      }

      // CASE 2: Online Payment CONFIRMED as PAID (Mercado Pago)
      const paymentId = order.mercadopagoPaymentId || order.mercadopago_payment_id;
      if (!paymentId) {
        const failData: any = {
          status: 'refused',
          motivoRecusa: motivoRecusa.trim(),
          refundStatus: 'FALHA_NO_REEMBOLSO',
          refundError: 'ID do pagamento Mercado Pago não localizado no registro do pedido.',
        };
        await saveOrderUpdates(orderId, failData);
        return res.status(200).json({
          success: false,
          refunded: false,
          refundStatus: 'FALHA_NO_REEMBOLSO',
          error: failData.refundError,
          order: { ...order, ...failData },
        });
      }

      // 3. If refundStatus === "REEMBOLSO_PROCESSANDO":
      // Do NOT execute immediately another refund! Consult real state in Mercado Pago first.
      if (order.refundStatus === 'REEMBOLSO_PROCESSANDO') {
        const reconciliation = await reconcileOrderRefundWithMercadoPago(order);
        if (reconciliation.status === 'REEMBOLSADO') {
          return res.json({
            success: true,
            refunded: true,
            message: 'Reembolso confirmado no Mercado Pago.',
            order: reconciliation.order,
          });
        }
        if (reconciliation.status === 'REEMBOLSO_PROCESSANDO') {
          return res.status(409).json({
            error: 'O reembolso ainda está sendo processado pelo Mercado Pago. Aguarde alguns instantes.',
            order: reconciliation.order,
          });
        }
        order = reconciliation.order;
      }

      // Pre-check: verify if already refunded on Mercado Pago
      const preCheck = await reconcileOrderRefundWithMercadoPago(order);
      if (preCheck.status === 'REEMBOLSADO') {
        return res.json({
          success: true,
          refunded: true,
          message: 'Reembolso já confirmado anteriormente no Mercado Pago.',
          order: preCheck.order,
        });
      }

      // Mark as REEMBOLSO_PROCESSANDO with timestamp before calling external API to prevent duplicate clicks
      await saveOrderUpdates(orderId, {
        status: 'refused',
        motivoRecusa: motivoRecusa.trim(),
        refundStatus: 'REEMBOLSO_PROCESSANDO',
        refundProcessingStartedAt: new Date().toISOString(),
      });

      console.log(`[Mercado Pago Refund] Solicitando reembolso total do Pagamento #${paymentId} para Pedido #${orderId}...`);

      let refundResponse: any = null;
      try {
        refundResponse = await mpRefund.total({
          payment_id: String(paymentId),
          requestOptions: {
            idempotencyKey: `refund-${orderId}-${paymentId}`,
          },
        });
        console.log(`[Mercado Pago Refund Success] Resposta MP #${paymentId}:`, JSON.stringify(refundResponse));
      } catch (refundErr: any) {
        const errDetails = refundErr?.cause?.[0]?.description || refundErr?.message || String(refundErr);
        console.error(`[Mercado Pago Refund Failed] Erro ao estornar Pagamento #${paymentId}:`, errDetails);

        // Verification & Safe Recovery: Check if MP actually processed or if it was already refunded
        const postCheck = await reconcileOrderRefundWithMercadoPago(
          { ...order, refundError: errDetails },
          { forceTransitionIfNoRefund: true }
        );

        if (postCheck.status === 'REEMBOLSADO') {
          return res.json({
            success: true,
            refunded: true,
            message: 'Reembolso confirmado com sucesso no Mercado Pago.',
            order: postCheck.order,
          });
        }

        const humanized = humanizeMercadoPagoError(errDetails);
        const failData = {
          status: 'refused',
          motivoRecusa: motivoRecusa.trim(),
          refundStatus: 'FALHA_NO_REEMBOLSO',
          refundError: humanized,
        };
        await saveOrderUpdates(orderId, failData);

        return res.status(200).json({
          success: false,
          refunded: false,
          refundStatus: 'FALHA_NO_REEMBOLSO',
          error: humanized,
          order: { ...order, ...failData },
        });
      }

      // Success: Refund confirmed by Mercado Pago
      const successData: any = {
        status: 'refused',
        motivoRecusa: motivoRecusa.trim(),
        paymentStatus: 'refunded',
        statusPagamento: 'reembolsado',
        refundStatus: 'REEMBOLSADO',
        refundId: refundResponse?.id ? String(refundResponse.id) : undefined,
        refundedAt: new Date().toISOString(),
        refundAmount: Number(refundResponse?.amount || order.total),
        refundError: null,
      };

      await saveOrderUpdates(orderId, successData);
      console.log(`[Order Refusal Complete] Pedido #${orderId} recusado e estornado com sucesso (Refund ID: ${successData.refundId}).`);

      return res.json({
        success: true,
        refunded: true,
        message: 'Pedido recusado e reembolso aprovado com sucesso no Mercado Pago.',
        order: { ...order, ...successData },
      });
    } catch (err: any) {
      console.error('[Order Refusal Internal Error]:', err);
      return res.status(500).json({ error: err?.message || 'Erro interno ao recusar pedido.' });
    }
  });

  // POST /api/orders/:orderId/retry-refund (Retry Failed Refund with Safe Reconciliation)
  app.post('/api/orders/:orderId/retry-refund', async (req, res) => {
    try {
      const { orderId } = req.params;
      let order = await getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Pedido não encontrado.' });
      }

      // 1. If refundStatus === "REEMBOLSADO": Never execute another refund
      if (order.refundStatus === 'REEMBOLSADO') {
        return res.status(400).json({ error: 'Este pedido já está com reembolso confirmado.', order });
      }

      const paymentId = order.mercadopagoPaymentId || order.mercadopago_payment_id;
      if (!paymentId) {
        return res.status(400).json({ error: 'ID de pagamento Mercado Pago não encontrado no pedido.' });
      }

      // 2. If refundStatus === "REEMBOLSO_PROCESSANDO":
      // Do NOT execute immediately another refund; consult Mercado Pago first!
      if (order.refundStatus === 'REEMBOLSO_PROCESSANDO') {
        console.log(`[Retry-Refund] Pedido #${orderId} está em REEMBOLSO_PROCESSANDO. Verificando estado real no Mercado Pago antes de qualquer ação...`);
        const rec = await reconcileOrderRefundWithMercadoPago(order, { forceTransitionIfNoRefund: true });
        if (rec.status === 'REEMBOLSADO') {
          return res.json({
            success: true,
            order: rec.order,
            message: 'Reembolso já confirmado anteriormente no Mercado Pago.',
          });
        }
        if (rec.status === 'REEMBOLSO_PROCESSANDO') {
          return res.status(409).json({
            error: 'O reembolso ainda está sendo processado pelo Mercado Pago. Aguarde alguns instantes.',
            order: rec.order,
          });
        }
        // Safely transitioned to FALHA_NO_REEMBOLSO: return updated order so the merchant can review and retry
        return res.json({
          success: false,
          order: rec.order,
          message: 'Status sincronizado: Reembolso anterior não foi concluído no Mercado Pago. O botão para tentar novamente foi liberado.',
        });
      }

      // 3. Pre-check: double-check if already refunded on Mercado Pago
      const preCheck = await reconcileOrderRefundWithMercadoPago(order);
      if (preCheck.status === 'REEMBOLSADO') {
        return res.json({
          success: true,
          order: preCheck.order,
          message: 'Reembolso já confirmado anteriormente no Mercado Pago.',
        });
      }

      // 4. Mark as REEMBOLSO_PROCESSANDO with timestamp before calling external API
      await saveOrderUpdates(orderId, {
        refundStatus: 'REEMBOLSO_PROCESSANDO',
        refundProcessingStartedAt: new Date().toISOString(),
      });

      try {
        const refundResponse = await mpRefund.total({
          payment_id: String(paymentId),
          requestOptions: {
            idempotencyKey: `retry-refund-${orderId}-${paymentId}-${Date.now()}`,
          },
        });

        const successData: any = {
          paymentStatus: 'refunded',
          statusPagamento: 'reembolsado',
          refundStatus: 'REEMBOLSADO',
          refundId: refundResponse?.id ? String(refundResponse.id) : undefined,
          refundedAt: new Date().toISOString(),
          refundAmount: Number(refundResponse?.amount || order.total),
          refundError: null,
        };

        await saveOrderUpdates(orderId, successData);
        return res.json({ success: true, order: { ...order, ...successData } });
      } catch (err: any) {
        const errDetails = err?.cause?.[0]?.description || err?.message || String(err);
        console.error(`[Retry-Refund Failed] Erro ao retentar estorno #${paymentId}:`, errDetails);

        // Verification & Safe Recovery: Check if MP actually refunded
        const postCheck = await reconcileOrderRefundWithMercadoPago(
          { ...order, refundError: errDetails },
          { forceTransitionIfNoRefund: true }
        );

        if (postCheck.status === 'REEMBOLSADO') {
          return res.json({ success: true, order: postCheck.order });
        }

        const humanized = humanizeMercadoPagoError(errDetails);
        const failData = {
          refundStatus: 'FALHA_NO_REEMBOLSO',
          refundError: humanized,
        };
        await saveOrderUpdates(orderId, failData);
        return res.status(200).json({ success: false, error: humanized, order: { ...order, ...failData } });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Erro interno ao reprocessar reembolso.' });
    }
  });

  // POST /api/orders/:orderId/reconcile-refund (Explicit Safe Reconciliation without executing new refund)
  app.post('/api/orders/:orderId/reconcile-refund', async (req, res) => {
    try {
      const { orderId } = req.params;
      const order = await getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Pedido não encontrado.' });
      }
      const result = await reconcileOrderRefundWithMercadoPago(order, { forceTransitionIfNoRefund: true });
      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Erro ao reconciliar estorno.' });
    }
  });

  // GET /api/mercadopago/webhook (Health Check / Test ping)
  app.get('/api/mercadopago/webhook', (_req, res) => {
    return res.status(200).json({ status: 'ok', message: 'Webhook Mercado Pago ativo e operacional.' });
  });

  // POST /api/mercadopago/webhook (Automated Webhook Notification Handler)
  app.post('/api/mercadopago/webhook', async (req, res) => {
    try {
      console.log('[Mercado Pago Webhook Received]:', JSON.stringify(req.query), JSON.stringify(req.body));

      const topic = req.query.topic || req.query.type || req.body?.type || req.body?.topic;
      if (topic && topic !== 'payment') {
        console.log(`[Mercado Pago Webhook] Ignorando notificação de tópico '${topic}'.`);
        return res.status(200).send(`Tópico '${topic}' recebido e ignorado.`);
      }

      const paymentId =
        req.query.id ||
        req.query['data.id'] ||
        req.body?.data?.id ||
        (req.body?.type === 'payment' ? req.body?.data?.id : null) ||
        req.body?.id;

      if (!paymentId) {
        return res.status(200).send('Webhook recebido sem ID de pagamento.');
      }

      // Validar Assinatura do Webhook (x-signature) se fornecida pelo Mercado Pago
      const xSignature = req.headers['x-signature'] as string;
      const xRequestId = req.headers['x-request-id'] as string;
      if (xSignature && MERCADOPAGO_WEBHOOK_SECRET) {
        try {
          const parts = xSignature.split(',');
          let ts = '';
          let hashV1 = '';
          for (const part of parts) {
            const [key, val] = part.trim().split('=');
            if (key === 'ts') ts = val;
            if (key === 'v1') hashV1 = val;
          }
          if (ts && hashV1) {
            const manifest = `id:${paymentId};request-id:${xRequestId || ''};ts:${ts};`;
            const calculatedHash = crypto.createHmac('sha256', MERCADOPAGO_WEBHOOK_SECRET).update(manifest).digest('hex');
            if (calculatedHash === hashV1) {
              console.log('[Mercado Pago Webhook] Assinatura X-Signature validada com sucesso.');
            } else {
              console.warn(`[Mercado Pago Webhook] Alerta: Assinatura X-Signature não coincidiu (Calculada: ${calculatedHash}, Recebida: ${hashV1}). Prosseguindo com consulta de segurança na API do MP.`);
            }
          }
        } catch (sigErr) {
          console.error('[Mercado Pago Webhook Signature Validation Warning]:', sigErr);
        }
      }

      console.log(`[Mercado Pago Webhook] Consultando status do Pagamento #${paymentId}...`);
      let paymentInfo: any = null;
      try {
        paymentInfo = await mpPayment.get({ id: String(paymentId) });
      } catch (getErr: any) {
        if (
          getErr?.status === 404 ||
          getErr?.error === 'not_found' ||
          getErr?.message?.includes('not_found')
        ) {
          console.warn(`[Mercado Pago Webhook] Pagamento #${paymentId} não encontrado no MP (pode ser evento de teste ou ordem).`);
          return res.status(200).send('Pagamento não encontrado no MP.');
        }
        throw getErr;
      }

      if (paymentInfo && paymentInfo.external_reference) {
        const orderId = paymentInfo.external_reference;
        const status = paymentInfo.status;
        console.log(`[Mercado Pago Webhook] Pedido #${orderId} -> Status: ${status}`);

        if (supabaseServer) {
          try {
            const updatePayload: any = {
              payment_status: status === 'approved' ? 'paid' : status,
              mercadopago_status: status,
              mercadopago_payment_id: String(paymentId),
            };
            if (status === 'approved') {
              updatePayload.status = 'pending';
            }
            await supabaseServer.from('orders').update(updatePayload).eq('id', String(orderId));
            console.log(`[Supabase Webhook Success] Pedido #${orderId} atualizado no Supabase.`);
          } catch (sbErr) {
            console.error(`[Supabase Webhook Error]:`, sbErr);
          }
        }

        const orderRef = doc(db, 'orders', String(orderId));
        const orderSnap = await getDoc(orderRef);

        if (orderSnap.exists()) {
          const currentOrder = orderSnap.data();

          if (status === 'approved') {
            const nextStatus = (currentOrder.status === 'awaiting_payment' || !currentOrder.status)
              ? 'pending'
              : currentOrder.status;

            await setDoc(
              orderRef,
              cleanFirestoreData({
                paymentStatus: 'paid',
                statusPagamento: 'pago',
                status: nextStatus,
                paidAt: new Date().toISOString(),
                mercadopagoPaymentId: String(paymentId),
                mercadopagoStatus: status,
                mercadopagoPaymentMethod: paymentInfo.payment_method_id,
              }),
              { merge: true }
            );
            console.log(`[Webhook Success] Pedido #${orderId} atualizado para 'PAGO' e enviado para o restaurante aceitar!`);
          } else {
            await setDoc(
              orderRef,
              cleanFirestoreData({
                mercadopagoPaymentId: String(paymentId),
                mercadopagoStatus: status,
                mercadopagoPaymentMethod: paymentInfo.payment_method_id,
              }),
              { merge: true }
            );
          }
        } else {
          console.warn(`[Webhook Warning] Pedido #${orderId} não encontrado no Firestore.`);
        }
      }

      return res.status(200).send('Webhook processado com sucesso.');
    } catch (error: any) {
      console.error('[Mercado Pago Webhook Error]:', error);
      // Return 200 to acknowledge receipt and avoid Mercado Pago retry storms
      return res.status(200).send('Erro interno ao processar webhook.');
    }
  });

  // GET /api/mercadopago/payment-status/:id (Status Polling endpoint)
  app.get('/api/mercadopago/payment-status/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!id || id === 'null' || id === 'undefined') {
        return res.status(400).json({ error: 'ID do pagamento é obrigatório' });
      }

      let paymentInfo: any = null;
      try {
        paymentInfo = await mpPayment.get({ id });
      } catch (getErr: any) {
        if (
          getErr?.status === 404 ||
          getErr?.error === 'not_found' ||
          getErr?.message?.includes('not_found')
        ) {
          return res.status(404).json({ status: 'not_found', error: 'Pagamento não encontrado no Mercado Pago' });
        }
        throw getErr;
      }

      if (paymentInfo.status === 'approved' && paymentInfo.external_reference) {
        const orderId = String(paymentInfo.external_reference);

        if (supabaseServer) {
          try {
            await supabaseServer.from('orders').update({
              payment_status: 'paid',
              status: 'pending',
              mercadopago_status: 'approved',
              mercadopago_payment_id: String(paymentInfo.id),
            }).eq('id', orderId);
            console.log(`[Supabase Status Check] Pedido #${orderId} atualizado para 'paid' e 'pending' no Supabase.`);
          } catch (sbErr) {
            console.error(`[Supabase Error on Status Check]:`, sbErr);
          }
        }

        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await getDoc(orderRef);
        if (orderSnap.exists()) {
          const currentOrder = orderSnap.data();
          if (currentOrder.paymentStatus !== 'paid') {
            const nextStatus = (currentOrder.status === 'awaiting_payment' || !currentOrder.status)
              ? 'pending'
              : currentOrder.status;

            await setDoc(
              orderRef,
              cleanFirestoreData({
                paymentStatus: 'paid',
                statusPagamento: 'pago',
                status: nextStatus,
                paidAt: new Date().toISOString(),
                mercadopagoStatus: 'approved',
              }),
              { merge: true }
            );
          }
        }
      }

      return res.json({
        id: paymentInfo.id,
        status: paymentInfo.status,
        status_detail: paymentInfo.status_detail,
        payment_method_id: paymentInfo.payment_method_id,
        external_reference: paymentInfo.external_reference,
      });
    } catch (error: any) {
      console.error('[Mercado Pago Status Error]:', error);
      return res.status(500).json({ error: 'Erro ao verificar status do pagamento' });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Maestria Grill rodando na porta ${PORT}`);
  });
}

startServer();
