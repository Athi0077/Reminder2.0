import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Bell, Users, User as UserIcon, LogOut, X, History } from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Navbar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Reminders', path: '/reminders', icon: Bell },
    { name: 'Friends', path: '/friends', icon: Users },
    { name: 'History', path: '/history', icon: History },
    { name: 'Profile', path: '/profile', icon: UserIcon },
  ];

  return (
    <>
      <nav className={`
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 
        fixed md:static inset-y-0 left-0 z-40
        w-64 bg-white border-r border-slate-200 
        transition-transform duration-300 ease-in-out
        hidden md:flex flex-col h-screen
      `}>
        {/* Desktop Brand */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="bg-primary-600 text-white p-2 rounded-lg">
              <Bell size={24} />
            </div>
            <span className="font-bold text-2xl text-slate-800">RemindMe</span>
          </div>
          {/* Mobile close button inside sidebar */}
          <button onClick={() => setIsOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-primary-50 text-primary-600 font-medium' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-primary-600' : 'text-slate-400'} />
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/40 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Navbar;
