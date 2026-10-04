import React, { useState, useMemo } from 'react';
import { Search, Flame, Star, BookOpen, ShoppingBag, ShieldCheck, ArrowRight, Utensils } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import BannerCarousel from '../components/BannerCarousel';
import CategoryCards from '../components/CategoryCards';
import SpotlightProductCard from '../components/SpotlightProductCard';
import ProductCard from '../components/ProductCard';
import { motion, AnimatePresence } from 'motion/react';

export default function Home() {
  const { products, settings, setActiveView, setSelectedCategory, orders, setHasEnteredDelivery } = useApp();
  const { totalItems, total } = useCart();
  const { user, profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const myOrdersCount = user
    ? orders.filter((o) => o.usuario?.uid === user.uid).length
    : 0;

  // Real products divided for sections
  const activeProducts = useMemo(() => {
    return products.filter((p) => p.active);
  }, [products]);

  // Promotions: first subset of products or products with promo
  const promoProducts = useMemo(() => {
    // If there are more than 2 products, use a slice of real products
    return activeProducts.slice(0, 4);
  }, [activeProducts]);

  // Top / Most Ordered products: second subset of real products
  const topProducts = useMemo(() => {
    return activeProducts.length > 4 ? activeProducts.slice(2, 7) : activeProducts;
  }, [activeProducts]);

  // Filtered products if user types in search
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return activeProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activeProducts, searchTerm]);

  return (
    <div className="flex flex-col min-h-screen bg-transparent pb-32">
      {/* Search Header Bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            id="home-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="O que você deseja comer hoje?"
            className="w-full rounded-2xl border border-orange-100/80 bg-white/90 py-3 pl-10 pr-4 text-xs font-medium text-gray-800 placeholder-gray-400 outline-none shadow-sm transition-all focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/15"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600 px-1 py-0.5"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Main Home Content */}
      {searchTerm.trim() ? (
        /* Instant Search Results Section */
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-sans text-sm font-extrabold text-gray-900">
              Resultados para "{searchTerm}" ({searchResults.length})
            </h3>
            <button
              onClick={() => setActiveView('menu')}
              className="text-xs font-bold text-orange-600 hover:underline"
            >
              Ver no cardápio
            </button>
          </div>

          {searchResults.length === 0 ? (
            <div className="rounded-3xl bg-white border border-orange-100 p-8 text-center shadow-sm">
              <Utensils className="h-8 w-8 text-orange-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-700">Nenhum prato encontrado</p>
              <p className="text-xs text-gray-400 mt-1">Tente buscar por carne, lanche ou bebida.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {searchResults.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Normal Delivery Feed Layout */
        <div className="flex flex-col gap-6 px-4 py-2">
          {/* 1. Carousel of Real Banners */}
          <BannerCarousel />

          {/* 2. Categories Row */}
          <CategoryCards
            onSelectCategory={(categoryId) => {
              setSelectedCategory(categoryId);
            }}
          />

          {/* 3. Promotions Section ("🔥 Promoções") */}
          {promoProducts.length > 0 && (
            <section className="w-full">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                    <Flame className="h-4 w-4" />
                  </span>
                  <h3 className="font-sans text-base font-extrabold text-gray-900 tracking-tight">
                    Promoções
                  </h3>
                </div>
                <button
                  onClick={() => setActiveView('menu')}
                  className="inline-flex items-center gap-0.5 text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors"
                >
                  <span>Ver todas</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Horizontal Scroll of Promo Products */}
              <div className="flex items-stretch gap-3 overflow-x-auto pb-2 scrollbar-none pt-0.5">
                {promoProducts.map((product, idx) => (
                  <SpotlightProductCard
                    key={`promo-${product.id}`}
                    product={product}
                    badge={idx === 0 ? 'Destaque' : idx === 1 ? 'Oferta' : undefined}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 4. Most Ordered Section ("⭐ Mais pedidos") */}
          {topProducts.length > 0 && (
            <section className="w-full">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  </span>
                  <h3 className="font-sans text-base font-extrabold text-gray-900 tracking-tight">
                    Mais pedidos
                  </h3>
                </div>
                <button
                  onClick={() => setActiveView('menu')}
                  className="inline-flex items-center gap-0.5 text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors"
                >
                  <span>Ver todas</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Horizontal Scroll of Top Products */}
              <div className="flex items-stretch gap-3 overflow-x-auto pb-2 scrollbar-none pt-0.5">
                {topProducts.map((product) => (
                  <SpotlightProductCard
                    key={`top-${product.id}`}
                    product={product}
                    badge="Mais Pedido"
                  />
                ))}
              </div>
            </section>
          )}

          {/* 5. Full Menu Action Banner */}
          <div className="mt-2 rounded-3xl bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 p-5 text-white shadow-lg shadow-orange-600/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full inline-block mb-1">
                Cardápio Completo
              </span>
              <h4 className="font-sans text-base font-extrabold text-white">
                Explore todos os pratos na brasa
              </h4>
              <p className="text-xs text-orange-100 mt-0.5">
                Carnes nobres, guarnições deliciosas e sobremesas artesanais.
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveView('menu')}
              id="btn-ver-cardapio"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-black text-orange-600 shadow-md hover:bg-orange-50 active:scale-95 transition-all cursor-pointer"
            >
              <BookOpen className="h-4 w-4" />
              <span>Ver Cardápio</span>
            </motion.button>
          </div>

          {/* 6. Quick Meus Pedidos Action Button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setActiveView('my-orders')}
            id="btn-meus-pedidos"
            className="flex w-full items-center justify-between rounded-2xl bg-white border border-orange-100 p-4 shadow-sm hover:border-orange-300 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 border border-orange-100">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div className="text-left">
                <span className="block text-xs font-bold text-gray-900">Acompanhar Meus Pedidos</span>
                <span className="block text-[11px] text-gray-500">Veja o andamento das suas entregas</span>
              </div>
            </div>

            {myOrdersCount > 0 ? (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-extrabold text-white px-2">
                {myOrdersCount}
              </span>
            ) : (
              <ArrowRight className="h-4 w-4 text-gray-400" />
            )}
          </motion.button>

          {/* 7. Quick Admin Shortcut (Preserved for authorized employees) */}
          {(profile?.role === 'admin' || profile?.role === 'superadmin') && (
            <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/50 p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-gray-700">
                <ShieldCheck className="h-4 w-4 text-orange-600" />
                <span>Área Administrativa</span>
              </div>
              <p className="mt-1 text-[11px] text-gray-500">
                Você possui privilégios de gestão do restaurante.
              </p>
              <button
                onClick={() => setActiveView('admin')}
                id="btn-quick-admin"
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 underline"
              >
                Acessar Painel do Restaurante &rarr;
              </button>
            </div>
          )}

          {/* Link to Welcome Presentation Screen */}
          <div className="flex items-center justify-center pt-2 pb-2">
            <button
              onClick={() => {
                setHasEnteredDelivery(false);
                setActiveView('home');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-orange-600 transition-colors cursor-pointer py-1"
            >
              <span>Conheça a história e apresentação do Maestria Grill</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom Cart Bar if items are in cart */}
      {totalItems > 0 && (
        <div className="fixed bottom-18 left-0 right-0 z-30 px-4">
          <div className="mx-auto max-w-lg">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="flex items-center justify-between rounded-2xl bg-gray-900/90 backdrop-blur-lg border border-white/10 p-3.5 text-white shadow-xl shadow-gray-950/20"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-xs font-bold text-orange-400">
                  {totalItems}
                </span>
                <div>
                  <span className="block text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                    Carrinho
                  </span>
                  <span className="font-sans text-sm font-extrabold text-white">
                    R$ {total.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveView('cart')}
                id="floating-btn-cart-home"
                className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-orange-700 active:scale-95 cursor-pointer shadow-md shadow-orange-600/30"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Ver Carrinho</span>
              </button>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
