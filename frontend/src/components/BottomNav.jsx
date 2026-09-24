import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Bell, Users, History, User as UserIcon } from 'lucide-react';

const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Reminders', path: '/reminders', icon: Bell },
    { name: 'Friends', path: '/friends', icon: Users },
    { name: 'History', path: '/history', icon: History },
    { name: 'Profile', path: '/profile', icon: UserIcon },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 px-2 py-2 flex justify-between items-center" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0.5rem)' }}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.name}
            to={item.path}
            className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl flex-1 ${
              isActive ? 'text-primary-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`${isActive ? 'bg-primary-100 p-1.5 rounded-full' : 'p-1.5'}`}>
              <Icon size={20} className={isActive ? 'text-primary-700' : ''} />
            </div>
            <span className={`text-[10px] font-medium ${isActive ? 'text-primary-700' : ''}`}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
};

export default BottomNav;
