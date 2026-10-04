import React, { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../contexts/CartContext';
import { formatPrice } from '../utils';
import { motion } from 'motion/react';

interface SpotlightProductCardProps {
  key?: React.Key;
  product: Product;
  badge?: string;
  referencePrice?: number;
}

export default function SpotlightProductCard({
  product,
  badge,
  referencePrice,
}: SpotlightProductCardProps) {
  const { addToCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product.id, product.name, product.price, product.image);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 900);
  };

  return (
    <div className="group relative flex flex-col justify-between w-52 min-w-[208px] rounded-3xl bg-white border border-orange-100/80 p-3 shadow-sm hover:shadow-md hover:border-orange-300 transition-all duration-300 flex-shrink-0 select-none">
      {/* Top: Image & Badge */}
      <div className="relative h-32 w-full overflow-hidden rounded-2xl bg-orange-50/50">
        <img
          src={product.image || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80'}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          referrerPolicy="no-referrer"
          loading="lazy"
        />

        {/* Badge */}
        {badge && (
          <div className="absolute top-2 left-2 z-10">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-600 text-white shadow-sm">
              {badge}
            </span>
          </div>
        )}

        {!product.active && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white">
              Esgotado
            </span>
          </div>
        )}
      </div>

      {/* Info Content */}
      <div className="mt-3 flex flex-col flex-1 justify-between">
        <div>
          <h4 className="font-sans text-xs sm:text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-orange-600 transition-colors">
            {product.name}
          </h4>
          <p className="mt-1 text-[11px] text-gray-500 line-clamp-2 leading-relaxed font-normal">
            {product.description}
          </p>
        </div>

        {/* Pricing & Add Button */}
        <div className="mt-3.5 flex items-center justify-between pt-1 border-t border-gray-100">
          <div className="flex flex-col">
            {referencePrice && referencePrice > product.price && (
              <span className="text-[10px] text-gray-400 line-through font-medium">
                {formatPrice(referencePrice)}
              </span>
            )}
            <span className="font-sans text-xs sm:text-sm font-extrabold text-orange-600">
              {formatPrice(product.price)}
            </span>
          </div>

          {product.active ? (
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={handleAdd}
              className={`flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-sm transition-all duration-200 cursor-pointer ${
                justAdded
                  ? 'bg-emerald-600 shadow-emerald-500/25 scale-105'
                  : 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/25'
              }`}
              title="Adicionar ao carrinho"
            >
              {justAdded ? (
                <Check className="h-4 w-4 stroke-[3]" />
              ) : (
                <Plus className="h-4 w-4 stroke-[2.5]" />
              )}
            </motion.button>
          ) : (
            <span className="text-[10px] font-semibold text-gray-400">Indisponível</span>
          )}
        </div>
      </div>
    </div>
  );
}
