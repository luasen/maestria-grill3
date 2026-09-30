import React, { useState, useMemo } from 'react';
import { Search, BookOpen, ShoppingBag } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useCart } from '../contexts/CartContext';
import ProductCard from '../components/ProductCard';
import PromoBanner from '../components/PromoBanner';
import { motion, AnimatePresence } from 'motion/react';

export default function Menu() {
  const { products, categories, isLoading } = useApp();
  const { totalItems, total } = useCart();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

  // Filter products by category and search term
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = selectedCategoryId === 'all' || product.categoryId === selectedCategoryId;
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            product.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategoryId, searchTerm]);

  return (
    <div className="min-h-screen bg-transparent pb-32">
      {/* Search Header Banner */}
      <div className="bg-white/20 backdrop-blur-md px-4 py-4 border-b border-white/20">
        <div className="mx-auto max-w-lg">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              id="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="O que você deseja comer hoje?"
              className="w-full rounded-2xl border border-white/30 bg-white/45 py-3 pl-10 pr-4 text-xs font-medium text-gray-800 placeholder-gray-400 outline-none ring-orange-500/25 transition focus:border-orange-500 focus:bg-white/75 focus:ring-4"
            />
          </div>
        </div>
      </div>

      {/* Categories Horizontal Scroll */}
      <div className="sticky top-[64px] z-20 border-b border-white/20 bg-white/25 backdrop-blur-md">
        <div className="mx-auto max-w-lg px-4 py-3.5 overflow-x-auto scrollbar-none flex gap-2">
          {/* "Tudo" tab */}
          <button
            id="cat-tab-all"
            onClick={() => setSelectedCategoryId('all')}
            className={`flex-shrink-0 rounded-full px-4.5 py-2 text-xs font-bold transition-all ${
              selectedCategoryId === 'all'
                ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/10'
                : 'bg-white/40 border border-white/30 text-gray-600 hover:bg-white/60'
            }`}
          >
            Tudo
          </button>

          {/* Categorias Cadastradas */}
          {categories.map((cat) => (
            <button
              key={cat.id}
              id={`cat-tab-${cat.id}`}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`flex-shrink-0 rounded-full px-4.5 py-2 text-xs font-bold transition-all ${
                selectedCategoryId === cat.id
                  ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/10'
                  : 'bg-white/40 border border-white/30 text-gray-600 hover:bg-white/60'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid list */}
      <div className="mx-auto max-w-lg px-4 py-5">
        <PromoBanner className="mb-4" />

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
            <p className="mt-3 text-xs text-gray-400 font-medium">Carregando cardápio irresistível...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl bg-white/40 backdrop-blur-md border border-white/30 py-16 px-4 text-center">
            <BookOpen className="h-10 w-10 text-gray-300" />
            <h3 className="mt-4 text-sm font-bold text-gray-800">Nenhum produto encontrado</h3>
            <p className="mt-1 text-xs text-gray-400 max-w-[220px]">Tente buscar outro termo ou mude a categoria de filtro.</p>
          </div>
        ) : (
          <motion.div layout className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product) => (
                <motion.div key={product.id} layout>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Floating Bottom Cart Bar (Shows if items are present in cart and not on home page) */}
      {totalItems > 0 && (
        <div className="fixed bottom-18 left-0 right-0 z-30 px-4">
          <div className="mx-auto max-w-lg">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="flex items-center justify-between rounded-2xl bg-gray-900/85 backdrop-blur-lg border border-white/10 p-4 text-white shadow-xl shadow-gray-950/20"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sm font-bold">
                  {totalItems}
                </span>
                <div>
                  <span className="block text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Seu Carrinho</span>
                  <span className="font-sans text-sm font-extrabold text-white">R$ {total.toFixed(2)}</span>
                </div>
              </div>
              
              <button
                onClick={() => {
                  // Switch view to Cart
                  const btn = document.getElementById('nav-btn-cart');
                  if (btn) btn.click();
                }}
                id="floating-btn-cart"
                className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-orange-700 active:scale-95"
              >
                <ShoppingBag className="h-4 w-4" />
                Ver Carrinho
              </button>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
