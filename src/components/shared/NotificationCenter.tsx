import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Bell, CheckCircle2, TriangleAlert, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AppNotificationPayload, AppNotificationType, getAppNotifyEventName } from '../../utils/notify';

interface NotificationItem extends AppNotificationPayload {
  id: string;
}

const ICONS: Record<AppNotificationType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Bell,
  warning: TriangleAlert,
};

const STYLES: Record<AppNotificationType, { shell: string; icon: string; bar: string }> = {
  success: {
    shell: 'bg-emerald-50/95 border-emerald-200 text-emerald-900',
    icon: 'bg-emerald-500 text-white',
    bar: 'from-emerald-500 to-emerald-300',
  },
  error: {
    shell: 'bg-rose-50/95 border-rose-200 text-rose-950',
    icon: 'bg-rose-500 text-white',
    bar: 'from-rose-500 to-rose-300',
  },
  info: {
    shell: 'bg-amber-50/95 border-amber-200 text-amber-950',
    icon: 'bg-amber-500 text-white',
    bar: 'from-amber-500 to-yellow-300',
  },
  warning: {
    shell: 'bg-orange-50/95 border-orange-200 text-orange-950',
    icon: 'bg-orange-500 text-white',
    bar: 'from-orange-500 to-amber-300',
  },
};

export function NotificationCenter() {
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const eventName = getAppNotifyEventName();
    const onNotify = (event: Event) => {
      const customEvent = event as CustomEvent<AppNotificationPayload>;
      const payload = customEvent.detail;
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setItems((current) => [...current, { ...payload, id }]);

      const durationMs = payload.durationMs ?? 4200;
      window.setTimeout(() => {
        setItems((current) => current.filter((item) => item.id !== id));
      }, durationMs);
    };

    window.addEventListener(eventName, onNotify as EventListener);
    return () => window.removeEventListener(eventName, onNotify as EventListener);
  }, []);

  const dismiss = (id: string) => setItems((current) => current.filter((item) => item.id !== id));

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex justify-end p-4 sm:p-6">
      <div className="flex w-full max-w-md flex-col gap-3">
        <AnimatePresence>
          {items.map((item) => {
            const Icon = ICONS[item.type];
            const style = STYLES[item.type];
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 24, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                className={cn(
                  'pointer-events-auto overflow-hidden rounded-[28px] border shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur',
                  style.shell
                )}
              >
                <div className={cn('h-1.5 bg-gradient-to-r', style.bar)} />
                <div className="flex gap-4 p-4 sm:p-5">
                  <div className={cn('mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm', style.icon)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black tracking-tight">{item.title}</p>
                    {item.message ? (
                      <p className="mt-1 text-sm leading-relaxed text-gray-700">{item.message}</p>
                    ) : null}
                    {item.actionLabel && item.onAction ? (
                      <button
                        type="button"
                        onClick={() => {
                          item.onAction?.();
                          if (!item.keepOpenOnAction) dismiss(item.id);
                        }}
                        className="mt-3 inline-flex items-center rounded-2xl bg-white/80 px-3 py-2 text-xs font-black text-gray-800 shadow-sm ring-1 ring-black/5 transition hover:bg-white"
                      >
                        {item.actionLabel}
                      </button>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(item.id)}
                    className="mt-0.5 rounded-xl p-2 text-gray-400 transition-colors hover:bg-white/70 hover:text-gray-600"
                    aria-label="ปิดการแจ้งเตือน"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
