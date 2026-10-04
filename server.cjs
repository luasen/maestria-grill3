var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_vite = require("vite");
var import_mercadopago = require("mercadopago");
var import_app = require("firebase/app");
var import_firestore = require("firebase/firestore");
var import_supabase_js = require("@supabase/supabase-js");

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "innate-stacker-xnn32",
  appId: "1:517879166989:web:db201b9dcbde1f8e39fd44",
  apiKey: "AIzaSyARCBjyFDIS6e5Wcy3oqKRKFhkOf6aAmv8",
  authDomain: "innate-stacker-xnn32.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-remixremixcardpi-2693b8d2-d1a8-4550-a69a-51b398bc8366",
  storageBucket: "innate-stacker-xnn32.firebasestorage.app",
  messagingSenderId: "517879166989",
  measurementId: "",
  oAuthClientId: "517879166989-6ef8h8il3gr8dqjbpo7mg9q66j29tc1r.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

// server.ts
var SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
var SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "";
var supabaseServer = SUPABASE_URL.startsWith("https://") && SUPABASE_ANON_KEY ? (0, import_supabase_js.createClient)(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
var firebaseServerApp = (0, import_app.initializeApp)(firebase_applet_config_default, "server-app");
var db = (0, import_firestore.getFirestore)(firebaseServerApp, firebase_applet_config_default.firestoreDatabaseId);
function cleanFirestoreData(data) {
  const cleaned = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== void 0) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}
var MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || "APP_USR-4612394528193802-072320-97e3710081e80df08135f600e23b1d04-493924237";
var MERCADOPAGO_WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET || "5b243ea8deba910f74cc4cb3553a2876a82af67f992c816108d5abd286d0a686";
var mpClient = new import_mercadopago.MercadoPagoConfig({
  accessToken: MERCADOPAGO_ACCESS_TOKEN
});
var mpPayment = new import_mercadopago.Payment(mpClient);
var mpPreference = new import_mercadopago.Preference(mpClient);
var mpRefund = new import_mercadopago.PaymentRefund(mpClient);
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });
  app.use(import_express.default.json({ limit: "25mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "25mb" }));
  const UPLOADS_DIR = import_path.default.resolve(process.cwd(), "uploads");
  if (!import_fs.default.existsSync(UPLOADS_DIR)) {
    import_fs.default.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  app.use("/api/storage/files", import_express.default.static(UPLOADS_DIR, {
    maxAge: "1y",
    immutable: true
  }));
  app.post("/api/storage/upload", async (req, res) => {
    try {
      const { bucket, fileName, base64Data } = req.body;
      if (!bucket || !fileName || !base64Data) {
        return res.status(400).json({ error: "Par\xE2metros incompletos para upload" });
      }
      const safeBucket = String(bucket).replace(/[^a-zA-Z0-9_-]/g, "");
      const safeFileName = String(fileName).replace(/[^a-zA-Z0-9_.-]/g, "");
      const targetDir = import_path.default.join(UPLOADS_DIR, safeBucket);
      if (!import_fs.default.existsSync(targetDir)) {
        import_fs.default.mkdirSync(targetDir, { recursive: true });
      }
      const filePath = import_path.default.join(targetDir, safeFileName);
      const cleanBase64 = String(base64Data).replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(cleanBase64, "base64");
      import_fs.default.writeFileSync(filePath, buffer);
      const publicUrl = `/api/storage/files/${safeBucket}/${safeFileName}`;
      console.log(`[Storage Fallback] Imagem gravada com sucesso em ${publicUrl}`);
      return res.json({ publicUrl, success: true });
    } catch (err) {
      console.error("[Storage Fallback Error]:", err);
      return res.status(500).json({ error: err?.message || "Falha ao salvar imagem" });
    }
  });
  app.post("/api/database/seed", async (req, res) => {
    try {
      const settingsRef = (0, import_firestore.doc)(db, "settings", "main");
      const settingsSnap = await (0, import_firestore.getDoc)(settingsRef);
      if (!settingsSnap.exists()) {
        await (0, import_firestore.updateDoc)(settingsRef, {
          name: "Maestria Grill",
          description: "O aut\xEAntico sabor da brasa com carnes nobres grelhadas com perfei\xE7\xE3o e paix\xE3o em servir.",
          logoUrl: "\u{1F969}",
          deliveryFee: 7,
          phone: "(11) 99999-8888",
          address: "Av. Paulista, 1000 - Bela Vista, S\xE3o Paulo - SP",
          whatsapp: "(11) 99999-8888",
          instagram: "@maestriagrill",
          email: "contato@maestriagrill.com.br",
          horarioFuncionamento: "Segunda a S\xE1bado, das 18h \xE0s 23h30",
          minOrderValue: 30,
          maxDeliveryDistance: 10,
          avgDeliveryTime: "35 - 50 min",
          avgPickupTime: "15 - 25 min",
          allowPickup: true,
          allowDelivery: true,
          paymentPix: true,
          paymentCash: true,
          paymentCreditCard: true,
          paymentDebitCard: true,
          primaryColor: "#ea580c",
          secondaryColor: "#f97316",
          backgroundColor: "#fff7f4",
          maintenanceMode: false
        }).catch(async () => {
          const { setDoc: setDoc2 } = await import("firebase/firestore");
          await setDoc2(settingsRef, {
            name: "Maestria Grill",
            description: "O aut\xEAntico sabor da brasa com carnes nobres grelhadas com perfei\xE7\xE3o e paix\xE3o em servir.",
            logoUrl: "\u{1F969}",
            deliveryFee: 7,
            phone: "(11) 99999-8888",
            address: "Av. Paulista, 1000 - Bela Vista, S\xE3o Paulo - SP",
            whatsapp: "(11) 99999-8888",
            instagram: "@maestriagrill",
            email: "contato@maestriagrill.com.br",
            horarioFuncionamento: "Segunda a S\xE1bado, das 18h \xE0s 23h30",
            minOrderValue: 30,
            maxDeliveryDistance: 10,
            avgDeliveryTime: "35 - 50 min",
            avgPickupTime: "15 - 25 min",
            allowPickup: true,
            allowDelivery: true,
            paymentPix: true,
            paymentCash: true,
            paymentCreditCard: true,
            paymentDebitCard: true,
            primaryColor: "#ea580c",
            secondaryColor: "#f97316",
            backgroundColor: "#fff7f4",
            maintenanceMode: false
          });
        });
      }
      return res.json({ success: true, message: "Banco de dados configurado com sucesso!" });
    } catch (e) {
      console.error("[DB Seed Error]:", e);
      return res.status(500).json({ error: e?.message || "Falha ao inicializar dados" });
    }
  });
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Maestria Grill Mercado Pago API" });
  });
  app.get("/api/mercadopago/config", (req, res) => {
    const publicKey = process.env.VITE_MERCADOPAGO_PUBLIC_KEY || "APP_USR-45e3bea4-d7ee-4847-af4b-251fba799c6f";
    res.json({
      publicKey,
      isProduction: !publicKey.startsWith("TEST-")
    });
  });
  app.post("/api/mercadopago/process-payment", async (req, res) => {
    try {
      const { formData, orderData } = req.body;
      if (!formData || !orderData) {
        return res.status(400).json({
          error: "Dados do pagamento e do pedido s\xE3o obrigat\xF3rios."
        });
      }
      const rawAppUrl = process.env.APP_URL;
      const isPlaceholderAppUrl = !rawAppUrl || rawAppUrl === "MY_APP_URL";
      const host = req.headers["x-forwarded-host"] || req.get("host") || "maestriagrill.site";
      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
      const appBaseUrl = (!isPlaceholderAppUrl ? rawAppUrl : `${protocol}://${host}`).replace(/\/$/, "");
      const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
      const amount = Number(formData.transaction_amount || orderData.total);
      const email = formData.payer?.email || orderData.customerEmail || "cliente@maestriagrill.com";
      const firstName = formData.payer?.first_name || (orderData.customerName ? orderData.customerName.split(" ")[0] : "Cliente");
      const lastName = formData.payer?.last_name || (orderData.customerName ? orderData.customerName.split(" ").slice(1).join(" ") : "Maestria") || "Grill";
      const paymentBody = {
        transaction_amount: amount,
        token: formData.token,
        description: `Pedido #${orderData.id} - Maestria Grill`,
        payment_method_id: formData.payment_method_id,
        payer: {
          email,
          first_name: firstName,
          last_name: lastName,
          identification: formData.payer?.identification
        },
        installments: Number(formData.installments || 1),
        external_reference: String(orderData.id)
      };
      if (!isLocalhost && !appBaseUrl.includes("localhost")) {
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
      if (paymentResponse.status === "approved") {
        try {
          const orderRef = (0, import_firestore.doc)(db, "orders", String(orderData.id));
          await (0, import_firestore.setDoc)(orderRef, cleanFirestoreData({
            paymentStatus: "paid",
            statusPagamento: "pago",
            status: "pending",
            // Move to pending so restaurant can accept or refuse
            paidAt: (/* @__PURE__ */ new Date()).toISOString(),
            mercadopagoPaymentId: String(paymentResponse.id),
            mercadopagoStatus: paymentResponse.status,
            mercadopagoPaymentMethod: paymentResponse.payment_method_id
          }), { merge: true });
          console.log(`[Firestore] Pedido #${orderData.id} pago! Status alterado para 'pending' (Aguardando aceite do restaurante).`);
        } catch (dbErr) {
          console.error(`[Firestore Error] Erro ao atualizar pedido #${orderData.id}:`, dbErr);
        }
      } else {
        try {
          const orderRef = (0, import_firestore.doc)(db, "orders", String(orderData.id));
          await (0, import_firestore.setDoc)(orderRef, cleanFirestoreData({
            mercadopagoPaymentId: String(paymentResponse.id),
            mercadopagoStatus: paymentResponse.status,
            mercadopagoPaymentMethod: paymentResponse.payment_method_id
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
        payment: paymentResponse
      });
    } catch (error) {
      console.error("[Mercado Pago API Error] Falha no processamento:", error?.cause || error?.message || error);
      return res.status(500).json({
        error: "Erro ao processar pagamento com o Mercado Pago",
        details: error?.cause?.[0]?.description || error?.message || String(error)
      });
    }
  });
  app.post("/api/mercadopago/create-preference", async (req, res) => {
    try {
      const { orderData } = req.body;
      if (!orderData) {
        return res.status(400).json({ error: "Dados do pedido s\xE3o obrigat\xF3rios." });
      }
      const rawAppUrl = process.env.APP_URL;
      const isPlaceholderAppUrl = !rawAppUrl || rawAppUrl === "MY_APP_URL";
      const host = req.headers["x-forwarded-host"] || req.get("host") || "maestriagrill.site";
      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
      const appBaseUrl = (!isPlaceholderAppUrl ? rawAppUrl : `${protocol}://${host}`).replace(/\/$/, "");
      const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
      let items = (orderData.items || []).map((item) => ({
        id: String(item.productId || item.id || "item"),
        title: String(item.productName || item.title || item.name || "Item do Pedido").trim() || "Item do Pedido",
        unit_price: Number(item.price || item.unit_price || 0),
        quantity: Number(item.quantity || 1),
        currency_id: "BRL"
      })).filter((i) => i.unit_price > 0 && i.quantity > 0);
      if (items.length === 0) {
        items = [{
          id: String(orderData.id || "pedido"),
          title: `Pedido #${orderData.id || ""} - Maestria Grill`,
          unit_price: Number(orderData.total || orderData.valorTotal || 1),
          quantity: 1,
          currency_id: "BRL"
        }];
      } else if (orderData.deliveryFee && Number(orderData.deliveryFee) > 0) {
        items.push({
          id: "delivery_fee",
          title: "Taxa de Entrega",
          unit_price: Number(orderData.deliveryFee),
          quantity: 1,
          currency_id: "BRL"
        });
      }
      const customerEmail = String(orderData.customerEmail || "cliente@maestriagrill.com").trim();
      const validEmail = customerEmail.includes("@") && customerEmail.includes(".") ? customerEmail : "cliente@maestriagrill.com";
      const bodyData = {
        items,
        payer: {
          name: String(orderData.customerName || "Cliente").trim() || "Cliente",
          email: validEmail
        },
        external_reference: String(orderData.id),
        back_urls: {
          success: `${appBaseUrl}/?orderId=${orderData.id}&payment=success`,
          failure: `${appBaseUrl}/?orderId=${orderData.id}&payment=failure`,
          pending: `${appBaseUrl}/?orderId=${orderData.id}&payment=pending`
        },
        auto_return: "approved"
      };
      if (!isLocalhost && !appBaseUrl.includes("localhost")) {
        bodyData.notification_url = `${appBaseUrl}/api/mercadopago/webhook`;
      }
      console.log(`[Mercado Pago Preference] Criando prefer\xEAncia para Pedido #${orderData.id}...`);
      const prefResponse = await mpPreference.create({ body: bodyData });
      return res.json({
        id: prefResponse.id,
        init_point: prefResponse.init_point,
        sandbox_init_point: prefResponse.sandbox_init_point
      });
    } catch (error) {
      console.error("[Mercado Pago Preference Error]:", error?.cause || error?.message || error);
      return res.status(500).json({
        error: "Erro ao criar prefer\xEAncia de pagamento",
        details: error?.cause?.[0]?.description || error?.message || String(error)
      });
    }
  });
  app.post("/api/mercadopago/create-pix", async (req, res) => {
    try {
      const { orderData } = req.body;
      if (!orderData) {
        return res.status(400).json({ error: "Dados do pedido s\xE3o obrigat\xF3rios." });
      }
      const rawAppUrl = process.env.APP_URL;
      const isPlaceholderAppUrl = !rawAppUrl || rawAppUrl === "MY_APP_URL";
      const host = req.headers["x-forwarded-host"] || req.get("host") || "maestriagrill.site";
      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
      const appBaseUrl = (!isPlaceholderAppUrl ? rawAppUrl : `${protocol}://${host}`).replace(/\/$/, "");
      const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
      const amount = Number(orderData.total || orderData.valorTotal || 0);
      const customerEmail = String(orderData.customerEmail || "cliente@maestriagrill.com").trim();
      const validEmail = customerEmail.includes("@") && customerEmail.includes(".") ? customerEmail : "cliente@maestriagrill.com";
      const customerName = String(orderData.customerName || "Cliente").trim();
      const firstName = customerName ? customerName.split(" ")[0] : "Cliente";
      const lastName = customerName ? customerName.split(" ").slice(1).join(" ") || "Maestria" : "Grill";
      const paymentBody = {
        transaction_amount: amount,
        description: `Pedido #${orderData.id} - Maestria Grill`,
        payment_method_id: "pix",
        payer: {
          email: validEmail,
          first_name: firstName,
          last_name: lastName
        },
        external_reference: String(orderData.id)
      };
      if (orderData.cpf) {
        const cleanCpf = String(orderData.cpf).replace(/\D/g, "");
        if (cleanCpf.length === 11) {
          paymentBody.payer.identification = { type: "CPF", number: cleanCpf };
        }
      }
      if (!isLocalhost && !appBaseUrl.includes("localhost")) {
        paymentBody.notification_url = `${appBaseUrl}/api/mercadopago/webhook`;
      }
      console.log(`[Mercado Pago Direct Pix] Criando cobran\xE7a Pix para Pedido #${orderData.id} (R$ ${amount})...`);
      const paymentResponse = await mpPayment.create({ body: paymentBody });
      const qrCode = paymentResponse.point_of_interaction?.transaction_data?.qr_code;
      const qrCodeBase64 = paymentResponse.point_of_interaction?.transaction_data?.qr_code_base64;
      const ticketUrl = paymentResponse.point_of_interaction?.transaction_data?.ticket_url;
      if (supabaseServer) {
        try {
          await supabaseServer.from("orders").update({
            mercadopago_payment_id: String(paymentResponse.id),
            mercadopago_status: paymentResponse.status
          }).eq("id", String(orderData.id));
        } catch (sbErr) {
          console.error(`[Supabase Error] Erro ao salvar dados do Pix no pedido #${orderData.id}:`, sbErr);
        }
      }
      try {
        const orderRef = (0, import_firestore.doc)(db, "orders", String(orderData.id));
        await (0, import_firestore.setDoc)(orderRef, {
          mercadopagoPaymentId: String(paymentResponse.id),
          mercadopagoStatus: paymentResponse.status,
          mercadopagoPaymentMethod: "pix"
        }, { merge: true });
      } catch (dbErr) {
      }
      return res.json({
        success: true,
        paymentId: paymentResponse.id,
        status: paymentResponse.status,
        qrCode,
        qrCodeBase64,
        ticketUrl
      });
    } catch (error) {
      console.error("[Mercado Pago Direct Pix Error]:", error?.cause || error?.message || error);
      return res.status(500).json({
        error: "Erro ao gerar QR Code Pix no Mercado Pago",
        details: error?.cause?.[0]?.description || error?.message || String(error)
      });
    }
  });
  async function getOrderById(orderId) {
    if (supabaseServer) {
      try {
        const { data, error } = await supabaseServer.from("orders").select("*").eq("id", String(orderId)).maybeSingle();
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
            refundStatus: data.refund_status || (typeof rawEndereco === "object" && rawEndereco ? rawEndereco.refundStatus : void 0),
            refundId: data.refund_id || (typeof rawEndereco === "object" && rawEndereco ? rawEndereco.refundId : void 0),
            refundedAt: data.refunded_at || (typeof rawEndereco === "object" && rawEndereco ? rawEndereco.refundedAt : void 0),
            refundError: data.refund_error || (typeof rawEndereco === "object" && rawEndereco ? rawEndereco.refundError : void 0),
            refundAmount: data.refund_amount ? Number(data.refund_amount) : typeof rawEndereco === "object" && rawEndereco ? rawEndereco.refundAmount : void 0,
            refundProcessingStartedAt: data.refund_processing_started_at || (typeof rawEndereco === "object" && rawEndereco ? rawEndereco.refundProcessingStartedAt : void 0),
            motivoRecusa: data.motivo_recusa || (typeof rawEndereco === "object" && rawEndereco ? rawEndereco.motivoRecusa : void 0)
          };
        }
      } catch (err) {
        console.warn("[server getOrderById Supabase warning]:", err);
      }
    }
    try {
      const snap = await (0, import_firestore.getDoc)((0, import_firestore.doc)(db, "orders", String(orderId)));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
    } catch (err) {
      console.warn("[server getOrderById Firestore warning]:", err);
    }
    return null;
  }
  function humanizeMercadoPagoError(errorMsg) {
    if (!errorMsg) return "Erro desconhecido ao processar no Mercado Pago.";
    if (errorMsg.includes("pp core refund response missing refund_id")) {
      return "O pagamento j\xE1 foi estornado no Mercado Pago ou a adquirente n\xE3o p\xF4de emitir um novo ID de estorno.";
    }
    if (errorMsg.includes("Collector hasn't enough available money") || errorMsg.includes("hasn't enough available money")) {
      return "Saldo insuficiente na conta Mercado Pago do restaurante para estorno imediato (Collector hasn't enough available money). Adicione saldo \xE0 sua conta Mercado Pago ou tente novamente ap\xF3s a libera\xE7\xE3o dos fundos.";
    }
    if (errorMsg.includes("payment has already been refunded") || errorMsg.includes("already refunded")) {
      return "Este pagamento j\xE1 foi estornado anteriormente no Mercado Pago.";
    }
    if (errorMsg.includes("invalid_parameter") || errorMsg.includes("payment_id")) {
      return "ID de pagamento inv\xE1lido ou n\xE3o encontrado no Mercado Pago.";
    }
    return errorMsg;
  }
  async function saveOrderUpdates(orderId, updates) {
    if (supabaseServer) {
      try {
        const sbUpdates = {};
        if (updates.status !== void 0) sbUpdates.status = updates.status;
        if (updates.paymentStatus !== void 0) sbUpdates.payment_status = updates.paymentStatus;
        if (updates.mercadopagoStatus !== void 0) sbUpdates.mercadopago_status = updates.mercadopagoStatus;
        const { data: currentDb } = await supabaseServer.from("orders").select("endereco").eq("id", String(orderId)).maybeSingle();
        const currentEndereco = typeof currentDb?.endereco === "object" && currentDb?.endereco !== null ? currentDb.endereco : {};
        sbUpdates.endereco = {
          ...currentEndereco,
          ...updates.motivoRecusa !== void 0 ? { motivoRecusa: updates.motivoRecusa } : {},
          ...updates.refundStatus !== void 0 ? { refundStatus: updates.refundStatus } : {},
          ...updates.refundId !== void 0 ? { refundId: updates.refundId } : {},
          ...updates.refundedAt !== void 0 ? { refundedAt: updates.refundedAt } : {},
          ...updates.refundError !== void 0 ? { refundError: updates.refundError } : {},
          ...updates.refundAmount !== void 0 ? { refundAmount: updates.refundAmount } : {},
          ...updates.refundProcessingStartedAt !== void 0 ? { refundProcessingStartedAt: updates.refundProcessingStartedAt } : {}
        };
        await supabaseServer.from("orders").update(sbUpdates).eq("id", String(orderId));
      } catch (sbErr) {
        console.error("[server saveOrderUpdates Supabase error]:", sbErr);
      }
    }
    try {
      const orderRef = (0, import_firestore.doc)(db, "orders", String(orderId));
      await (0, import_firestore.setDoc)(orderRef, cleanFirestoreData(updates), { merge: true });
    } catch (fsErr) {
      console.error("[server saveOrderUpdates Firestore error]:", fsErr);
    }
  }
  async function reconcileOrderRefundWithMercadoPago(order, options = {}) {
    const paymentId = order.mercadopagoPaymentId || order.mercadopago_payment_id;
    if (!paymentId) {
      const failData = {
        refundStatus: "FALHA_NO_REEMBOLSO",
        refundError: "ID do pagamento Mercado Pago n\xE3o localizado no registro do pedido."
      };
      await saveOrderUpdates(order.id, failData);
      return {
        reconciled: true,
        status: "FALHA_NO_REEMBOLSO",
        order: { ...order, ...failData },
        error: failData.refundError
      };
    }
    try {
      console.log(`[Reconcilia\xE7\xE3o MP] Consultando status real do Pagamento #${paymentId} no Mercado Pago...`);
      const paymentInfo = await mpPayment.get({ id: String(paymentId) });
      console.log(
        `[Reconcilia\xE7\xE3o MP] Resposta MP #${paymentId}: status='${paymentInfo.status}', refunded_amount=${paymentInfo.transaction_amount_refunded}, refunds=${paymentInfo.refunds?.length || 0}`
      );
      const hasApprovedRefund = paymentInfo.status === "refunded" || Number(paymentInfo.transaction_amount_refunded || 0) > 0 && Number(paymentInfo.transaction_amount_refunded) >= Number(paymentInfo.transaction_amount || 0) || Array.isArray(paymentInfo.refunds) && paymentInfo.refunds.some((r) => r.status === "approved");
      if (hasApprovedRefund) {
        const approvedRefund = paymentInfo.refunds?.find((r) => r.status === "approved") || paymentInfo.refunds?.[0];
        const successData = {
          status: "refused",
          paymentStatus: "refunded",
          statusPagamento: "reembolsado",
          refundStatus: "REEMBOLSADO",
          refundId: approvedRefund?.id ? String(approvedRefund.id) : order.refundId || void 0,
          refundedAt: approvedRefund?.date_created || order.refundedAt || (/* @__PURE__ */ new Date()).toISOString(),
          refundAmount: Number(approvedRefund?.amount || paymentInfo.transaction_amount_refunded || order.total),
          refundError: null
        };
        await saveOrderUpdates(order.id, successData);
        console.log(`[Reconcilia\xE7\xE3o MP Success] Pedido #${order.id} confirmado como REEMBOLSADO no Mercado Pago!`);
        return {
          reconciled: true,
          status: "REEMBOLSADO",
          order: { ...order, ...successData }
        };
      }
      const hasAnyRefund = Array.isArray(paymentInfo.refunds) && paymentInfo.refunds.length > 0;
      const isPendingInMp = hasAnyRefund && paymentInfo.refunds.some((r) => r.status === "pending");
      if (isPendingInMp && !options.forceTransitionIfNoRefund) {
        console.log(`[Reconcilia\xE7\xE3o MP] Reembolso do Pedido #${order.id} ainda est\xE1 como 'pending' no Mercado Pago.`);
        return {
          reconciled: false,
          status: "REEMBOLSO_PROCESSANDO",
          order
        };
      }
      const rawError = order.refundError || "Tentativa anterior n\xE3o efetuou o estorno no Mercado Pago.";
      const humanized = humanizeMercadoPagoError(rawError);
      const failData = {
        status: "refused",
        refundStatus: "FALHA_NO_REEMBOLSO",
        refundError: humanized
      };
      await saveOrderUpdates(order.id, failData);
      console.log(`[Reconcilia\xE7\xE3o MP Reconciled] Pedido #${order.id} verificado no MP: sem estorno efetuado. Atualizado para FALHA_NO_REEMBOLSO para liberar bot\xE3o de retentativa.`);
      return {
        reconciled: true,
        status: "FALHA_NO_REEMBOLSO",
        order: { ...order, ...failData },
        error: humanized
      };
    } catch (queryErr) {
      console.error(`[Reconcilia\xE7\xE3o MP Error] Falha ao consultar Mercado Pago para Pagamento #${paymentId}:`, queryErr);
      return {
        reconciled: false,
        status: order.refundStatus || "REEMBOLSO_PROCESSANDO",
        order,
        error: queryErr?.message || "Falha na comunica\xE7\xE3o com o Mercado Pago"
      };
    }
  }
  app.post("/api/orders/:orderId/refuse", async (req, res) => {
    try {
      const { orderId } = req.params;
      const { motivoRecusa } = req.body;
      if (!motivoRecusa || typeof motivoRecusa !== "string" || !motivoRecusa.trim()) {
        return res.status(400).json({ error: "O motivo da recusa \xE9 obrigat\xF3rio." });
      }
      console.log(`[Order Refusal] Iniciando recusa do Pedido #${orderId}. Motivo: ${motivoRecusa}`);
      let order = await getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: "Pedido n\xE3o encontrado." });
      }
      if (order.refundStatus === "REEMBOLSADO") {
        return res.status(400).json({
          error: "Este pedido j\xE1 foi recusado e estornado anteriormente no Mercado Pago.",
          order
        });
      }
      const isOnlinePayment = order.paymentMethod === "mercadopago";
      const isPaid = order.paymentStatus === "paid" || order.statusPagamento === "pago" || order.payment_status === "paid" || order.mercadopagoStatus === "approved" || order.mercadopago_status === "approved";
      if (!isOnlinePayment || !isPaid) {
        const updateData = {
          status: "refused",
          motivoRecusa: motivoRecusa.trim()
        };
        await saveOrderUpdates(orderId, updateData);
        console.log(`[Order Refusal] Pedido presencial/n\xE3o-pago #${orderId} recusado com sucesso.`);
        return res.json({
          success: true,
          refunded: false,
          message: "Pedido recusado com sucesso.",
          order: { ...order, ...updateData }
        });
      }
      const paymentId = order.mercadopagoPaymentId || order.mercadopago_payment_id;
      if (!paymentId) {
        const failData = {
          status: "refused",
          motivoRecusa: motivoRecusa.trim(),
          refundStatus: "FALHA_NO_REEMBOLSO",
          refundError: "ID do pagamento Mercado Pago n\xE3o localizado no registro do pedido."
        };
        await saveOrderUpdates(orderId, failData);
        return res.status(200).json({
          success: false,
          refunded: false,
          refundStatus: "FALHA_NO_REEMBOLSO",
          error: failData.refundError,
          order: { ...order, ...failData }
        });
      }
      if (order.refundStatus === "REEMBOLSO_PROCESSANDO") {
        const reconciliation = await reconcileOrderRefundWithMercadoPago(order);
        if (reconciliation.status === "REEMBOLSADO") {
          return res.json({
            success: true,
            refunded: true,
            message: "Reembolso confirmado no Mercado Pago.",
            order: reconciliation.order
          });
        }
        if (reconciliation.status === "REEMBOLSO_PROCESSANDO") {
          return res.status(409).json({
            error: "O reembolso ainda est\xE1 sendo processado pelo Mercado Pago. Aguarde alguns instantes.",
            order: reconciliation.order
          });
        }
        order = reconciliation.order;
      }
      const preCheck = await reconcileOrderRefundWithMercadoPago(order);
      if (preCheck.status === "REEMBOLSADO") {
        return res.json({
          success: true,
          refunded: true,
          message: "Reembolso j\xE1 confirmado anteriormente no Mercado Pago.",
          order: preCheck.order
        });
      }
      await saveOrderUpdates(orderId, {
        status: "refused",
        motivoRecusa: motivoRecusa.trim(),
        refundStatus: "REEMBOLSO_PROCESSANDO",
        refundProcessingStartedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      console.log(`[Mercado Pago Refund] Solicitando reembolso total do Pagamento #${paymentId} para Pedido #${orderId}...`);
      let refundResponse = null;
      try {
        refundResponse = await mpRefund.total({
          payment_id: String(paymentId),
          requestOptions: {
            idempotencyKey: `refund-${orderId}-${paymentId}`
          }
        });
        console.log(`[Mercado Pago Refund Success] Resposta MP #${paymentId}:`, JSON.stringify(refundResponse));
      } catch (refundErr) {
        const errDetails = refundErr?.cause?.[0]?.description || refundErr?.message || String(refundErr);
        console.error(`[Mercado Pago Refund Failed] Erro ao estornar Pagamento #${paymentId}:`, errDetails);
        const postCheck = await reconcileOrderRefundWithMercadoPago(
          { ...order, refundError: errDetails },
          { forceTransitionIfNoRefund: true }
        );
        if (postCheck.status === "REEMBOLSADO") {
          return res.json({
            success: true,
            refunded: true,
            message: "Reembolso confirmado com sucesso no Mercado Pago.",
            order: postCheck.order
          });
        }
        const humanized = humanizeMercadoPagoError(errDetails);
        const failData = {
          status: "refused",
          motivoRecusa: motivoRecusa.trim(),
          refundStatus: "FALHA_NO_REEMBOLSO",
          refundError: humanized
        };
        await saveOrderUpdates(orderId, failData);
        return res.status(200).json({
          success: false,
          refunded: false,
          refundStatus: "FALHA_NO_REEMBOLSO",
          error: humanized,
          order: { ...order, ...failData }
        });
      }
      const successData = {
        status: "refused",
        motivoRecusa: motivoRecusa.trim(),
        paymentStatus: "refunded",
        statusPagamento: "reembolsado",
        refundStatus: "REEMBOLSADO",
        refundId: refundResponse?.id ? String(refundResponse.id) : void 0,
        refundedAt: (/* @__PURE__ */ new Date()).toISOString(),
        refundAmount: Number(refundResponse?.amount || order.total),
        refundError: null
      };
      await saveOrderUpdates(orderId, successData);
      console.log(`[Order Refusal Complete] Pedido #${orderId} recusado e estornado com sucesso (Refund ID: ${successData.refundId}).`);
      return res.json({
        success: true,
        refunded: true,
        message: "Pedido recusado e reembolso aprovado com sucesso no Mercado Pago.",
        order: { ...order, ...successData }
      });
    } catch (err) {
      console.error("[Order Refusal Internal Error]:", err);
      return res.status(500).json({ error: err?.message || "Erro interno ao recusar pedido." });
    }
  });
  app.post("/api/orders/:orderId/retry-refund", async (req, res) => {
    try {
      const { orderId } = req.params;
      let order = await getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: "Pedido n\xE3o encontrado." });
      }
      if (order.refundStatus === "REEMBOLSADO") {
        return res.status(400).json({ error: "Este pedido j\xE1 est\xE1 com reembolso confirmado.", order });
      }
      const paymentId = order.mercadopagoPaymentId || order.mercadopago_payment_id;
      if (!paymentId) {
        return res.status(400).json({ error: "ID de pagamento Mercado Pago n\xE3o encontrado no pedido." });
      }
      if (order.refundStatus === "REEMBOLSO_PROCESSANDO") {
        console.log(`[Retry-Refund] Pedido #${orderId} est\xE1 em REEMBOLSO_PROCESSANDO. Verificando estado real no Mercado Pago antes de qualquer a\xE7\xE3o...`);
        const rec = await reconcileOrderRefundWithMercadoPago(order, { forceTransitionIfNoRefund: true });
        if (rec.status === "REEMBOLSADO") {
          return res.json({
            success: true,
            order: rec.order,
            message: "Reembolso j\xE1 confirmado anteriormente no Mercado Pago."
          });
        }
        if (rec.status === "REEMBOLSO_PROCESSANDO") {
          return res.status(409).json({
            error: "O reembolso ainda est\xE1 sendo processado pelo Mercado Pago. Aguarde alguns instantes.",
            order: rec.order
          });
        }
        return res.json({
          success: false,
          order: rec.order,
          message: "Status sincronizado: Reembolso anterior n\xE3o foi conclu\xEDdo no Mercado Pago. O bot\xE3o para tentar novamente foi liberado."
        });
      }
      const preCheck = await reconcileOrderRefundWithMercadoPago(order);
      if (preCheck.status === "REEMBOLSADO") {
        return res.json({
          success: true,
          order: preCheck.order,
          message: "Reembolso j\xE1 confirmado anteriormente no Mercado Pago."
        });
      }
      await saveOrderUpdates(orderId, {
        refundStatus: "REEMBOLSO_PROCESSANDO",
        refundProcessingStartedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      try {
        const refundResponse = await mpRefund.total({
          payment_id: String(paymentId),
          requestOptions: {
            idempotencyKey: `retry-refund-${orderId}-${paymentId}-${Date.now()}`
          }
        });
        const successData = {
          paymentStatus: "refunded",
          statusPagamento: "reembolsado",
          refundStatus: "REEMBOLSADO",
          refundId: refundResponse?.id ? String(refundResponse.id) : void 0,
          refundedAt: (/* @__PURE__ */ new Date()).toISOString(),
          refundAmount: Number(refundResponse?.amount || order.total),
          refundError: null
        };
        await saveOrderUpdates(orderId, successData);
        return res.json({ success: true, order: { ...order, ...successData } });
      } catch (err) {
        const errDetails = err?.cause?.[0]?.description || err?.message || String(err);
        console.error(`[Retry-Refund Failed] Erro ao retentar estorno #${paymentId}:`, errDetails);
        const postCheck = await reconcileOrderRefundWithMercadoPago(
          { ...order, refundError: errDetails },
          { forceTransitionIfNoRefund: true }
        );
        if (postCheck.status === "REEMBOLSADO") {
          return res.json({ success: true, order: postCheck.order });
        }
        const humanized = humanizeMercadoPagoError(errDetails);
        const failData = {
          refundStatus: "FALHA_NO_REEMBOLSO",
          refundError: humanized
        };
        await saveOrderUpdates(orderId, failData);
        return res.status(200).json({ success: false, error: humanized, order: { ...order, ...failData } });
      }
    } catch (err) {
      return res.status(500).json({ error: err?.message || "Erro interno ao reprocessar reembolso." });
    }
  });
  app.post("/api/orders/:orderId/reconcile-refund", async (req, res) => {
    try {
      const { orderId } = req.params;
      const order = await getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: "Pedido n\xE3o encontrado." });
      }
      const result = await reconcileOrderRefundWithMercadoPago(order, { forceTransitionIfNoRefund: true });
      return res.json({ success: true, ...result });
    } catch (err) {
      return res.status(500).json({ error: err?.message || "Erro ao reconciliar estorno." });
    }
  });
  app.get("/api/mercadopago/webhook", (_req, res) => {
    return res.status(200).json({ status: "ok", message: "Webhook Mercado Pago ativo e operacional." });
  });
  app.post("/api/mercadopago/webhook", async (req, res) => {
    try {
      console.log("[Mercado Pago Webhook Received]:", JSON.stringify(req.query), JSON.stringify(req.body));
      const topic = req.query.topic || req.query.type || req.body?.type || req.body?.topic;
      if (topic && topic !== "payment") {
        console.log(`[Mercado Pago Webhook] Ignorando notifica\xE7\xE3o de t\xF3pico '${topic}'.`);
        return res.status(200).send(`T\xF3pico '${topic}' recebido e ignorado.`);
      }
      const paymentId = req.query.id || req.query["data.id"] || req.body?.data?.id || (req.body?.type === "payment" ? req.body?.data?.id : null) || req.body?.id;
      if (!paymentId) {
        return res.status(200).send("Webhook recebido sem ID de pagamento.");
      }
      const xSignature = req.headers["x-signature"];
      const xRequestId = req.headers["x-request-id"];
      if (xSignature && MERCADOPAGO_WEBHOOK_SECRET) {
        try {
          const parts = xSignature.split(",");
          let ts = "";
          let hashV1 = "";
          for (const part of parts) {
            const [key, val] = part.trim().split("=");
            if (key === "ts") ts = val;
            if (key === "v1") hashV1 = val;
          }
          if (ts && hashV1) {
            const manifest = `id:${paymentId};request-id:${xRequestId || ""};ts:${ts};`;
            const calculatedHash = import_crypto.default.createHmac("sha256", MERCADOPAGO_WEBHOOK_SECRET).update(manifest).digest("hex");
            if (calculatedHash === hashV1) {
              console.log("[Mercado Pago Webhook] Assinatura X-Signature validada com sucesso.");
            } else {
              console.warn(`[Mercado Pago Webhook] Alerta: Assinatura X-Signature n\xE3o coincidiu (Calculada: ${calculatedHash}, Recebida: ${hashV1}). Prosseguindo com consulta de seguran\xE7a na API do MP.`);
            }
          }
        } catch (sigErr) {
          console.error("[Mercado Pago Webhook Signature Validation Warning]:", sigErr);
        }
      }
      console.log(`[Mercado Pago Webhook] Consultando status do Pagamento #${paymentId}...`);
      let paymentInfo = null;
      try {
        paymentInfo = await mpPayment.get({ id: String(paymentId) });
      } catch (getErr) {
        if (getErr?.status === 404 || getErr?.error === "not_found" || getErr?.message?.includes("not_found")) {
          console.warn(`[Mercado Pago Webhook] Pagamento #${paymentId} n\xE3o encontrado no MP (pode ser evento de teste ou ordem).`);
          return res.status(200).send("Pagamento n\xE3o encontrado no MP.");
        }
        throw getErr;
      }
      if (paymentInfo && paymentInfo.external_reference) {
        const orderId = paymentInfo.external_reference;
        const status = paymentInfo.status;
        console.log(`[Mercado Pago Webhook] Pedido #${orderId} -> Status: ${status}`);
        if (supabaseServer) {
          try {
            const updatePayload = {
              payment_status: status === "approved" ? "paid" : status,
              mercadopago_status: status,
              mercadopago_payment_id: String(paymentId)
            };
            if (status === "approved") {
              updatePayload.status = "pending";
            }
            await supabaseServer.from("orders").update(updatePayload).eq("id", String(orderId));
            console.log(`[Supabase Webhook Success] Pedido #${orderId} atualizado no Supabase.`);
          } catch (sbErr) {
            console.error(`[Supabase Webhook Error]:`, sbErr);
          }
        }
        const orderRef = (0, import_firestore.doc)(db, "orders", String(orderId));
        const orderSnap = await (0, import_firestore.getDoc)(orderRef);
        if (orderSnap.exists()) {
          const currentOrder = orderSnap.data();
          if (status === "approved") {
            const nextStatus = currentOrder.status === "awaiting_payment" || !currentOrder.status ? "pending" : currentOrder.status;
            await (0, import_firestore.setDoc)(
              orderRef,
              cleanFirestoreData({
                paymentStatus: "paid",
                statusPagamento: "pago",
                status: nextStatus,
                paidAt: (/* @__PURE__ */ new Date()).toISOString(),
                mercadopagoPaymentId: String(paymentId),
                mercadopagoStatus: status,
                mercadopagoPaymentMethod: paymentInfo.payment_method_id
              }),
              { merge: true }
            );
            console.log(`[Webhook Success] Pedido #${orderId} atualizado para 'PAGO' e enviado para o restaurante aceitar!`);
          } else {
            await (0, import_firestore.setDoc)(
              orderRef,
              cleanFirestoreData({
                mercadopagoPaymentId: String(paymentId),
                mercadopagoStatus: status,
                mercadopagoPaymentMethod: paymentInfo.payment_method_id
              }),
              { merge: true }
            );
          }
        } else {
          console.warn(`[Webhook Warning] Pedido #${orderId} n\xE3o encontrado no Firestore.`);
        }
      }
      return res.status(200).send("Webhook processado com sucesso.");
    } catch (error) {
      console.error("[Mercado Pago Webhook Error]:", error);
      return res.status(200).send("Erro interno ao processar webhook.");
    }
  });
  app.get("/api/mercadopago/payment-status/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!id || id === "null" || id === "undefined") {
        return res.status(400).json({ error: "ID do pagamento \xE9 obrigat\xF3rio" });
      }
      let paymentInfo = null;
      try {
        paymentInfo = await mpPayment.get({ id });
      } catch (getErr) {
        if (getErr?.status === 404 || getErr?.error === "not_found" || getErr?.message?.includes("not_found")) {
          return res.status(404).json({ status: "not_found", error: "Pagamento n\xE3o encontrado no Mercado Pago" });
        }
        throw getErr;
      }
      if (paymentInfo.status === "approved" && paymentInfo.external_reference) {
        const orderId = String(paymentInfo.external_reference);
        if (supabaseServer) {
          try {
            await supabaseServer.from("orders").update({
              payment_status: "paid",
              status: "pending",
              mercadopago_status: "approved",
              mercadopago_payment_id: String(paymentInfo.id)
            }).eq("id", orderId);
            console.log(`[Supabase Status Check] Pedido #${orderId} atualizado para 'paid' e 'pending' no Supabase.`);
          } catch (sbErr) {
            console.error(`[Supabase Error on Status Check]:`, sbErr);
          }
        }
        const orderRef = (0, import_firestore.doc)(db, "orders", orderId);
        const orderSnap = await (0, import_firestore.getDoc)(orderRef);
        if (orderSnap.exists()) {
          const currentOrder = orderSnap.data();
          if (currentOrder.paymentStatus !== "paid") {
            const nextStatus = currentOrder.status === "awaiting_payment" || !currentOrder.status ? "pending" : currentOrder.status;
            await (0, import_firestore.setDoc)(
              orderRef,
              cleanFirestoreData({
                paymentStatus: "paid",
                statusPagamento: "pago",
                status: nextStatus,
                paidAt: (/* @__PURE__ */ new Date()).toISOString(),
                mercadopagoStatus: "approved"
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
        external_reference: paymentInfo.external_reference
      });
    } catch (error) {
      console.error("[Mercado Pago Status Error]:", error);
      return res.status(500).json({ error: "Erro ao verificar status do pagamento" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Maestria Grill rodando na porta ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
