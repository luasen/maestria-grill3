import { supabase, isSupabaseConfigured } from './supabase';
import { Category, Product, Order, RestaurantSettings, UserProfile } from '../types';
import { deleteImageFromStorage } from './imageService';
// @ts-ignore
import restaurantBanner from '../assets/images/restaurant_banner_1783985102418.jpg';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface DbErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

export function handleFirestoreError(error: any, operationType: OperationType, path: string | null): never {
  console.error(`Database error [${operationType} on ${path}]:`, error);
  throw error;
}

// Helper to remove undefined values from objects before writing
export function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as any;
  }
  if (typeof obj === 'object') {
    const clean = { ...obj } as any;
    Object.keys(clean).forEach((key) => {
      if (clean[key] === undefined) {
        delete clean[key];
      } else if (clean[key] !== null && typeof clean[key] === 'object') {
        clean[key] = cleanUndefined(clean[key]);
      }
    });
    return clean;
  }
  return obj;
}

// Initial data to pre-populate if empty
const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Pratos', slug: 'pratos', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80' },
  { id: 'cat-2', name: 'Lanches', slug: 'lanches', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80' },
  { id: 'cat-3', name: 'Bebidas', slug: 'bebidas', image: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=600&auto=format&fit=crop&q=80' },
  { id: 'cat-4', name: 'Sobremesas', slug: 'sobremesas', image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80' },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Filé Mignon Grelhado',
    description: 'Medalhão de filé mignon grelhado na brasa, servido com arroz biro-biro, batatas rústicas douradas e molho chimichurri caseiro.',
    price: 68.90,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    categoryId: 'cat-1',
    active: true,
  },
  {
    id: 'prod-2',
    name: 'Risoto de Cogumelos',
    description: 'Arroz arbóreo italiano cremoso cozido com mix de cogumelos frescos (shimeji, paris e portobello), finalizado com queijo parmesão grana padano e azeite de trufas brancas.',
    price: 54.00,
    image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&auto=format&fit=crop&q=80',
    categoryId: 'cat-1',
    active: true,
  },
  {
    id: 'prod-3',
    name: 'Smash Burger Duplo',
    description: 'Dois smash burgers de 90g de carne angus, queijo cheddar derretido, cebola caramelizada, picles artesanal e molho secreto da casa no pão de brioche tostado.',
    price: 34.90,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
    categoryId: 'cat-2',
    active: true,
  },
  {
    id: 'prod-4',
    name: 'Chicken Club Sandwich',
    description: 'Sanduíche de peito de frango grelhado e desfiado, bacon crocante, queijo prato, maionese verde, tomate fresco e alface americana no pão de forma tostado.',
    price: 29.90,
    image: 'https://images.unsplash.com/photo-1521390188846-e2a3a97453a0?w=600&auto=format&fit=crop&q=80',
    categoryId: 'cat-2',
    active: true,
  },
  {
    id: 'prod-5',
    name: 'Suco Natural de Maracujá',
    description: 'Suco feito na hora com a polpa fresca de maracujá, batido com gelo. Refrescante e naturalmente doce-azedo.',
    price: 12.00,
    image: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=600&auto=format&fit=crop&q=80',
    categoryId: 'cat-3',
    active: true,
  },
  {
    id: 'prod-6',
    name: 'Refrigerante Lata',
    description: 'Coca-Cola Original ou Zero açúcar lata 350ml bem gelada.',
    price: 6.50,
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
    categoryId: 'cat-3',
    active: true,
  },
  {
    id: 'prod-7',
    name: 'Petit Gâteau Clássico',
    description: 'Bolinho de chocolate com recheio cremoso e quente, servido com uma generosa bola de sorvete de creme artesanal e calda de chocolate belga.',
    price: 24.90,
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
    categoryId: 'cat-4',
    active: true,
  },
  {
    id: 'prod-8',
    name: 'Pudim de Leite Condensado',
    description: 'O clássico pudim de leite condensado super cremoso, lisinho e sem furinhos, com calda de caramelo dourado perfeito.',
    price: 15.00,
    image: 'https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=600&auto=format&fit=crop&q=80',
    categoryId: 'cat-4',
    active: true,
  },
];

const DEFAULT_SETTINGS: RestaurantSettings = {
  name: 'Maestria Grill',
  description: 'O autêntico sabor da brasa com carnes nobres grelhadas com perfeição e paixão em servir.',
  logoUrl: '🥩',
  bannerUrl: restaurantBanner,
  deliveryFee: 7.00,
  phone: '(11) 99999-8888',
  address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',

  whatsapp: '(11) 99999-8888',
  instagram: '@maestriagrill',
  facebook: 'maestriagrill',
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

  coupons: [
    {
      id: 'cupom-primeiro',
      name: 'Primeira Compra',
      code: 'BEMVINDO',
      discountType: 'percentage',
      discountValue: 10,
      validUntil: '2027-12-31',
      maxUses: 100,
      usedCount: 0,
      active: true,
    },
    {
      id: 'cupom-quinze',
      name: 'Desconto de R$15',
      code: 'MAESTRIA15',
      discountType: 'fixed',
      discountValue: 15,
      validUntil: '2027-12-31',
      maxUses: 50,
      usedCount: 0,
      active: true,
    }
  ],

  promoBannerEnabled: true,
  promoBannerTitle: 'Festival do Ribeye Premium',
  promoBannerDesc: 'Neste final de semana, saboreie o melhor Ribeye grelhado com 20% de desconto real!',
  promoBannerImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
  promoBannerBtnText: 'Ver Prato Principal',
  promoBannerBtnLink: '#menu',
  promoBannerStart: '',
  promoBannerEnd: '',

  motoboyDistribution: 'automatic',
  motoboyMaxSimultaneousOrders: 3,
  motoboyMaxAcceptTime: 60,
  motoboyMaxDistance: 15,

  notifyPush: true,
  notifyEmail: true,
  notifySms: false,

  primaryColor: '#ea580c',
  secondaryColor: '#f97316',
  backgroundColor: '#fff7f4',
  homeImage: '',
  splashImage: '',
  appNameExhibited: 'Maestria Grill',

  maintenanceMode: false,
  lastBackupDate: new Date().toLocaleDateString('pt-BR'),
};

const LOCAL_STORAGE_KEYS = {
  CATEGORIES: 'maestria_categories',
  PRODUCTS: 'maestria_products',
  ORDERS: 'maestria_orders',
  SETTINGS: 'maestria_settings',
  USERS: 'maestria_local_users',
  MESSAGES: 'maestria_chat_messages',
};

// Helper for local storage persistence
function getLocalItem<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const dbService = {
  // --- CATEGORIES ---
  async getCategories(): Promise<Category[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('categories').select('*').order('name');
        if (!error && data && data.length > 0) {
          const list = data as Category[];
          setLocalItem(LOCAL_STORAGE_KEYS.CATEGORIES, list);
          return list;
        }
      } catch (err) {
        console.warn('Error fetching categories from Supabase:', err);
      }
    }
    return getLocalItem<Category[]>(LOCAL_STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  },

  async saveCategories(categories: Category[]): Promise<Category[]> {
    setLocalItem(LOCAL_STORAGE_KEYS.CATEGORIES, categories);
    if (isSupabaseConfigured) {
      try {
        await supabase.from('categories').upsert(categories.map(c => cleanUndefined(c)));
      } catch (err) {
        console.warn('Error saving categories to Supabase:', err);
      }
    }
    return categories;
  },

  async addCategory(name: string, image?: string): Promise<Category> {
    const id = `cat-${Date.now()}`;
    const newCategory: Category = {
      id,
      name,
      slug: name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-'),
    };
    if (image !== undefined) {
      newCategory.image = image;
    }

    const current = getLocalItem<Category[]>(LOCAL_STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    setLocalItem(LOCAL_STORAGE_KEYS.CATEGORIES, [...current, newCategory]);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('categories').insert(cleanUndefined(newCategory));
      } catch (err) {
        console.warn('Error adding category to Supabase:', err);
      }
    }
    return newCategory;
  },

  async updateCategory(id: string, name: string, image?: string): Promise<Category> {
    const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
    const updatedCategory: Category = { id, name, slug };
    if (image !== undefined) {
      updatedCategory.image = image;
    }

    const current = getLocalItem<Category[]>(LOCAL_STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    const existing = current.find(c => c.id === id);

    // If image changed, clean up the previous image from category-images bucket
    if (image !== undefined && existing?.image && image !== existing.image) {
      deleteImageFromStorage(existing.image, 'category-images').catch(() => {});
    }

    setLocalItem(LOCAL_STORAGE_KEYS.CATEGORIES, current.map(c => c.id === id ? { ...c, ...updatedCategory } : c));

    if (isSupabaseConfigured) {
      try {
        await supabase.from('categories').update(cleanUndefined(updatedCategory)).eq('id', id);
      } catch (err) {
        console.warn('Error updating category in Supabase:', err);
      }
    }
    return updatedCategory;
  },

  async deleteCategory(id: string): Promise<boolean> {
    const current = getLocalItem<Category[]>(LOCAL_STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    const existing = current.find(c => c.id === id);

    // Remove category image from Storage
    if (existing?.image) {
      deleteImageFromStorage(existing.image, 'category-images').catch(() => {});
    }

    setLocalItem(LOCAL_STORAGE_KEYS.CATEGORIES, current.filter(c => c.id !== id));

    if (isSupabaseConfigured) {
      try {
        await supabase.from('categories').delete().eq('id', id);
      } catch (err) {
        console.warn('Error deleting category from Supabase:', err);
      }
    }
    return true;
  },

  // --- PRODUCTS ---
  async getProducts(): Promise<Product[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('products').select('*').order('name');
        if (!error && data && data.length > 0) {
          const products = data.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description || '',
            price: Number(p.price),
            image: p.image || '',
            categoryId: p.category_id || p.categoryId,
            active: p.active !== false,
          })) as Product[];
          setLocalItem(LOCAL_STORAGE_KEYS.PRODUCTS, products);
          return products;
        }
      } catch (err) {
        console.warn('Error fetching products from Supabase:', err);
      }
    }
    return getLocalItem<Product[]>(LOCAL_STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  },

  async saveProducts(products: Product[]): Promise<Product[]> {
    setLocalItem(LOCAL_STORAGE_KEYS.PRODUCTS, products);
    if (isSupabaseConfigured) {
      try {
        const rows = products.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          image: p.image,
          category_id: p.categoryId,
          active: p.active,
        }));
        await supabase.from('products').upsert(rows);
      } catch (err) {
        console.warn('Error saving products to Supabase:', err);
      }
    }
    return products;
  },

  async addProduct(product: Omit<Product, 'id'>): Promise<Product> {
    const id = `prod-${Date.now()}`;
    const newProduct: Product = {
      ...product,
      id,
    };

    const current = getLocalItem<Product[]>(LOCAL_STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    setLocalItem(LOCAL_STORAGE_KEYS.PRODUCTS, [...current, newProduct]);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('products').insert({
          id,
          name: newProduct.name,
          description: newProduct.description,
          price: newProduct.price,
          image: newProduct.image,
          category_id: newProduct.categoryId,
          active: newProduct.active,
        });
      } catch (err) {
        console.warn('Error adding product to Supabase:', err);
      }
    }
    return newProduct;
  },

  async updateProduct(id: string, updatedProduct: Partial<Product>): Promise<Product> {
    const current = getLocalItem<Product[]>(LOCAL_STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    const existing = current.find(p => p.id === id) || INITIAL_PRODUCTS.find(p => p.id === id) || {
      id,
      name: '',
      description: '',
      price: 0,
      image: '',
      categoryId: '',
      active: true,
    };

    // If image changed, clean up previous image from product-images bucket
    if (updatedProduct.image && existing.image && updatedProduct.image !== existing.image) {
      deleteImageFromStorage(existing.image, 'product-images').catch(() => {});
    }

    const merged: Product = { ...existing, ...updatedProduct };
    setLocalItem(LOCAL_STORAGE_KEYS.PRODUCTS, current.map(p => p.id === id ? merged : p));

    if (isSupabaseConfigured) {
      try {
        const updateData: any = {};
        if (updatedProduct.name !== undefined) updateData.name = updatedProduct.name;
        if (updatedProduct.description !== undefined) updateData.description = updatedProduct.description;
        if (updatedProduct.price !== undefined) updateData.price = updatedProduct.price;
        if (updatedProduct.image !== undefined) updateData.image = updatedProduct.image;
        if (updatedProduct.categoryId !== undefined) updateData.category_id = updatedProduct.categoryId;
        if (updatedProduct.active !== undefined) updateData.active = updatedProduct.active;
        await supabase.from('products').update(updateData).eq('id', id);
      } catch (err) {
        console.warn('Error updating product in Supabase:', err);
      }
    }
    return merged;
  },

  async deleteProduct(id: string): Promise<boolean> {
    const current = getLocalItem<Product[]>(LOCAL_STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    const existing = current.find(p => p.id === id);

    // Remove product image from Storage
    if (existing?.image) {
      deleteImageFromStorage(existing.image, 'product-images').catch(() => {});
    }

    setLocalItem(LOCAL_STORAGE_KEYS.PRODUCTS, current.filter(p => p.id !== id));

    if (isSupabaseConfigured) {
      try {
        await supabase.from('products').delete().eq('id', id);
      } catch (err) {
        console.warn('Error deleting product from Supabase:', err);
      }
    }
    return true;
  },

  // --- ORDERS ---
  async getOrders(): Promise<Order[]> {
    const DELIVERY_RANK: Record<string, number> = {
      'aceito': 1,
      'retirado': 2,
      'a_caminho': 3,
      'entregue': 4,
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          const localOrders = getLocalItem<Order[]>(LOCAL_STORAGE_KEYS.ORDERS, []);
          const localMap = new Map<string, Order>(localOrders.map(o => [o.id, o]));

          const list = data.map((o: any) => {
            const rawEndereco = o.endereco;
            const statusEntregaFromDb = o.status_entrega || (typeof rawEndereco === 'object' && rawEndereco !== null ? rawEndereco.statusEntrega : undefined);
            const localOrder = localMap.get(o.id);
            const localStatusEntrega = localOrder?.statusEntrega;

            // Monotonic resolution: higher progression rank wins to prevent stale overwrites
            let finalStatusEntrega = statusEntregaFromDb || localStatusEntrega;
            if (statusEntregaFromDb && localStatusEntrega) {
              const dbRank = DELIVERY_RANK[statusEntregaFromDb] || 0;
              const localRank = DELIVERY_RANK[localStatusEntrega] || 0;
              finalStatusEntrega = localRank > dbRank ? localStatusEntrega : statusEntregaFromDb;
            }

            return {
              id: o.id,
              customerName: o.customer_name,
              customerPhone: o.customer_phone,
              customerEmail: o.customer_email,
              address: o.address,
              complement: o.complement,
              paymentMethod: o.payment_method,
              paymentStatus: o.payment_status,
              status: o.status,
              subtotal: Number(o.subtotal || 0),
              deliveryFee: Number(o.delivery_fee || 0),
              total: Number(o.total || 0),
              valorProdutos: Number(o.subtotal || 0),
              taxaEntrega: Number(o.delivery_fee || 0),
              valorTotal: Number(o.total || 0),
              tipoPedido: o.tipo_pedido,
              formaEntrega: o.forma_entrega,
              endereco: rawEndereco,
              statusEntrega: finalStatusEntrega,
              items: o.items || [],
              itens: o.items || [],
              usuario: o.user_id ? { uid: o.user_id, email: o.customer_email } : undefined,
              horarioPedido: o.horario_pedido || o.created_at,
              createdAt: o.created_at,
              cupom: o.cupom,
              desconto: o.desconto ? Number(o.desconto) : undefined,
              motoboyId: o.motoboy_id || localOrder?.motoboyId,
              mercadopagoPaymentId: o.mercadopago_payment_id,
              mercadopagoStatus: o.mercadopago_status,
            };
          }) as unknown as Order[];
          setLocalItem(LOCAL_STORAGE_KEYS.ORDERS, list);
          return list;
        }
      } catch (err) {
        console.warn('Error fetching orders from Supabase:', err);
      }
    }
    return getLocalItem<Order[]>(LOCAL_STORAGE_KEYS.ORDERS, []);
  },

  async saveOrders(orders: Order[]): Promise<Order[]> {
    setLocalItem(LOCAL_STORAGE_KEYS.ORDERS, orders);
    return orders;
  },

  async createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'status'> & { status?: Order['status'] }): Promise<Order> {
    const id = `PED-${Math.floor(100000 + Math.random() * 900000)}`;
    const newOrder: Order = {
      ...orderData,
      id,
      status: orderData.status || 'pending',
      createdAt: new Date().toISOString(),
    };

    const current = getLocalItem<Order[]>(LOCAL_STORAGE_KEYS.ORDERS, []);
    setLocalItem(LOCAL_STORAGE_KEYS.ORDERS, [newOrder, ...current]);

    if (isSupabaseConfigured) {
      try {
        const payload: any = {
          id: newOrder.id,
          customer_name: newOrder.customerName,
          customer_phone: newOrder.customerPhone,
          customer_email: newOrder.customerEmail || newOrder.usuario?.email,
          address: newOrder.address,
          complement: newOrder.complement,
          payment_method: newOrder.paymentMethod,
          payment_status: newOrder.paymentStatus,
          status: newOrder.status,
          subtotal: newOrder.subtotal,
          delivery_fee: newOrder.deliveryFee,
          total: newOrder.total,
          tipo_pedido: newOrder.tipoPedido,
          forma_entrega: newOrder.formaEntrega,
          endereco: newOrder.endereco,
          items: newOrder.items,
          user_id: newOrder.usuario?.uid,
          horario_pedido: newOrder.horarioPedido,
          cupom: newOrder.cupom,
          desconto: newOrder.desconto,
        };

        const { error } = await supabase.from('orders').insert(payload);
        if (error) {
          console.error('[Supabase createOrder Error]:', error);
          throw new Error(`Erro ao gravar pedido no Supabase: ${error.message || error.details}`);
        }
      } catch (err: any) {
        console.error('Error creating order in Supabase:', err);
        throw err;
      }
    }
    return newOrder;
  },

  async updateOrderStatus(id: string, status: Order['status']): Promise<Order> {
    const current = getLocalItem<Order[]>(LOCAL_STORAGE_KEYS.ORDERS, []);
    const existing = current.find(o => o.id === id);
    const updates: Partial<Order> = { status };
    if (status === 'delivered') {
      updates.paymentStatus = 'paid';
      updates.statusPagamento = 'pago';
      updates.statusEntrega = 'entregue';
      updates.paidAt = new Date().toISOString();
    }
    const updatedOrder: Order = existing ? { ...existing, ...updates } : ({ id, status, createdAt: new Date().toISOString() } as any);
    if (updates.statusEntrega && typeof updatedOrder.endereco === 'object' && updatedOrder.endereco !== null) {
      updatedOrder.endereco = { ...updatedOrder.endereco, statusEntrega: updates.statusEntrega };
    }
    setLocalItem(LOCAL_STORAGE_KEYS.ORDERS, current.map(o => o.id === id ? updatedOrder : o));

    if (isSupabaseConfigured) {
      try {
        const sbUpdates: any = { status };
        if (status === 'delivered') {
          sbUpdates.payment_status = 'paid';
          if (updatedOrder.endereco) {
            sbUpdates.endereco = updatedOrder.endereco;
          }
        }
        await supabase.from('orders').update(sbUpdates).eq('id', id);
      } catch (err) {
        console.warn('Error updating order status in Supabase:', err);
      }
    }
    return updatedOrder;
  },

  async updateOrder(id: string, updatedFields: Partial<Order>): Promise<Order> {
    const fields = { ...updatedFields };
    if (fields.status === 'delivered' || fields.statusEntrega === 'entregue') {
      fields.paymentStatus = 'paid';
      fields.statusPagamento = 'pago';
      if (!fields.paidAt) {
        fields.paidAt = new Date().toISOString();
      }
    }

    const current = getLocalItem<Order[]>(LOCAL_STORAGE_KEYS.ORDERS, []);
    const existing = current.find(o => o.id === id);
    const updatedOrder: Order = existing ? { ...existing, ...fields } : ({ id, ...fields, createdAt: new Date().toISOString() } as any);

    // Persist statusEntrega into endereco JSONB (guaranteed to exist in PostgreSQL)
    if (fields.statusEntrega !== undefined) {
      const currentEndereco = typeof updatedOrder.endereco === 'object' && updatedOrder.endereco !== null ? updatedOrder.endereco : {};
      updatedOrder.endereco = {
        ...currentEndereco,
        statusEntrega: fields.statusEntrega,
      } as any;
    }

    setLocalItem(LOCAL_STORAGE_KEYS.ORDERS, current.map(o => o.id === id ? updatedOrder : o));

    if (isSupabaseConfigured) {
      try {
        const sbUpdates: any = {};
        if (fields.status !== undefined) sbUpdates.status = fields.status;
        if (fields.paymentStatus !== undefined) sbUpdates.payment_status = fields.paymentStatus;
        if (fields.motoboyId !== undefined) sbUpdates.motoboy_id = fields.motoboyId;
        if (fields.mercadopagoPaymentId !== undefined) sbUpdates.mercadopago_payment_id = fields.mercadopagoPaymentId;
        if (fields.mercadopagoStatus !== undefined) sbUpdates.mercadopago_status = fields.mercadopagoStatus;
        if (fields.statusEntrega !== undefined && updatedOrder.endereco) {
          sbUpdates.endereco = updatedOrder.endereco;
        }

        // Try updating including status_entrega column if available in DB schema
        let { error } = await supabase.from('orders').update({
          ...sbUpdates,
          ...(fields.statusEntrega !== undefined ? { status_entrega: fields.statusEntrega } : {})
        }).eq('id', id);

        if (error && error.message?.includes('status_entrega')) {
          // If status_entrega column does not exist yet in schema, update with endereco JSONB
          const { error: fallbackErr } = await supabase.from('orders').update(sbUpdates).eq('id', id);
          if (fallbackErr) {
            console.error('[Supabase updateOrder Fallback Error]:', fallbackErr);
          }
        } else if (error) {
          console.error('[Supabase updateOrder Error]:', error);
        }
      } catch (err) {
        console.error('Error updating order in Supabase:', err);
      }
    }
    return updatedOrder;
  },

  // --- SETTINGS ---
  async getSettings(): Promise<RestaurantSettings> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('settings').select('*').eq('id', 'main').single();
        if (!error && data) {
          const settings: RestaurantSettings = {
            ...DEFAULT_SETTINGS,
            ...(data.data || {}),
            name: data.name || DEFAULT_SETTINGS.name,
            description: data.description || DEFAULT_SETTINGS.description,
            deliveryFee: Number(data.delivery_fee ?? DEFAULT_SETTINGS.deliveryFee),
            phone: data.phone || DEFAULT_SETTINGS.phone,
            address: data.address || DEFAULT_SETTINGS.address,
            whatsapp: data.whatsapp || DEFAULT_SETTINGS.whatsapp,
            email: data.email || DEFAULT_SETTINGS.email,
            maintenanceMode: data.maintenance_mode ?? DEFAULT_SETTINGS.maintenanceMode,
          };
          setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, settings);
          return settings;
        }
      } catch (err) {
        console.warn('Error fetching settings from Supabase:', err);
      }
    }
    return getLocalItem<RestaurantSettings>(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  },

  async saveSettings(settings: RestaurantSettings): Promise<RestaurantSettings> {
    const prev = getLocalItem<RestaurantSettings>(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    if (prev.bannerUrl && settings.bannerUrl && prev.bannerUrl !== settings.bannerUrl) {
      deleteImageFromStorage(prev.bannerUrl, 'restaurant-images').catch(() => {});
    }
    if (prev.logoUrl && settings.logoUrl && prev.logoUrl !== settings.logoUrl) {
      deleteImageFromStorage(prev.logoUrl, 'restaurant-images').catch(() => {});
    }

    setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, settings);
    if (isSupabaseConfigured) {
      try {
        await supabase.from('settings').upsert({
          id: 'main',
          name: settings.name,
          description: settings.description,
          delivery_fee: settings.deliveryFee,
          phone: settings.phone,
          address: settings.address,
          whatsapp: settings.whatsapp,
          email: settings.email,
          maintenance_mode: settings.maintenanceMode,
          data: cleanUndefined(settings),
        });
      } catch (err) {
        console.warn('Error saving settings to Supabase:', err);
      }
    }
    return settings;
  },

  // --- USERS MANAGEMENT ---
  async getUsers(): Promise<UserProfile[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          return data as UserProfile[];
        }
      } catch (e) {
        console.warn('Error fetching users from Supabase:', e);
      }
    }
    try {
      const local = localStorage.getItem('maestria_local_users');
      if (local) {
        return Object.values(JSON.parse(local)) as UserProfile[];
      }
    } catch {}
    return [];
  },

  async updateUserProfile(uid: string, fields: Partial<UserProfile>): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('profiles').update(cleanUndefined(fields)).eq('id', uid);
      } catch (error) {
        console.error('Error updating user profile in Supabase:', error);
      }
    }
    try {
      const local = localStorage.getItem('maestria_local_users');
      const users = local ? JSON.parse(local) : {};
      if (users[uid]) {
        users[uid] = { ...users[uid], ...fields };
        localStorage.setItem('maestria_local_users', JSON.stringify(users));
      }
    } catch {}
  },

  // --- CHAT MESSAGES ---
  async getOrderMessages(orderId: string): Promise<any[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('order_messages')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: true });
        if (!error && data) {
          return data.map((m: any) => ({
            id: m.id,
            orderId: m.order_id,
            senderId: m.sender_id,
            senderName: m.sender_name,
            senderRole: m.sender_role,
            text: m.text,
            createdAt: m.created_at,
            readBy: Array.isArray(m.read_by) ? m.read_by : [],
          }));
        }
      } catch (err) {
        console.warn('Error fetching messages from Supabase:', err);
      }
    }
    const all = getLocalItem<Record<string, any[]>>(LOCAL_STORAGE_KEYS.MESSAGES, {});
    return all[orderId] || [];
  },

  async sendOrderMessage(message: {
    orderId: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    text: string;
  }): Promise<any> {
    const newMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      ...message,
      createdAt: new Date().toISOString(),
      readBy: [message.senderId],
    };

    const all = getLocalItem<Record<string, any[]>>(LOCAL_STORAGE_KEYS.MESSAGES, {});
    const orderMsgs = all[message.orderId] || [];
    all[message.orderId] = [...orderMsgs, newMessage];
    setLocalItem(LOCAL_STORAGE_KEYS.MESSAGES, all);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('order_messages').insert({
          order_id: message.orderId,
          sender_id: message.senderId,
          sender_name: message.senderName,
          sender_role: message.senderRole,
          text: message.text,
          read_by: [message.senderId],
        });
      } catch (err) {
        console.warn('Error sending message to Supabase:', err);
      }
    }

    return newMessage;
  },

  async markOrderMessagesAsRead(orderId: string, userId: string): Promise<void> {
    const all = getLocalItem<Record<string, any[]>>(LOCAL_STORAGE_KEYS.MESSAGES, {});
    const orderMsgs = all[orderId] || [];
    all[orderId] = orderMsgs.map((m: any) => ({
      ...m,
      readBy: Array.from(new Set([...(m.readBy || []), userId])),
    }));
    setLocalItem(LOCAL_STORAGE_KEYS.MESSAGES, all);

    if (isSupabaseConfigured) {
      try {
        const { data: messages } = await supabase
          .from('order_messages')
          .select('id, read_by')
          .eq('order_id', orderId);

        if (messages) {
          for (const msg of messages) {
            const currentRead = Array.isArray(msg.read_by) ? msg.read_by : [];
            if (!currentRead.includes(userId)) {
              await supabase
                .from('order_messages')
                .update({ read_by: [...currentRead, userId] })
                .eq('id', msg.id);
            }
          }
        }
      } catch (err) {
        console.warn('Error marking messages read in Supabase:', err);
      }
    }
  },
};
