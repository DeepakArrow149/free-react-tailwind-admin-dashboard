import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ThemeProvider } from '@/theme';
import { AppMetaProvider } from '@/components/common';
import { ToastProvider } from '@/components/ui';
import { QueryProvider } from '@/core/providers/QueryProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <ThemeProvider>
        <AppMetaProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AppMetaProvider>
      </ThemeProvider>
    </QueryProvider>
  </StrictMode>,
);
