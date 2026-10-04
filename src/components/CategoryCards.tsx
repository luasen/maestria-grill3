import React from 'react';
import { ChevronRight, Utensils } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

interface CategoryCardsProps {
  onSelectCategory: (categoryId: string) => void;
}

export default function CategoryCards({ onSelectCategory }: CategoryCardsProps) {
  const { categories, setActiveView } = useApp();

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <section className="w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-sans text-base font-extrabold text-gray-900 tracking-tight">
          Categorias
        </h3>
        <button
          onClick={() => {
            onSelectCategory('all');
            setActiveView('menu');
          }}
          className="inline-flex items-center gap-0.5 text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors"
        >
          <span>Ver todas</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-start gap-3.5 overflow-x-auto pb-2 scrollbar-none pt-0.5">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              onSelectCategory(cat.id);
              setActiveView('menu');
            }}
            className="group flex flex-col items-center flex-shrink-0 cursor-pointer transition-transform active:scale-95"
          >
            {/* Category Image Card */}
            <div className="relative h-18 w-18 sm:h-20 sm:w-20 rounded-2xl p-1 bg-white border border-orange-100 shadow-sm transition-all duration-300 group-hover:border-orange-500/50 group-hover:shadow-md overflow-hidden">
              {cat.image ? (
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="h-full w-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                  <Utensils className="h-7 w-7" />
                </div>
              )}
            </div>

            {/* Category Label */}
            <span className="mt-2 text-xs font-bold text-gray-700 group-hover:text-orange-600 transition-colors text-center line-clamp-1 max-w-[80px]">
              {cat.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
