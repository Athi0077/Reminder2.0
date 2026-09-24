import { useContext, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Navbar from './Navbar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import { AuthContext } from '../context/AuthContext';

const Layout = () => {
  const { user } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Navbar isOpen={isOpen} setIsOpen={setIsOpen} />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden pb-16 md:pb-0">
        <Topbar setIsOpen={setIsOpen} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
};

export default Layout;
