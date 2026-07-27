import { createContext, useContext } from 'react';

export type NotificationSeverity = 'success' | 'info' | 'warning' | 'error';

export interface NotificationContextValue {
  notify: (message: string, severity?: NotificationSeverity) => void;
}

export const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

/**
 * App-wide toast surface. Containers report user-visible failures through this
 * rather than swallowing them into `Logger.error`, which leaves the UI silent.
 */
export function useNotification(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
