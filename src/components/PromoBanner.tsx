import React from 'react';
import { Tag, Sparkles, ArrowRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { motion } from 'motion/react';

interface PromoBannerProps {
  className?: string;
  compact?: boolean;
}

export default function PromoBanner({ className = '', compact = false }: PromoBannerProps) {
  const { settings, setActiveView } = useApp();

  if (!settings) return null;

  const {
    promoBannerEnabled,
    promoBannerTitle,
    promoBannerDesc,
    promoBannerImage,
    promoBannerBtnText,
    promoBannerBtnLink,
    promoBannerStart,
    promoBannerEnd
  } = settings;

  // If banner is disabled, do not render
  if (promoBannerEnabled === false) {
    return null;
  }

  // Check date range if start or end are specified
  const now = new Date();
  if (promoBannerStart) {
    const startDate = new Date(promoBannerStart);
    if (now < startDate) return null;
  }
  if (promoBannerEnd) {
    const endDate = new Date(promoBannerEnd);
    // Set end date to end of day if only date is provided
    endDate.setHours(23, 59, 59, 999);
    if (now > endDate) return null;
  }

  const title = promoBannerTitle || 'Oferta Especial';
  const desc = promoBannerDesc || 'Confira os destaques do nosso cardápio!';
  const btnText = promoBannerBtnText || 'Aproveitar Oferta';

  const handleAction = () => {
    if (promoBannerBtnLink) {
      if (promoBannerBtnLink.startsWith('http://') || promoBannerBtnLink.startsWith('https://')) {
        window.open(promoBannerBtnLink, '_blank');
        return;
      }
    }
    setActiveView('menu');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative overflow-hidden rounded-3xl border border-white/40 shadow-xl backdrop-blur-md ${className}`}
    >
      {/* Background Image or Gradient Overlay */}
      {promoBannerImage ? (
        <div className="relative h-full w-full min-h-[160px] flex flex-col justify-end p-5 text-white">
          <img
            src={promoBannerImage}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/60 to-black/20" />

          <div className="relative z-10">
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-orange-600/90 text-white px-2.5 py-0.5 rounded-full shadow-sm mb-2 backdrop-blur-sm">
              <Sparkles className="h-3 w-3 text-amber-300" />
              Oferta do Dia
            </span>

            <h3 className="text-lg font-black text-white leading-snug drop-shadow-sm">
              {title}
            </h3>

            {desc && (
              <p className="mt-1 text-xs text-gray-200 line-clamp-2 leading-relaxed">
                {desc}
              </p>
            )}

            <button
              onClick={handleAction}
              className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-600/30 hover:bg-orange-700 active:scale-95 transition"
            >
              {btnText}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 p-5 text-white shadow-inner">
          <div className="flex items-start justify-between">
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white px-2.5 py-0.5 rounded-full backdrop-blur-md">
              <Tag className="h-3 w-3 text-amber-200" />
              Destaque Especial
            </span>
          </div>

          <h3 className="mt-2 text-lg font-extrabold text-white leading-snug">
            {title}
          </h3>

          {desc && (
            <p className="mt-1 text-xs text-orange-100 font-medium leading-relaxed">
              {desc}
            </p>
          )}

          <div className="mt-3.5 flex items-center justify-between">
            <button
              onClick={handleAction}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white text-orange-950 px-4 py-2 text-xs font-black shadow-md hover:bg-orange-50 active:scale-95 transition"
            >
              {btnText}
              <ArrowRight className="h-3.5 w-3.5 text-orange-600" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
