import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { CheckCircle2, Clock, Calendar, BarChart3, TrendingUp, ListTodo, Download, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { usePWAInstall } from '../hooks/usePWAInstall';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isInstallable, installPWA } = usePWAInstall();
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, notifRes] = await Promise.all([
          axios.get('/reminders/dashboard-stats'),
          axios.get('/notifications')
        ]);
        
        setStats(statsRes.data);

        const mappedNotifications = notifRes.data.map(n => ({
          _id: n._id,
          message: n.message,
          createdAt: n.createdAt,
          sender: n.sender,
          type: n.type.replace('_', ' ')
        }));

        const combinedActivities = mappedNotifications
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);

        setActivities(combinedActivities);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading || !stats) {
    return <div className="animate-pulse space-y-6">
      <div className="h-10 bg-slate-200 rounded w-1/3"></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-200 rounded-2xl"></div>)}
      </div>
      <div className="h-64 bg-slate-200 rounded-2xl"></div>
    </div>;
  }

  const pieData = [
    { name: 'Completed', value: stats.completedCount, color: '#10b981' },
    { name: 'Pending', value: stats.pendingCount, color: '#f59e0b' },
  ];

  const barData = [
    { name: 'Today', events: stats.segments.today },
    { name: 'Tomorrow', events: stats.segments.tomorrow },
    { name: 'Next 7 Days', events: stats.segments.later },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {isInstallable && showBanner && (
        <div className="bg-primary-600 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-white shadow-md animate-in slide-in-from-top-4">
          <div>
            <h3 className="font-semibold text-lg">Install RemindMe App</h3>
            <p className="text-primary-100 text-sm">Get quick access from your home screen and a better mobile experience.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => setShowBanner(false)} className="px-4 py-2 bg-primary-700/50 hover:bg-primary-700 rounded-xl text-sm font-medium transition-colors flex-1 sm:flex-none">
              Dismiss
            </button>
            <button onClick={installPWA} className="px-4 py-2 bg-white text-primary-700 hover:bg-slate-50 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 flex-1 sm:flex-none">
              <Download size={16} /> Install Now
            </button>
          </div>
        </div>
      )}

      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Productivity Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back, {user?.name.split(' ')[0]}! Here is your performance overview.</p>
        </div>
      </header>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Reminders</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stats.totalCount}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
            <BarChart3 size={24} />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-slate-500">Completed Events</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.completedCount}</p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-slate-500">Completion Rate</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stats.completionRate}%</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-xl text-purple-600 group-hover:scale-110 transition-transform">
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-slate-500">Upcoming (7 days)</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stats.upcomingCount}</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-xl text-amber-600 group-hover:scale-110 transition-transform">
            <Calendar size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Completion Pie Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Task Completion</h2>
          <div className="h-64">
            {stats.totalCount > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">No data available</div>
            )}
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-sm text-slate-600">Completed</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span className="text-sm text-slate-600">Pending</span></div>
          </div>
        </div>

        {/* Upcoming Events Bar Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Upcoming Schedule Breakdown</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="events" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Tasks Progress */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6 flex flex-col justify-center">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600"><ListTodo size={24}/></div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Team Checklists Overview</h2>
              <p className="text-sm text-slate-500">Across all collaborative events</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm font-medium mb-2">
              <span className="text-slate-700">Overall Progress</span>
              <span className="text-indigo-600">{stats.tasks.total > 0 ? Math.round((stats.tasks.completed / stats.tasks.total) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-full transition-all duration-1000 ease-out rounded-full"
                style={{ width: `${stats.tasks.total > 0 ? Math.round((stats.tasks.completed / stats.tasks.total) * 100) : 0}%` }}
              ></div>
            </div>
            <p className="text-sm text-slate-500 mt-3 text-center">
              {stats.tasks.completed} out of {stats.tasks.total} team tasks completed
            </p>
          </div>
        </div>

        {/* Recent Activities Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">Recent Notifications</h2>
          </div>
          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {activities.length === 0 ? (
              <div className="p-6 text-center text-slate-500">No recent activities!</div>
            ) : activities.map((item, idx) => (
              <div key={item._id || idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.sender?.profileImage ? (
                      <img src={item.sender.profileImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-slate-500 font-semibold">{item.sender?.name?.[0] || 'A'}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900 text-sm line-clamp-1">{item.message}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock size={12} /> {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
