import { Alert, Snackbar } from '@mui/material';
import { ReactNode, useCallback, useMemo, useState } from 'react';
import { NotificationContext, NotificationSeverity } from './NotificationContext';

interface Notification {
  message: string;
  severity: NotificationSeverity;
  /** Distinguishes two consecutive identical messages so the snackbar re-opens. */
  key: number;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<Notification | undefined>();
  const [open, setOpen] = useState(false);

  const notify = useCallback((message: string, severity: NotificationSeverity = 'info') => {
    setNotification({ message, severity, key: Date.now() });
    setOpen(true);
  }, []);

  const handleClose = useCallback((_event?: unknown, reason?: string) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Snackbar
        key={notification?.key}
        open={open}
        autoHideDuration={notification?.severity === 'error' ? 8000 : 4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleClose}
          severity={notification?.severity ?? 'info'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}
