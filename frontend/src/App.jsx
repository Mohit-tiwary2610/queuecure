import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SocketProvider } from './hooks/useSocket.jsx';
import LandingPage from './pages/LandingPage.jsx';
import ReceptionistPage from './pages/ReceptionistPage.jsx';
import PatientPage from './pages/PatientPage.jsx';
import DoctorPage from './pages/DoctorPage.jsx';

export default function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style: { background: '#111827', color: '#F1F5FF', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '14px' },
          success: { iconTheme: { primary: '#00D4AA', secondary: '#060A14' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#060A14' } }
        }} />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/receptionist" element={<ReceptionistPage />} />
          <Route path="/patient" element={<PatientPage />} />
          <Route path="/doctor" element={<DoctorPage />} />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}
