import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ThemeProvider } from '@/theme';
import { AppMetaProvider } from '@/components/common';
import { ToastProvider } from '@/components/ui';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AppMetaProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AppMetaProvider>
    </ThemeProvider>
  </StrictMode>,
);
