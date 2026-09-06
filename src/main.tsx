import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';
import { NaomiErrorBoundary } from './components/NaomiErrorBoundary';
import { ClubProvider } from './contexts/ClubContext';
import AccessGate from './components/AccessGate';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccessGate>
      <NaomiErrorBoundary>
        <ClubProvider>
          <App />
        </ClubProvider>
      </NaomiErrorBoundary>
    </AccessGate>
  </StrictMode>,
);
