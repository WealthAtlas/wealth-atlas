import React from 'react';
import { AppThemeProvider } from './app/AppThemeProvider';
import { AppRouter } from './app/AppRouter';

const App: React.FC = () => {
  return (
    <AppThemeProvider>
      <AppRouter />
    </AppThemeProvider>
  );
};

export default App;
