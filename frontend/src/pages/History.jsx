import { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, History as HistoryIcon, CalendarCheck, UserPlus, BellRing } from 'lucide-react';
import Skeleton from '../components/Skeleton';

const History = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [remindersRes, notifRes] = await Promise.all([
          axios.get('/reminders'),
          axios.get('/notifications')
        ]);
        
        // Map reminders and notifications to a unified activity format
        const mappedReminders = remindersRes.data.map(r => ({
          _id: r._id,
          message: `Created ${r.type === 'team' ? 'team reminder' : 'personal reminder'}: ${r.title}`,
          createdAt: r.createdAt,
          sender: r.owner || { name: 'You' },
          type: r.type === 'team' ? 'team reminder' : 'personal reminder',
          isReminder: true
        }));

        const mappedNotifications = notifRes.data.map(n => ({
          _id: n._id,
          message: n.message,
          createdAt: n.createdAt,
          sender: n.sender,
          type: n.type.replace('_', ' '),
          isReminder: false
        }));

        // Combine and sort by date descending
        const combinedActivities = [...mappedReminders, ...mappedNotifications]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setActivities(combinedActivities);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const getIconForType = (type) => {
    if (type.includes('reminder')) return <CalendarCheck size={18} className="text-primary-500" />;
    if (type.includes('request') || type.includes('invitation')) return <UserPlus size={18} className="text-blue-500" />;
    return <BellRing size={18} className="text-amber-500" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <header className="flex items-center gap-4 border-b border-slate-200 pb-6">
        <div className="bg-primary-100 p-3 rounded-2xl text-primary-600">
          <HistoryIcon size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Activity History</h1>
          <p className="text-slate-500 mt-1">A timeline of your past events, reminders, and interactions.</p>
        </div>
      </header>

      {/* Timeline List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-6 space-y-4">
              <Skeleton type="list-item" />
              <Skeleton type="list-item" />
              <Skeleton type="list-item" />
            </div>
          ) : activities.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <HistoryIcon size={48} className="mx-auto mb-4 text-slate-300" />
              <p>No recent activities found.</p>
            </div>
          ) : activities.map((item, idx) => (
            <div key={item._id || idx} className="p-6 flex items-start gap-5 hover:bg-slate-50 transition-colors">
              <div className="mt-1 h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
                {item.sender?.profileImage ? (
                  <img src={item.sender.profileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-slate-500 font-bold text-lg">{item.sender?.name?.[0] || 'A'}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-4">
                  <h3 className="text-base font-medium text-slate-900 leading-snug">{item.message}</h3>
                  <div className="flex items-center gap-2 flex-shrink-0 text-slate-500 text-sm whitespace-nowrap bg-slate-100 px-3 py-1 rounded-full">
                    <Clock size={14} /> 
                    {new Date(item.createdAt).toLocaleString(undefined, { 
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 capitalize">
                    {getIconForType(item.type)}
                    {item.type}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default History;
