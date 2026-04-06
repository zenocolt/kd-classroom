export type AppNotificationType = 'success' | 'error' | 'info' | 'warning';

export interface AppNotificationPayload {
  type: AppNotificationType;
  title: string;
  message?: string;
  durationMs?: number;
  actionLabel?: string;
  onAction?: () => void;
  keepOpenOnAction?: boolean;
}

const APP_NOTIFY_EVENT = 'app:notify';

export function notify(payload: AppNotificationPayload) {
  window.dispatchEvent(new CustomEvent<AppNotificationPayload>(APP_NOTIFY_EVENT, { detail: payload }));
}

export function getAppNotifyEventName() {
  return APP_NOTIFY_EVENT;
}
