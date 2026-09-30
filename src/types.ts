export interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: string;
  active: boolean;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export type OrderStatus = 'awaiting_payment' | 'pending' | 'preparing' | 'ready' | 'delivered' | 'refused';

export interface Address {
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  complement?: string;
  reference?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  address?: Address;
  role?: 'cliente' | 'motoboy' | 'admin' | 'superadmin';
  online?: boolean;
  active?: boolean;
  ultimaLocalizacao?: {
    lat: number;
    lng: number;
  };
  ultimaAtualizacao?: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  address: string;
  complement?: string;
  paymentMethod: 'pix' | 'card' | 'cash';
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  
  // New MVP Phase 1 Fields
  tipoPedido: 'entrega' | 'retirada';
  valorProdutos?: number;
  taxaEntrega?: number;
  valorTotal?: number;
  formaEntrega: string; // e.g. "Entrega" or "Retirada"
  endereco: Address | string;
  usuario?: {
    uid: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  itens: OrderItem[];
  horarioPedido: string;
  cupom?: string;
  desconto?: number;

  // New Motoboy Phase 2 Fields
  motoboyId?: string;
  statusEntrega?: 'aceito' | 'retirado' | 'a_caminho' | 'entregue';
  horarioEntrega?: string;
  motivoRecusa?: string;

  // Mercado Pago Payment Fields
  paymentStatus?: 'pending' | 'paid' | 'refused' | 'cancelled';
  statusPagamento?: 'pendente' | 'pago' | 'recusado' | 'cancelado';
  mercadopagoPaymentId?: string;
  mercadopagoStatus?: string;
  mercadopagoPaymentMethod?: string;
  paidAt?: string;
}

export interface Coupon {
  id: string;
  name: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  validUntil: string;
  maxUses?: number;
  usedCount: number;
  active: boolean;
}

export interface RestaurantSettings {
  name: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  deliveryFee: number;
  phone: string;
  address: string;

  // 1. Informações do Restaurante
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  email?: string;
  horarioFuncionamento?: string;

  // 2. Configurações de Entrega
  minOrderValue?: number;
  maxDeliveryDistance?: number;
  avgDeliveryTime?: string;
  avgPickupTime?: string;
  allowPickup?: boolean;
  allowDelivery?: boolean;

  // 3. Formas de Pagamento
  paymentPix?: boolean;
  paymentCash?: boolean;
  paymentCreditCard?: boolean;
  paymentDebitCard?: boolean;

  // 4. Cupons
  coupons?: Coupon[];

  // 5. Banner Promocional
  promoBannerEnabled?: boolean;
  promoBannerTitle?: string;
  promoBannerDesc?: string;
  promoBannerImage?: string;
  promoBannerBtnText?: string;
  promoBannerBtnLink?: string;
  promoBannerStart?: string;
  promoBannerEnd?: string;

  // 6. Configurações dos Motoboys
  motoboyDistribution?: 'manual' | 'automatic';
  motoboyMaxSimultaneousOrders?: number;
  motoboyMaxAcceptTime?: number;
  motoboyMaxDistance?: number;

  // 7. Notificações
  notifyPush?: boolean;
  notifyEmail?: boolean;
  notifySms?: boolean;

  // 8. Aparência
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  homeImage?: string;
  splashImage?: string;
  appNameExhibited?: string;

  // 9. Modo Manutenção
  maintenanceMode?: boolean;

  // 10. Backup
  lastBackupDate?: string;
}
