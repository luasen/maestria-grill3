import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

// Initialize Supabase Server Client
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServer = SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Initialize Firebase App for backwards-compatible server-side order updates
const firebaseServerApp = initializeApp(firebaseConfig, 'server-app');
const db = getFirestore(firebaseServerApp, firebaseConfig.firestoreDatabaseId);

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

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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
          await updateDoc(orderRef, {
            paymentStatus: 'paid',
            statusPagamento: 'pago',
            status: 'pending', // Move to pending so restaurant can accept or refuse
            paidAt: new Date().toISOString(),
            mercadopagoPaymentId: String(paymentResponse.id),
            mercadopagoStatus: paymentResponse.status,
            mercadopagoPaymentMethod: paymentResponse.payment_method_id,
          });
          console.log(`[Firestore] Pedido #${orderData.id} pago! Status alterado para 'pending' (Aguardando aceite do restaurante).`);
        } catch (dbErr) {
          console.error(`[Firestore Error] Erro ao atualizar pedido #${orderData.id}:`, dbErr);
        }
      } else {
        // Save Mercado Pago payment ID to order in Firestore for webhook tracking
        try {
          const orderRef = doc(db, 'orders', String(orderData.id));
          await updateDoc(orderRef, {
            mercadopagoPaymentId: String(paymentResponse.id),
            mercadopagoStatus: paymentResponse.status,
            mercadopagoPaymentMethod: paymentResponse.payment_method_id,
          });
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
        await updateDoc(orderRef, {
          mercadopagoPaymentId: String(paymentResponse.id),
          mercadopagoStatus: paymentResponse.status,
          mercadopagoPaymentMethod: 'pix',
        });
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
            await updateDoc(orderRef, {
              paymentStatus: 'paid',
              statusPagamento: 'pago',
              // Switch status to 'pending' when paid so restaurant can accept or refuse
              status: currentOrder.status === 'awaiting_payment' ? 'pending' : currentOrder.status,
              paidAt: new Date().toISOString(),
              mercadopagoPaymentId: String(paymentId),
              mercadopagoStatus: status,
              mercadopagoPaymentMethod: paymentInfo.payment_method_id,
            });
            console.log(`[Webhook Success] Pedido #${orderId} atualizado para 'PAGO' e enviado para o restaurante aceitar!`);
          } else {
            await updateDoc(orderRef, {
              mercadopagoPaymentId: String(paymentId),
              mercadopagoStatus: status,
              mercadopagoPaymentMethod: paymentInfo.payment_method_id,
            });
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
            await updateDoc(orderRef, {
              paymentStatus: 'paid',
              statusPagamento: 'pago',
              status: currentOrder.status === 'awaiting_payment' ? 'pending' : currentOrder.status,
              paidAt: new Date().toISOString(),
              mercadopagoStatus: 'approved',
            });
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
