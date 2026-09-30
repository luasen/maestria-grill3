import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'orange' | 'blue' | 'emerald' | 'rose' | 'amber';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'orange',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'blue':
        return {
          iconBg: 'bg-blue-100 text-blue-600',
          btnBg: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20',
        };
      case 'emerald':
        return {
          iconBg: 'bg-emerald-100 text-emerald-600',
          btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20',
        };
      case 'rose':
        return {
          iconBg: 'bg-rose-100 text-rose-600',
          btnBg: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20',
        };
      case 'amber':
        return {
          iconBg: 'bg-amber-100 text-amber-600',
          btnBg: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
        };
      case 'orange':
      default:
        return {
          iconBg: 'bg-orange-100 text-orange-600',
          btnBg: 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/20',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-gray-100"
        >
          <div className="flex flex-col items-center text-center">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl mb-4 ${styles.iconBg}`}>
              <HelpCircle className="h-7 w-7" />
            </div>
            <h3 className="text-base font-extrabold text-gray-900 mb-2">{title}</h3>
            <p className="text-xs font-medium text-gray-500 leading-relaxed mb-6">{message}</p>

            <div className="flex gap-3 w-full">
              <button
                type="button"
                disabled={isLoading}
                onClick={onCancel}
                className="flex-1 rounded-2xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-600 hover:bg-gray-50 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={onConfirm}
                className={`flex-1 rounded-2xl py-3 text-xs font-bold transition shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer ${styles.btnBg}`}
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>{confirmLabel}</span>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
