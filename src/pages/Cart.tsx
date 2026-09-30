import React from 'react';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useApp } from '../contexts/AppContext';
import { formatPrice } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Cart() {
  const { cart, updateQuantity, removeFromCart, subtotal, deliveryFee, total, totalItems } = useCart();
  const { settings, setActiveView } = useApp();

  const minOrder = settings?.minOrderValue || 0;
  const isBelowMinOrder = subtotal < minOrder;

  const handleCheckout = () => {
    if (isBelowMinOrder) return;
    setActiveView('checkout');
  };

  if (cart.length === 0) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center bg-transparent px-4 pb-24 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="rounded-full bg-white/45 border border-white/40 p-6 shadow-sm backdrop-blur-md"
        >
          <ShoppingBag className="h-12 w-12 text-gray-400" />
        </motion.div>
        <h3 className="mt-6 font-sans text-lg font-bold text-gray-900">Seu carrinho está vazio</h3>
        <p className="mt-1.5 text-xs text-gray-400 max-w-[240px] leading-relaxed">
          Navegue pelo nosso cardápio irresistível e adicione suas delícias favoritas aqui.
        </p>
        <button
          onClick={() => setActiveView('menu')}
          id="cart-empty-btn-menu"
          className="mt-6 rounded-2xl bg-orange-600 px-6 py-3.5 text-xs font-bold text-white shadow-md shadow-orange-500/10 hover:bg-orange-700 transition"
        >
          Explorar Cardápio
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent pb-28">
      {/* Scrollable Cart List */}
      <div className="mx-auto max-w-lg px-4 py-5">
        <div className="flex items-center justify-between">
          <h2 className="font-sans text-lg font-extrabold text-gray-900">Meu Pedido</h2>
          <span className="text-xs font-bold text-gray-400">({totalItems} {totalItems === 1 ? 'item' : 'itens'})</span>
        </div>

        {/* Cart items cards */}
        <div className="mt-4 flex flex-col gap-3">
          <AnimatePresence>
            {cart.map((item) => (
              <motion.div
                key={item.productId}
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, x: -50, height: 0, marginBottom: 0, padding: 0 }}
                transition={{ duration: 0.2 }}
                id={`cart-item-${item.productId}`}
                className="overflow-hidden rounded-2xl border border-white/35 bg-white/40 backdrop-blur-md p-3.5 shadow-sm flex gap-3"
              >
                {/* Photo */}
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-white/30">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Details */}
                <div className="flex flex-1 flex-col justify-between py-0.5">
                  <div className="flex items-start justify-between gap-1">
                    <h4 className="font-sans text-xs font-bold text-gray-800 line-clamp-1">
                      {item.name}
                    </h4>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      id={`btn-remove-${item.productId}`}
                      className="text-gray-400 hover:text-rose-600 transition p-1"
                      title="Remover item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <span className="font-sans text-xs font-bold text-gray-900">
                      {formatPrice(item.price * item.quantity)}
                    </span>

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-2 rounded-xl bg-white/50 border border-white/20 p-1 backdrop-blur-sm">
                      <button
                        onClick={() => updateQuantity(item.productId, -1)}
                        id={`btn-cart-dec-${item.productId}`}
                        className="flex h-6.5 w-6.5 items-center justify-center rounded-lg bg-white/70 text-gray-600 shadow-sm transition hover:bg-gray-50 active:scale-90"
                      >
                        <span className="text-sm font-bold">-</span>
                      </button>
                      <span className="w-4 text-center text-[11px] font-bold text-gray-700">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.productId, 1)}
                        id={`btn-cart-inc-${item.productId}`}
                        className="flex h-6.5 w-6.5 items-center justify-center rounded-lg bg-orange-600 text-white shadow-sm transition hover:bg-orange-700 active:scale-90"
                      >
                        <span className="text-sm font-bold">+</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Resumo de Valores */}
        <div className="mt-6 rounded-3xl border border-white/35 bg-white/40 backdrop-blur-md p-5 shadow-sm">
          <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-400">Resumo do Valor</h3>
          
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex justify-between text-xs font-medium text-gray-500">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs font-medium text-gray-500">
              <span>Taxa de entrega</span>
              <span>{deliveryFee === 0 ? 'Grátis' : formatPrice(deliveryFee)}</span>
            </div>
            
            <hr className="my-2 border-white/20" />
            
            <div className="flex justify-between font-sans text-sm font-extrabold text-gray-900">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </div>


        {/* Checkout Button */}
        {isBelowMinOrder && (
          <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5 text-amber-800 text-left">
            <span className="text-base">⚠️</span>
            <div className="flex-1">
              <p className="text-[11px] font-bold">Pedido Mínimo Não Atingido</p>
              <p className="text-[10px] text-amber-700/85 mt-0.5">
                O valor mínimo para realizar pedidos é de <strong>{formatPrice(minOrder)}</strong>. Faltam apenas <strong>{formatPrice(minOrder - subtotal)}</strong> em produtos no seu carrinho!
              </p>
            </div>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={handleCheckout}
            disabled={isBelowMinOrder}
            id="btn-confirm-cart"
            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-xs font-bold text-white shadow-lg transition active:scale-98 ${
              isBelowMinOrder
                ? 'bg-gray-400 cursor-not-allowed shadow-none'
                : 'bg-orange-600 shadow-orange-500/25 hover:bg-orange-700'
            }`}
          >
            Finalizar Pedido
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Continue Shopping Link */}
        <button
          onClick={() => setActiveView('menu')}
          id="btn-cart-continue-shopping"
          className="mt-4 block w-full text-center text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline"
        >
          Adicionar mais itens
        </button>
      </div>
    </div>
  );
}
