import { AnimatePresence, motion } from 'motion/react';
import { Bell, CheckCircle, ShieldAlert, TriangleAlert } from 'lucide-react';
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
  const theme = {
    primary: {
      iconWrap: 'bg-primary/10 text-primary',
      confirm: 'text-primary hover:bg-primary/5',
      accent: 'from-primary/90 to-primary/60',
      icon: CheckCircle,
    },
    success: {
      iconWrap: 'bg-emerald-50 text-emerald-600',
      confirm: 'text-emerald-700 hover:bg-emerald-50',
      accent: 'from-emerald-500 to-emerald-300',
      icon: CheckCircle,
    },
    info: {
      iconWrap: 'bg-sky-50 text-sky-600',
      confirm: 'text-sky-700 hover:bg-sky-50',
      accent: 'from-sky-500 to-cyan-300',
      icon: Bell,
    },
    warning: {
      iconWrap: 'bg-amber-50 text-amber-600',
      confirm: 'text-amber-700 hover:bg-amber-50',
      accent: 'from-amber-500 to-yellow-300',
      icon: TriangleAlert,
    },
    danger: {
      iconWrap: 'bg-red-50 text-red-600',
      confirm: 'text-red-600 hover:bg-red-50',
      accent: 'from-red-500 to-rose-300',
      icon: ShieldAlert,
    },
  }[variant];

  const Icon = theme.icon;

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
          className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl"
        >
          <div className={cn('h-1.5 bg-gradient-to-r', theme.accent)} />
          <div className="p-8">
            <div className={cn(
              'mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl',
              theme.iconWrap
            )}>
              <Icon className="w-8 h-8" />
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
                theme.confirm
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
