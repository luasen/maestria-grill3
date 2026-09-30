import React from 'react';
import { Plus, ShoppingCart, Info } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../contexts/CartContext';
import { formatPrice } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, cart, updateQuantity } = useCart();

  const cartItem = cart.find((item) => item.productId === product.id);
  const quantity = cartItem?.quantity || 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product.id, product.name, product.price, product.image);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateQuantity(product.id, 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateQuantity(product.id, -1);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      id={`product-card-${product.id}`}
      className="group relative flex overflow-hidden rounded-2xl border border-white/35 bg-white/40 backdrop-blur-md p-3 shadow-sm hover:shadow-md hover:bg-white/50 transition-all"
    >
      {/* Product Image */}
      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-white/30">
        <img
          src={product.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300'}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        {!product.active && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white">Esgotado</span>
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="ml-3 flex flex-1 flex-col justify-between py-0.5">
        <div>
          <h3 className="font-sans text-sm font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
            {product.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs text-gray-500 leading-normal">
            {product.description}
          </p>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="font-sans text-sm font-bold text-gray-900">
            {formatPrice(product.price)}
          </span>

          {product.active && (
            <div className="flex items-center">
              <AnimatePresence mode="wait">
                {quantity > 0 ? (
                  <motion.div
                    key="quantity-controls"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-2 rounded-xl bg-white/50 border border-white/20 p-1 backdrop-blur-sm"
                  >
                    <button
                      onClick={handleDecrement}
                      id={`btn-dec-${product.id}`}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/70 text-orange-600 shadow-sm transition hover:bg-orange-50 active:scale-90"
                    >
                      <span className="text-base font-bold">-</span>
                    </button>
                    <span className="w-4 text-center text-xs font-bold text-orange-700">
                      {quantity}
                    </span>
                    <button
                      onClick={handleIncrement}
                      id={`btn-inc-${product.id}`}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-600 text-white shadow-sm transition hover:bg-orange-700 active:scale-90"
                    >
                      <span className="text-base font-bold">+</span>
                    </button>
                  </motion.div>
                ) : (
                  <motion.button
                    key="add-button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleAdd}
                    id={`btn-add-${product.id}`}
                    className="flex h-8 items-center gap-1.5 rounded-xl bg-orange-600 px-3 text-xs font-semibold text-white shadow-sm shadow-orange-500/15 transition hover:bg-orange-700 active:scale-95"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
