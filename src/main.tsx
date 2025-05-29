
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { AuthProvider } from './hooks/useAuth.tsx'
import { LocalizationProvider } from './contexts/LocalizationContext.tsx'
import { ThemeProvider } from './contexts/ThemeContext.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <LocalizationProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </LocalizationProvider>
  </ThemeProvider>
);
