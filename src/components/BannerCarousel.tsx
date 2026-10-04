import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { motion, AnimatePresence } from 'motion/react';

interface BannerSlide {
  id: string;
  badge?: string;
  title: string;
  description?: string;
  image: string;
  buttonText: string;
  buttonLink?: string;
}

export default function BannerCarousel() {
  const { settings, setActiveView } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Compile real valid slides strictly from settings
  const slides: BannerSlide[] = [];

  // 1. Promo Banner from Admin (if enabled & active)
  if (settings && settings.promoBannerEnabled !== false) {
    const now = new Date();
    let isDateValid = true;

    if (settings.promoBannerStart) {
      const start = new Date(settings.promoBannerStart);
      if (now < start) isDateValid = false;
    }
    if (settings.promoBannerEnd) {
      const end = new Date(settings.promoBannerEnd);
      end.setHours(23, 59, 59, 999);
      if (now > end) isDateValid = false;
    }

    if (isDateValid && (settings.promoBannerTitle || settings.promoBannerImage)) {
      slides.push({
        id: 'promo-banner',
        badge: 'Oferta Especial',
        title: settings.promoBannerTitle || 'Destaque Promocional',
        description: settings.promoBannerDesc || 'Confira os pratos mais saborosos do nosso cardápio!',
        image: settings.promoBannerImage || settings.bannerUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80',
        buttonText: settings.promoBannerBtnText || 'Ver Oferta',
        buttonLink: settings.promoBannerBtnLink || '#menu',
      });
    }
  }

  // 2. Main Restaurant Banner
  if (settings?.bannerUrl) {
    slides.push({
      id: 'restaurant-banner',
      badge: 'Maestria Grill',
      title: settings.name || 'Maestria Grill',
      description: settings.description || 'O autêntico sabor da brasa com carnes nobres grelhadas com perfeição.',
      image: settings.bannerUrl,
      buttonText: 'Ver Cardápio',
      buttonLink: '#menu',
    });
  }

  // If no slides configured, provide an elegant minimal fallback
  if (slides.length === 0) {
    slides.push({
      id: 'fallback-banner',
      badge: 'Churrasco Artesanal',
      title: settings?.name || 'Maestria Grill',
      description: settings?.description || 'O melhor da culinária na brasa entregue quentinho na sua porta.',
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80',
      buttonText: 'Explorar Cardápio',
      buttonLink: '#menu',
    });
  }

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Autoplay management
  useEffect(() => {
    if (slides.length <= 1 || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length, isPaused, nextSlide]);

  const handleAction = (slide: BannerSlide) => {
    if (slide.buttonLink && (slide.buttonLink.startsWith('http://') || slide.buttonLink.startsWith('https://'))) {
      window.open(slide.buttonLink, '_blank');
      return;
    }
    setActiveView('menu');
  };

  const currentSlide = slides[currentIndex] || slides[0];

  return (
    <div
      className="relative w-full select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Banner Viewport */}
      <div className="relative h-48 sm:h-56 w-full overflow-hidden rounded-3xl bg-gray-900 shadow-md border border-orange-100/50">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id + currentIndex}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.45, ease: 'easeInOut' }}
            drag={slides.length > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_e, info) => {
              if (info.offset.x < -40) {
                nextSlide();
              } else if (info.offset.x > 40) {
                prevSlide();
              }
            }}
            className="absolute inset-0 flex flex-col justify-end p-5 text-white cursor-grab active:cursor-grabbing"
          >
            {/* Background Image */}
            <img
              src={currentSlide.image}
              alt={currentSlide.title}
              className="absolute inset-0 h-full w-full object-cover object-center filter brightness-[0.6] contrast-[1.1]"
              referrerPolicy="no-referrer"
            />

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-black/15" />
            <div className="absolute inset-0 bg-gradient-to-r from-gray-950/80 via-transparent to-transparent" />

            {/* Slide Content */}
            <div className="relative z-10 max-w-[85%]">
              {currentSlide.badge && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-orange-600 text-white px-2.5 py-0.5 rounded-full shadow-sm mb-2 backdrop-blur-sm">
                  <Sparkles className="h-3 w-3 text-amber-300" />
                  {currentSlide.badge}
                </span>
              )}

              <h2 className="text-lg sm:text-xl font-black text-white leading-tight drop-shadow">
                {currentSlide.title}
              </h2>

              {currentSlide.description && (
                <p className="mt-1 text-xs text-gray-200 line-clamp-2 leading-relaxed drop-shadow-sm font-medium">
                  {currentSlide.description}
                </p>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction(currentSlide);
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-600/30 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                <span>{currentSlide.buttonText}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Desktop Arrow Controls */}
        {slides.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 backdrop-blur-sm transition-all z-20"
              aria-label="Slide anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 backdrop-blur-sm transition-all z-20"
              aria-label="Próximo slide"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Position Indicators (Dots) */}
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {slides.map((slide, index) => {
            const isActive = index === currentIndex;
            return (
              <button
                key={slide.id + index}
                onClick={() => setCurrentIndex(index)}
                aria-label={`Ir para slide ${index + 1}`}
                className={`h-2 transition-all rounded-full cursor-pointer ${
                  isActive
                    ? 'w-6 bg-orange-600 shadow-sm shadow-orange-500/30'
                    : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
