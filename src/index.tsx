import { createRoot } from 'react-dom/client';
import App from './app/App';
import { Logger } from './domain/utils/Logger';

const rootElement = document.getElementById('root')!;
createRoot(rootElement).render(<App />);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(
      registration => {
        Logger.log('Service Worker registered with scope:', registration.scope);
      },
      error => {
        Logger.error('Service Worker registration failed:', error);
      }
    );
  });
}
