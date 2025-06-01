import React, { createContext, useState, useCallback, useContext, ReactNode } from 'react';
import { Snackbar, Alert, AlertProps } from '@mui/material';

interface NotificationContextProps {
    showNotification: (message: string, severity?: AlertProps['severity']) => void;
}

const NotificationContext = createContext<NotificationContextProps>({
    showNotification: () => {},
});

interface NotificationProviderProps {
    children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [severity, setSeverity] = useState<AlertProps['severity']>('success');

    const showNotification = useCallback((message: string, severity: AlertProps['severity'] = 'success') => {
        setMessage(message);
        setSeverity(severity);
        setOpen(true);
    }, []);

    const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setOpen(false);
    };

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            <Snackbar
                open={open}
                autoHideDuration={6000}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert 
                    onClose={handleClose} 
                    severity={severity} 
                    variant="filled" 
                    sx={{ width: '100%' }}
                >
                    {message}
                </Alert>
            </Snackbar>
        </NotificationContext.Provider>
    );
};

export const useNotification = () => useContext(NotificationContext);

export default NotificationContext;
