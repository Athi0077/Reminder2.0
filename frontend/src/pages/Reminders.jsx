import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Plus, Clock, Trash2, X, Users, MessageSquare, LayoutList, CalendarDays, Repeat, Edit2 } from 'lucide-react';
import { SocketContext } from '../context/SocketContext';
import Skeleton from '../components/Skeleton';
import toast from 'react-hot-toast';
import ReminderCalendar from '../components/ReminderCalendar';
import EventDetails from '../components/EventDetails';
import { QRCodeCanvas } from 'qrcode.react';
import { scheduleNativeAlarm, cancelNativeAlarm, updateNativeAlarms } from '../services/nativeAlarm';

const Reminders = () => {
  const [reminders, setReminders] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewReminder, setViewReminder] = useState(null);
  const { socket } = useContext(SocketContext);
  
  const [formData, setFormData] = useState({
    title: '', description: '', date: '', time: '', location: '', priority: 'Medium', reminderTime: 15, sharedWith: [], type: 'personal', 
    recurrence: { frequency: 'none', interval: 1, daysOfWeek: [], endDate: '' }, joinSettings: 'INVITE_ONLY',
    alarm: { enabled: true, sound: 'default', snoozeMinutes: 5 }
  });

  useEffect(() => {
    fetchReminders();
    fetchFriends();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('reminder_shared', (newReminder) => {
        setReminders(prev => [...prev, newReminder].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime)));
        scheduleNativeAlarm(newReminder);
      });
      socket.on('reminder_updated', (updatedReminder) => {
        setReminders(prev => prev.map(r => r._id === updatedReminder._id ? updatedReminder : r).sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime)));
        if (updatedReminder.isCompleted) {
          cancelNativeAlarm(updatedReminder._id);
        } else {
          scheduleNativeAlarm(updatedReminder);
        }
      });
      socket.on('reminder_deleted', ({ id }) => {
        setReminders(prev => prev.filter(r => r._id !== id));
        cancelNativeAlarm(id);
      });
    }
    return () => {
      if (socket) {
        socket.off('reminder_shared');
        socket.off('reminder_updated');
        socket.off('reminder_deleted');
      }
    }
  }, [socket]);

  const fetchReminders = async () => {
    try {
      const res = await axios.get('/reminders');
      setReminders(res.data);
      updateNativeAlarms(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriends = async () => {
    try {
      const res = await axios.get('/friends');
      setFriends(res.data.friends);
    } catch (err) {
      console.error(err);
    }
  };

  const handleComplete = async (id) => {
    try {
      const res = await axios.patch(`/reminders/${id}/complete`);
      
      let updatedReminders = reminders.map(r => r._id === id ? (res.data.updatedReminder || res.data) : r);
      
      if (res.data.spawnedReminder) {
        updatedReminders.push(res.data.spawnedReminder);
        toast.success(`Next occurrence scheduled for ${new Date(res.data.spawnedReminder.dateTime).toLocaleDateString()}`);
        scheduleNativeAlarm(res.data.spawnedReminder);
      }
      
      const updated = res.data.updatedReminder || res.data;
      if (updated.isCompleted) {
        cancelNativeAlarm(id);
      } else {
        scheduleNativeAlarm(updated);
      }

      setReminders(updatedReminders);
    } catch (err) {
      console.error(err);
      toast.error('Error updating reminder');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete reminder?')) return;
    try {
      await axios.delete(`/reminders/${id}`);
      setReminders(reminders.filter(r => r._id !== id));
      cancelNativeAlarm(id);
    } catch (err) {
      console.error(err);
      alert('Failed to delete. You might not be the owner.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dateTime = new Date(`${formData.date}T${formData.time}`);
      const payload = { ...formData, dateTime };
      
      if (editMode && editId) {
        const res = await axios.put(`/reminders/${editId}`, payload);
        setReminders(prev => prev.map(r => r._id === editId ? res.data : r).sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime)));
        scheduleNativeAlarm(res.data);
      } else {
        const res = await axios.post('/reminders', payload);
        setReminders([...reminders, res.data].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime)));
        scheduleNativeAlarm(res.data);
      }
      setShowModal(false);
      setEditMode(false);
      setEditId(null);
      setFormData({ title: '', description: '', date: '', time: '', location: '', priority: 'Medium', reminderTime: 15, sharedWith: [], type: 'personal', recurrence: { frequency: 'none', interval: 1, daysOfWeek: [], endDate: '' }, joinSettings: 'INVITE_ONLY', alarm: { enabled: true, sound: 'default', snoozeMinutes: 5 } });
    } catch (err) {
      console.error(err);
      alert('Failed to save reminder');
    }
  };

  const handleEdit = (item) => {
    const dt = new Date(item.dateTime);
    setFormData({
      title: item.title,
      description: item.description || '',
      date: dt.toISOString().split('T')[0],
      time: dt.toTimeString().slice(0, 5),
      location: item.location || '',
      priority: item.priority,
      reminderTime: item.reminderTime,
      sharedWith: item.sharedWith.map(u => typeof u === 'object' ? u._id : u) || [],
      type: item.type,
      recurrence: item.recurrence || { frequency: item.recurrenceType || 'none', interval: 1, daysOfWeek: [], endDate: '' },
      joinSettings: item.joinSettings || 'INVITE_ONLY',
      alarm: item.alarm || { enabled: true, sound: 'default', snoozeMinutes: 5 }
    });
    setEditMode(true);
    setEditId(item._id);
    setShowModal(true);
  };

  const openNewModal = () => {
    setEditMode(false);
    setEditId(null);
    setFormData({ title: '', description: '', date: '', time: '', location: '', priority: 'Medium', reminderTime: 15, sharedWith: [], type: 'personal', recurrence: { frequency: 'none', interval: 1, daysOfWeek: [], endDate: '' }, alarm: { enabled: true, sound: 'default', snoozeMinutes: 5 } });
    setShowModal(true);
  };

  const toggleShare = (friendId) => {
    setFormData(prev => {
      const isShared = prev.sharedWith.includes(friendId);
      return {
        ...prev,
        sharedWith: isShared ? prev.sharedWith.filter(id => id !== friendId) : [...prev.sharedWith, friendId]
      };
    });
  };

  const getPriorityColor = (priority) => {
    if (priority === 'High') return 'text-red-600 bg-red-50 border-red-100';
    if (priority === 'Medium') return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-green-600 bg-green-50 border-green-100';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reminders</h1>
          <p className="text-slate-500 mt-1">Manage and track your tasks.</p>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex bg-slate-200/60 p-1 rounded-xl">
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-colors flex items-center justify-center ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} title="List View">
              <LayoutList size={20} />
            </button>
            <button onClick={() => setViewMode('calendar')} className={`p-2 rounded-lg transition-colors flex items-center justify-center ${viewMode === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} title="Calendar View">
              <CalendarDays size={20} />
            </button>
          </div>
          <button onClick={openNewModal} className="bg-primary-600 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:bg-primary-700 transition-colors shadow-sm whitespace-nowrap flex-1 sm:flex-none justify-center">
            <Plus size={20} />
            New Reminder
          </button>
        </div>
      </header>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton type="list-item" />
          <Skeleton type="list-item" />
          <Skeleton type="list-item" />
        </div>
      ) : viewMode === 'calendar' ? (
        <ReminderCalendar 
          reminders={reminders} 
          onSelectEvent={(reminder) => {
            if (reminder.type === 'team') {
              setActiveChat(reminder);
            } else {
              toast('This is a personal reminder.', { icon: '🔒' });
            }
          }} 
        />
      ) : (
        <div className="grid gap-4">
          {reminders.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <p className="text-slate-500">No reminders found. Create one!</p>
            </div>
          )}
          {reminders.map((item) => (
            <div key={item._id} onClick={() => setViewReminder(item)} className={`bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-shadow group cursor-pointer ${item.isCompleted ? 'opacity-60' : 'hover:shadow-md'}`}>
              <div className="flex items-center gap-4">
                <input 
                  type="checkbox" 
                  checked={item.isCompleted}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleComplete(item._id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer" 
                />
                <div>
                  <h3 className={`font-semibold transition-colors ${item.isCompleted ? 'text-slate-500 line-through' : 'text-slate-900 group-hover:text-primary-600'}`}>
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-2">
                    <Clock size={14} /> 
                    {new Date(item.dateTime).toLocaleString()}
                    {((item.recurrence?.frequency && item.recurrence.frequency !== 'none') || (item.recurrenceType && item.recurrenceType !== 'none')) && (
                      <span className="text-primary-500" title={`Repeats ${item.recurrence?.frequency || item.recurrenceType}`}>
                        <Repeat size={14} />
                      </span>
                    )}
                    {item.sharedWith && item.sharedWith.length > 0 && (
                      <span className="ml-2 flex items-center gap-1 text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md"><Users size={12}/> Shared</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">

                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(item.priority)}`}>
                  {item.priority}
                </span>
                {(!item.isCompleted && new Date(item.dateTime) > new Date()) && (
                  <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="text-slate-400 hover:text-blue-500 transition-colors p-1" title="Edit Reminder">
                    <Edit2 size={18} />
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); handleDelete(item._id); }} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Delete Reminder">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">{editMode ? 'Edit Reminder' : 'New Reminder'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Reminder Type</label>
                <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                  <button type="button" onClick={() => setFormData({...formData, type: 'personal'})} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${formData.type === 'personal' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Personal</button>
                  <button type="button" onClick={() => setFormData({...formData, type: 'team'})} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${formData.type === 'team' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Team</button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none" placeholder="What needs to be done?" />
              </div>

              {formData.type === 'team' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                    <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none resize-none" placeholder="Add more details..." rows="2"></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Join Settings</label>
                    <select value={formData.joinSettings} onChange={e => setFormData({...formData, joinSettings: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none">
                      <option value="INVITE_ONLY">Invite Only</option>
                      <option value="APPROVAL">Approval Required</option>
                      <option value="ANYONE">Anyone with Link/QR</option>
                    </select>
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                  <input type="time" required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-slate-700">Repeat Schedule</label>
                  <select 
                    value={formData.recurrence.frequency} 
                    onChange={e => setFormData({
                      ...formData, 
                      recurrence: { ...formData.recurrence, frequency: e.target.value }
                    })} 
                    className="w-1/2 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-white"
                  >
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                
                {formData.recurrence.frequency !== 'none' && (
                  <div className="space-y-4 pt-2 border-t border-slate-200">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-600">Repeat every</span>
                      <input 
                        type="number" 
                        min="1" 
                        max="99"
                        value={formData.recurrence.interval} 
                        onChange={e => setFormData({
                          ...formData, 
                          recurrence: { ...formData.recurrence, interval: Number(e.target.value) || 1 }
                        })} 
                        className="w-16 px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-white"
                      />
                      <span className="text-sm text-slate-600 capitalize">
                        {formData.recurrence.frequency.replace('ly', formData.recurrence.interval > 1 ? 's' : '')}
                      </span>
                    </div>

                    {formData.recurrence.frequency === 'weekly' && (
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-2">Repeat on</label>
                        <div className="flex flex-wrap gap-2">
                          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => {
                            const isSelected = formData.recurrence.daysOfWeek.includes(i);
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  const days = [...formData.recurrence.daysOfWeek];
                                  if (isSelected) days.splice(days.indexOf(i), 1);
                                  else days.push(i);
                                  setFormData({ ...formData, recurrence: { ...formData.recurrence, daysOfWeek: days } });
                                }}
                                className={`w-8 h-8 rounded-full text-xs font-bold transition-colors ${isSelected ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Ends on (Optional)</label>
                      <input 
                        type="date" 
                        value={formData.recurrence.endDate || ''} 
                        onChange={e => setFormData({
                          ...formData, 
                          recurrence: { ...formData.recurrence, endDate: e.target.value }
                        })} 
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-slate-700">Alarm</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={formData.alarm.enabled} onChange={e => setFormData({...formData, alarm: {...formData.alarm, enabled: e.target.checked}})} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
                
                {formData.alarm.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Sound</label>
                      <select value={formData.alarm.sound} onChange={e => setFormData({...formData, alarm: {...formData.alarm, sound: e.target.value}})} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-white">
                        <option value="default">Default</option>
                        <option value="sound1">Sound 1</option>
                        <option value="sound2">Sound 2</option>
                        <option value="sound3">Sound 3</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Snooze Duration</label>
                      <select value={formData.alarm.snoozeMinutes} onChange={e => setFormData({...formData, alarm: {...formData.alarm, snoozeMinutes: Number(e.target.value)}})} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-white">
                        <option value={5}>5 minutes</option>
                        <option value={10}>10 minutes</option>
                        <option value={15}>15 minutes</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {formData.type === 'team' && friends.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2"><Users size={16}/> Select Friends</label>
                  <div className="border border-slate-200 rounded-xl p-3 max-h-32 overflow-y-auto space-y-2">
                    {friends.map(f => (
                      <label key={f._id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.sharedWith.includes(f._id)} onChange={() => toggleShare(f._id)} className="rounded text-primary-600 focus:ring-primary-500"/>
                        <span className="text-sm text-slate-700">{f.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <button type="submit" className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors mt-4">
                {editMode ? 'Save Changes' : (formData.type === 'personal' ? 'Save Personal Reminder' : 'Create Team Reminder')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* View Reminder Details Modal */}
      {viewReminder && (
        <EventDetails 
          event={viewReminder} 
          onClose={() => setViewReminder(null)} 
          onUpdate={fetchReminders}
        />
      )}
    </div>
  );
};

export default Reminders;
