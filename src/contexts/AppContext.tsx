import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Category, Product, Order, RestaurantSettings, UserProfile } from '../types';
import { dbService } from '../services/db';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { useAuth } from './AuthContext';
import { updateThemeColors } from '../utils/theme';

export type ActiveView = 'home' | 'menu' | 'cart' | 'checkout' | 'admin' | 'motoboy' | 'my-orders';

interface AppContextType {
  products: Product[];
  categories: Category[];
  orders: Order[];
  settings: RestaurantSettings | null;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  isLoading: boolean;
  refreshData: () => Promise<void>;
  
  // DB Operations
  addProduct: (product: Omit<Product, 'id'>) => Promise<Product>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<Product>;
  deleteProduct: (id: string) => Promise<boolean>;
  addCategory: (name: string, image?: string) => Promise<Category>;
  updateCategory: (id: string, name: string, image?: string) => Promise<Category>;
  deleteCategory: (id: string) => Promise<boolean>;
  createOrder: (orderData: Omit<Order, 'id' | 'createdAt' | 'status'> & { status?: Order['status'] }) => Promise<Order>;
  updateOrderStatus: (id: string, status: Order['status']) => Promise<Order>;
  updateOrder: (id: string, updatedFields: Partial<Order>) => Promise<Order>;
  updateSettings: (settings: RestaurantSettings) => Promise<RestaurantSettings>;
  getUsers: () => Promise<UserProfile[]>;
  updateUserProfile: (uid: string, fields: Partial<UserProfile>) => Promise<void>;
  refuseOrder: (id: string, motivoRecusa: string) => Promise<Order>;
  retryRefund: (id: string) => Promise<Order>;
  selectedCategory: string;
  setSelectedCategory: (id: string) => void;
  hasEnteredDelivery: boolean;
  setHasEnteredDelivery: (entered: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [hasEnteredDelivery, setHasEnteredDeliveryState] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('orderId') || params.get('payment') || window.location.hash) {
          return true;
        }
        return sessionStorage.getItem('maestria_entered') === 'true';
      }
    } catch {}
    return false;
  });

  const setHasEnteredDelivery = (entered: boolean) => {
    setHasEnteredDeliveryState(entered);
    try {
      if (entered) {
        sessionStorage.setItem('maestria_entered', 'true');
      } else {
        sessionStorage.removeItem('maestria_entered');
      }
    } catch {}
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedProducts, fetchedCategories, fetchedSettings] = await Promise.all([
        dbService.getProducts(),
        dbService.getCategories(),
        dbService.getSettings(),
      ]);

      setProducts(fetchedProducts);
      setCategories(fetchedCategories);
      setSettings(fetchedSettings);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

const DELIVERY_STATUS_RANK: Record<string, number> = {
  'aceito': 1,
  'retirado': 2,
  'a_caminho': 3,
  'entregue': 4,
};

