import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ConfirmDialogProps } from '../../types/views/shared';

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = 'primary'
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="p-8">
            <div className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto',
              variant === 'danger' ? 'bg-red-50 text-red-600' : 'bg-primary/10 text-primary'
            )}>
              {variant === 'danger' ? <AlertCircle className="w-8 h-8" /> : <CheckCircle className="w-8 h-8" />}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">{title}</h3>
            <p className="text-gray-500 text-center leading-relaxed">{message}</p>
          </div>
          <div className="flex border-t border-gray-100">
            <button
              onClick={onCancel}
              className="flex-1 px-8 py-5 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors border-r border-gray-100"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={cn(
                'flex-1 px-8 py-5 text-sm font-bold transition-colors',
                variant === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-primary hover:bg-primary/5'
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
