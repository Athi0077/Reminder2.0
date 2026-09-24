import { useState, useContext, useEffect } from 'react';
import { Bell, Menu, Check } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const Topbar = ({ setIsOpen }) => {
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  const { user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  useEffect(() => {
    if (socket) {
      socket.on('new_notification', (notif) => {
        setNotifications((prev) => [notif, ...prev]);
      });
    }
    return () => {
      if (socket) socket.off('new_notification');
    };
  }, [socket]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/notifications');
      setNotifications(res.data);
    } catch (error) {
      console.error('Failed to fetch notifications');
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await axios.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.patch('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error(error);
    }
  };

  const handleAcceptInvite = async (notifId, inviteId) => {
    try {
      await axios.post(`/reminders/invitations/${inviteId}/accept`);
      handleMarkAsRead(notifId);
      toast.success('Team invitation accepted!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error accepting invitation');
    }
  };

  const handleRejectInvite = async (notifId, inviteId) => {
    try {
      await axios.post(`/reminders/invitations/${inviteId}/reject`);
      handleMarkAsRead(notifId);
      toast.success('Team invitation rejected.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error rejecting invitation');
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 flex items-center justify-between z-30 shadow-sm relative">
      <div className="flex items-center gap-4">
        {/* Mobile menu toggle removed for bottom nav */}
        {/* Brand showing on mobile */}
        <span className="md:hidden font-bold text-xl text-slate-800">RemindMe</span>
      </div>

      <div className="flex items-center gap-4 md:gap-6 ml-auto relative">
        {/* Notifications Button */}
        <button className="relative p-2 rounded-full hover:bg-slate-100 transition-colors" onClick={() => setShowNotifs(!showNotifs)}>
          <Bell size={22} className="text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Dropdown */}
        {showNotifs && (
          <div className="absolute top-full right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 md:w-96 bg-white border border-slate-200 shadow-xl rounded-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-800">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs text-primary-600 font-medium hover:text-primary-700">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="p-4 text-center text-sm text-slate-500">No notifications.</p>
              ) : (
                notifications.map(notif => (
                  <div key={notif._id} className={`p-4 border-b border-slate-50 flex flex-col gap-2 ${notif.isRead ? 'opacity-60' : 'bg-blue-50/30'}`}>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex-shrink-0 flex items-center justify-center text-primary-700 font-bold text-xs">
                        {notif.sender?.name?.charAt(0) || '!'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800 break-words">{notif.message}</p>
                        <p className="text-xs text-slate-400 mt-1">{new Date(notif.createdAt).toLocaleDateString()}</p>
                      </div>
                      {!notif.isRead && notif.type !== 'team_invitation' && (
                        <button onClick={() => handleMarkAsRead(notif._id)} className="text-primary-600 self-center flex-shrink-0">
                          <Check size={16} />
                        </button>
                      )}
                    </div>
                    {notif.type === 'team_invitation' && !notif.isRead && (
                      <div className="flex gap-2 mt-2 ml-11">
                        <button onClick={() => handleAcceptInvite(notif._id, notif.relatedId)} className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-700 transition-colors">Accept</button>
                        <button onClick={() => handleRejectInvite(notif._id, notif.relatedId)} className="bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-300 transition-colors">Reject</button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Desktop User Profile Snippet */}
        {user && (
          <div className="hidden md:flex items-center gap-3 pl-4 border-l border-slate-200">
            <div className="text-right">
              <p className="text-sm font-bold text-slate-800 leading-tight">{user.name}</p>
              <p className="text-xs text-slate-500 leading-tight">{user.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
              {user.name.charAt(0)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Topbar;