function mergeOrdersPreservingProgression(prevOrders: Order[], incomingOrders: Order[]): Order[] {
  if (!prevOrders || prevOrders.length === 0) return incomingOrders;

  const prevMap = new Map<string, Order>(prevOrders.map(o => [o.id, o]));

  return incomingOrders.map(incoming => {
    const existing = prevMap.get(incoming.id);
    if (!existing) return incoming;

    // 1. Protect statusEntrega monotonicity (prevent stale network/realtime downgrade)
    const existingRank = existing.statusEntrega ? (DELIVERY_STATUS_RANK[existing.statusEntrega] || 0) : 0;
    const incomingRank = incoming.statusEntrega ? (DELIVERY_STATUS_RANK[incoming.statusEntrega] || 0) : 0;

    let finalStatusEntrega = incoming.statusEntrega;
    if (existingRank > incomingRank) {
      finalStatusEntrega = existing.statusEntrega;
    }

    // 2. Protect general order status monotonicity (delivered cannot revert to ready)
    let finalStatus = incoming.status;
    if (existing.status === 'delivered' && incoming.status !== 'delivered') {
      finalStatus = 'delivered';
    }

    // 3. Preserve motoboy assignment
    const finalMotoboyId = incoming.motoboyId || existing.motoboyId;

    // 4. Protect refused status and refund metadata
    if (existing.status === 'refused' && incoming.status !== 'refused') {
      finalStatus = 'refused';
    }
    const finalRefundStatus = incoming.refundStatus || existing.refundStatus;
    const finalRefundId = incoming.refundId || existing.refundId;
    const finalRefundedAt = incoming.refundedAt || existing.refundedAt;
    const finalRefundError = incoming.refundError || existing.refundError;
    const finalRefundAmount = incoming.refundAmount || existing.refundAmount;
    const finalMotivoRecusa = incoming.motivoRecusa || existing.motivoRecusa;

    return {
      ...incoming,
      status: finalStatus,
      statusEntrega: finalStatusEntrega,
      motoboyId: finalMotoboyId,
      refundStatus: finalRefundStatus,
      refundId: finalRefundId,
      refundedAt: finalRefundedAt,
      refundError: finalRefundError,
      refundAmount: finalRefundAmount,
      motivoRecusa: finalMotivoRecusa,
    };
  });
}

  const loadOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      return;
    }
    try {
      const allOrders = await dbService.getOrders();
      const role = profile?.role;
      if (role === 'admin' || role === 'superadmin' || role === 'motoboy') {
        setOrders(prev => mergeOrdersPreservingProgression(prev, allOrders));
      } else {
        const userOrders = allOrders.filter(o => 
          o.usuario?.uid === user.uid || 
          o.customerEmail === user.email
        );
        setOrders(prev => mergeOrdersPreservingProgression(prev, userOrders));
      }
    } catch (e) {
      console.warn('Error loading orders:', e);
    }
  }, [user, profile?.role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    updateThemeColors(settings?.primaryColor, settings?.secondaryColor, settings?.backgroundColor);
  }, [settings]);

  // Realtime subscription for Orders using Supabase Realtime channel
  useEffect(() => {
    if (!user) return;

    let channel: any = null;
    if (isSupabaseConfigured) {
      try {
        channel = supabase
          .channel('realtime_orders_changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders' },
            () => {
              loadOrders();
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Supabase realtime error:', err);
      }
    }

    // Polling interval to ensure fresh order states
    const interval = setInterval(() => {
      loadOrders();
    }, 12000);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      clearInterval(interval);
    };
  }, [user, loadOrders]);

  const refreshData = async () => {
    await Promise.all([loadData(), loadOrders()]);
  };

  const handleAddProduct = async (product: Omit<Product, 'id'>) => {
    const newProduct = await dbService.addProduct(product);
    setProducts((prev) => {
      const combined = [...prev, newProduct];
      const seen = new Set<string>();
      return combined.filter(p => {
        if (!p.id || seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
    });
    return newProduct;
  };

  const handleUpdateProduct = async (id: string, updatedFields: Partial<Product>) => {
    const updated = await dbService.updateProduct(id, updatedFields);
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  };

  const handleDeleteProduct = async (id: string) => {
    const success = await dbService.deleteProduct(id);
    if (success) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
    return success;
  };

  const handleAddCategory = async (name: string, image?: string) => {
    const newCategory = await dbService.addCategory(name, image);
    setCategories((prev) => {
      const combined = [...prev, newCategory];
      const seen = new Set<string>();
      return combined.filter(c => {
        if (!c.id || seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
    });
    return newCategory;
  };

  const handleUpdateCategory = async (id: string, name: string, image?: string) => {
    const updated = await dbService.updateCategory(id, name, image);
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };

  const handleDeleteCategory = async (id: string) => {
    const success = await dbService.deleteCategory(id);
    if (success) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
    }
    return success;
  };

  const handleCreateOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'status'> & { status?: Order['status'] }) => {
    const newOrder = await dbService.createOrder(orderData);
    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

  const handleUpdateOrderStatus = async (id: string, status: Order['status']) => {
    const updated = await dbService.updateOrderStatus(id, status);
    setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
    return updated;
  };

  const handleUpdateOrder = async (id: string, updatedFields: Partial<Order>) => {
    const updated = await dbService.updateOrder(id, updatedFields);
    setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
    return updated;
  };

  const handleUpdateSettings = async (newSettings: RestaurantSettings) => {
    const updated = await dbService.saveSettings(newSettings);
    setSettings(updated);
    return updated;
  };

  const handleGetUsers = async () => {
    return await dbService.getUsers();
  };

  const handleUpdateUserProfile = async (uid: string, fields: Partial<UserProfile>) => {
    await dbService.updateUserProfile(uid, fields);
  };

  const handleRefuseOrder = async (id: string, motivoRecusa: string): Promise<Order> => {
    try {
      const response = await fetch(`/api/orders/${id}/refuse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivoRecusa }),
      });
      const data = await response.json();
      if (!response.ok && data.error && !data.order) {
        throw new Error(data.error);
      }
      const updatedOrder = data.order || (await dbService.getOrders()).find(o => o.id === id);
      if (updatedOrder) {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updatedOrder } : o));
        return updatedOrder;
      }
    } catch (err: any) {
      console.warn('Backend refuse order error, executing local fallback:', err);
      const fallback = await dbService.updateOrder(id, {
        status: 'refused',
        motivoRecusa,
      });
      setOrders(prev => prev.map(o => o.id === id ? fallback : o));
      return fallback;
    }
    return orders.find(o => o.id === id)!;
  };

  const handleRetryRefund = async (id: string): Promise<Order> => {
    const response = await fetch(`/api/orders/${id}/retry-refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao reprocessar estorno no servidor.');
    }
    const updatedOrder = data.order;
    if (updatedOrder) {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updatedOrder } : o));
      return updatedOrder;
    }
    return orders.find(o => o.id === id)!;
  };

  return (
    <AppContext.Provider
      value={{
        products,
        categories,
        orders,
        settings,
        activeView,
        setActiveView,
        isLoading,
        refreshData,
        addProduct: handleAddProduct,
        updateProduct: handleUpdateProduct,
        deleteProduct: handleDeleteProduct,
        addCategory: handleAddCategory,
        updateCategory: handleUpdateCategory,
        deleteCategory: handleDeleteCategory,
        createOrder: handleCreateOrder,
        updateOrderStatus: handleUpdateOrderStatus,
        updateOrder: handleUpdateOrder,
        updateSettings: handleUpdateSettings,
        getUsers: handleGetUsers,
        updateUserProfile: handleUpdateUserProfile,
        refuseOrder: handleRefuseOrder,
        retryRefund: handleRetryRefund,
        selectedCategory,
        setSelectedCategory,
        hasEnteredDelivery,
        setHasEnteredDelivery,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
