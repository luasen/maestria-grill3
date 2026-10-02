import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useApp } from './AppContext';
import { useAuth } from './AuthContext';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (productId: string, name: string, price: number, image: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  subtotal: number;
  deliveryFee: number;
  total: number;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Helper to determine the unique storage key per user
const getCartKey = (userId: string | null | undefined): string => {
  if (userId) {
    return `cart_${userId}`;
  }
  return 'cart_guest';
};

export function CartProvider({ children }: { children: ReactNode }) {
  const { settings } = useApp();
  const { user } = useAuth();
  const currentUserId = user?.uid || null;

  // Track previous user ID to handle transitions: login, logout, switch user
  const prevUserIdRef = useRef<string | null>(currentUserId);
  const isSwitchingUserRef = useRef(false);

  // Initialize cart from localStorage strictly for current user
  const [cart, setCart] = useState<CartItem[]>(() => {
    // Clean up any legacy shared keys from previous versions
    try {
      sessionStorage.removeItem('restaurant_cart');
      localStorage.removeItem('restaurant_cart');
    } catch {}

    try {
      const key = getCartKey(currentUserId);
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Erro ao ler carrinho do localStorage:', e);
    }
    return [];
  });

  // Watch for auth changes (login, logout, or account switch)
  useEffect(() => {
    // If user didn't change, do nothing
    if (prevUserIdRef.current === currentUserId) {
      return;
    }

    const previousUserId = prevUserIdRef.current;
    prevUserIdRef.current = currentUserId;

    // Set flag to prevent saving empty state over new user's cart during transition
    isSwitchingUserRef.current = true;

    if (!currentUserId) {
      // USER LOGGED OUT:
      // Clear in-memory cart immediately so it never leaks to guest or next user
      setCart([]);
    } else {
      // USER LOGGED IN OR SWITCHED TO ANOTHER ACCOUNT:
      // Load strictly the cart of this specific new user
      try {
        const key = getCartKey(currentUserId);
        const saved = localStorage.getItem(key);
        if (saved) {
          setCart(JSON.parse(saved));
        } else {
          // If this user has never added items to cart, start completely empty
          setCart([]);
        }
      } catch (e) {
        console.error('Erro ao carregar carrinho do usuário:', e);
        setCart([]);
      }
    }

    // Re-enable saving on next tick after cart state is applied
    const timer = setTimeout(() => {
      isSwitchingUserRef.current = false;
    }, 50);

    return () => clearTimeout(timer);
  }, [currentUserId]);

  // Persist cart to localStorage whenever it changes, strictly under current user's key
  useEffect(() => {
    if (isSwitchingUserRef.current) {
      return;
    }

    try {
      const key = getCartKey(currentUserId);
      if (cart.length > 0) {
        localStorage.setItem(key, JSON.stringify(cart));
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Erro ao persistir carrinho no localStorage:', error);
    }
  }, [cart, currentUserId]);

  const addToCart = (productId: string, name: string, price: number, image: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId, name, price, image, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const clearCart = () => {
    setCart([]);
    try {
      const key = getCartKey(currentUserId);
      localStorage.removeItem(key);
    } catch {}
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = settings ? settings.deliveryFee : 0;
  const total = subtotal > 0 ? subtotal + deliveryFee : 0;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        subtotal,
        deliveryFee,
        total,
        totalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
