import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Settings, User, Shield, Bell, Download, LogOut } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

const InstallButton = () => {
  const { isInstallable, installPWA } = usePWAInstall();

  if (!isInstallable) {
    return <p className="text-xs text-slate-400 italic">App is already installed or not supported.</p>;
  }

  return (
    <button 
      onClick={installPWA}
      className="flex items-center gap-2 text-sm px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors w-full justify-center"
    >
      <Download size={16} /> Install App
    </button>
  );
};

const Profile = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Profile Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account preferences.</p>
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-200 flex flex-col md:flex-row gap-8 items-center md:items-start">
          <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-3xl uppercase">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold text-slate-900 capitalize">{user?.name || 'User'}</h2>
            <p className="text-slate-500">{user?.email || 'user@example.com'}</p>
            <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-3">
              <button className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">
                Edit Profile
              </button>
              <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                Change Avatar
              </button>
              <button 
                onClick={logout}
                className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors flex items-center gap-2"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          <div className="p-6 hover:bg-slate-50 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3 text-slate-700 font-medium group-hover:text-primary-600 transition-colors">
              <User size={20} /> Personal Info
            </div>
            <p className="text-sm text-slate-500 mt-2">Update your name and basic details.</p>
          </div>
          <div className="p-6 hover:bg-slate-50 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3 text-slate-700 font-medium group-hover:text-primary-600 transition-colors">
              <Shield size={20} /> Security
            </div>
            <p className="text-sm text-slate-500 mt-2">Password, 2FA, and sessions.</p>
          </div>
          <div className="p-6 hover:bg-slate-50 transition-colors group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 text-slate-700 font-medium group-hover:text-primary-600 transition-colors">
                <Bell size={20} /> Notifications & Alarms
              </div>
            </div>
            <p className="text-sm text-slate-500 mb-4">Email and push notification preferences.</p>
            <div className="flex flex-col gap-2 items-start">
              <button 
                onClick={async () => {
                  if ('Notification' in window) {
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                      toast.success('Notifications enabled!');
                    } else {
                      toast.error('Notification permission denied.');
                    }
                  } else {
                    toast.error('Notifications not supported by this browser.');
                  }
                }}
                className="text-sm px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition-colors"
              >
                Enable Notifications
              </button>
              <button 
                onClick={() => {
                  import('../services/alarmService').then(({ default: alarmService }) => {
                    alarmService.play('default');
                    toast.success('Testing Alarm Sound (Click to stop)', { duration: 5000 });
                    setTimeout(() => alarmService.stop(), 5000);
                  });
                  if (Notification.permission === 'granted') {
                    new Notification('Test Alarm', { body: 'This is a test notification from the Reminder app.', icon: '/vite.svg' });
                  }
                }}
                className="text-sm px-3 py-1.5 bg-primary-100 hover:bg-primary-200 rounded-lg text-primary-700 font-medium transition-colors"
              >
                Test Alarm
              </button>
            </div>
          </div>
          <div className="p-6 hover:bg-slate-50 transition-colors group">
            <div className="flex items-center gap-3 text-slate-700 font-medium group-hover:text-primary-600 transition-colors mb-2">
              <Settings size={20} /> App Settings
            </div>
            <p className="text-sm text-slate-500 mb-4">Install RemindMe as an app for a better experience.</p>
            <InstallButton />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
