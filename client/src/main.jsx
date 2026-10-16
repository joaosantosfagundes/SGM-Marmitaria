import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ConfirmProvider } from './context/ConfirmContext.jsx';
import './styles/globals.scss';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ConfirmProvider>
          <App />
          <Toaster position="top-right" toastOptions={{
            style: {
              fontFamily: '"Poppins", sans-serif',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(38, 38, 38, 0.10)',
              background: '#fff',
              color: '#262626',
              padding: '12px 16px',
              maxWidth: 'min(380px, calc(100vw - 32px))',
              overflowWrap: 'anywhere',
            },
            success: { iconTheme: { primary: '#00a76f', secondary: '#fff' } },
            error: { iconTheme: { primary: '#fb2c36', secondary: '#fff' } },
          }} />
        </ConfirmProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
