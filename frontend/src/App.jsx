import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Reminders from './pages/Reminders';
import Friends from './pages/Friends';
import History from './pages/History';
import Profile from './pages/Profile';
import JoinReminder from './pages/JoinReminder';
import Login from './pages/Login';
import Register from './pages/Register';
import AlarmManager from './components/AlarmManager';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AlarmManager />
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#334155', color: '#fff' } }} />
        <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Private Routes wrapped in Layout */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="reminders" element={<Reminders />} />
            <Route path="friends" element={<Friends />} />
            <Route path="history" element={<History />} />
            <Route path="profile" element={<Profile />} />
            <Route path="join-reminder/:id" element={<JoinReminder />} />
          </Route>
        </Routes>
      </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
