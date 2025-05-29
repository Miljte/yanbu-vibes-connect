
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { AuthProvider } from './hooks/useAuth.tsx'
import { LocalizationProvider } from './contexts/LocalizationContext.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(
  <LocalizationProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </LocalizationProvider>
);
