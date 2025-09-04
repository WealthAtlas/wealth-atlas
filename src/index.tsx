import { createRoot } from 'react-dom/client';
import App from './app/App';

const rootElement = document.getElementById('root')!;
createRoot(rootElement).render(<App />);
