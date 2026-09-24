import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { X, Clock, LayoutList, Repeat, Users, UserPlus, Settings, MapPin, MessageSquare, CheckSquare, Activity, ShieldAlert, ShieldCheck, User as UserIcon, Plus, Trash2, Calendar, BarChart } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import toast from 'react-hot-toast';
import Skeleton from './Skeleton';
import ReminderComments from './ReminderComments';

const EventDetails = ({ event, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const { user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

  const isOwner = event.owner?._id === user.id || event.owner === user.id;
  
  // Find current user's role
  const currentUserMember = members.find(m => m.userId?._id === user.id);
  const isAdmin = isOwner || currentUserMember?.role === 'admin';

  const [joinRequests, setJoinRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', dueDate: '', assignees: [] });

  // Logs state
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Polls state
  const [polls, setPolls] = useState([]);
  const [loadingPolls, setLoadingPolls] = useState(false);
  const [showPollForm, setShowPollForm] = useState(false);
  const [newPoll, setNewPoll] = useState({ question: '', options: ['', ''] });

  useEffect(() => {
    if (activeTab === 'members') {
      fetchMembers();
      if (isAdmin && event.joinSettings === 'APPROVAL') {
        fetchJoinRequests();
      }
    } else if (activeTab === 'tasks') {
      fetchTasks();
      if (members.length === 0) fetchMembers(); // need members for assignee dropdown
    } else if (activeTab === 'timeline') {
      fetchLogs();
    } else if (activeTab === 'polls') {
      fetchPolls();
    }
  }, [activeTab, isAdmin, event.joinSettings]);

  useEffect(() => {
    if (socket) {
      socket.on(`task_created_${event._id}`, (task) => {
        setTasks(prev => [...prev, task]);
      });
      socket.on(`task_updated_${event._id}`, (updatedTask) => {
        setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
      });
      socket.on(`task_deleted_${event._id}`, (taskId) => {
        setTasks(prev => prev.filter(t => t._id !== taskId));
      });
      socket.on(`event_log_${event._id}`, (log) => {
        setLogs(prev => [log, ...prev]);
      });
      socket.on(`poll_created_${event._id}`, (poll) => {
        setPolls(prev => [poll, ...prev]);
      });
      socket.on(`poll_updated_${event._id}`, (updatedPoll) => {
        setPolls(prev => prev.map(p => p._id === updatedPoll._id ? updatedPoll : p));
      });
      socket.on(`poll_deleted_${event._id}`, (pollId) => {
        setPolls(prev => prev.filter(p => p._id !== pollId));
      });

      return () => {
        socket.off(`task_created_${event._id}`);
        socket.off(`task_updated_${event._id}`);
        socket.off(`task_deleted_${event._id}`);
        socket.off(`event_log_${event._id}`);
        socket.off(`poll_created_${event._id}`);
        socket.off(`poll_updated_${event._id}`);
        socket.off(`poll_deleted_${event._id}`);
      };
    }
  }, [socket, event._id]);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await axios.get(`/reminders/${event._id}/logs`);
      setLogs(res.data);
    } catch (error) {
      toast.error('Failed to load activity logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchPolls = async () => {
    setLoadingPolls(true);
    try {
      const res = await axios.get(`/reminders/${event._id}/polls`);
      setPolls(res.data);
    } catch (error) {
      toast.error('Failed to load polls');
    } finally {
      setLoadingPolls(false);
    }
  };

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    if (!newPoll.question.trim() || newPoll.options.filter(o => o.trim()).length < 2) {
      return toast.error('A poll needs a question and at least two options.');
    }
    
    try {
      await axios.post(`/reminders/${event._id}/polls`, {
        question: newPoll.question,
        options: newPoll.options.filter(o => o.trim())
      });
      setNewPoll({ question: '', options: ['', ''] });
      setShowPollForm(false);
      toast.success('Poll created');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create poll');
    }
  };

  const handleVotePoll = async (pollId, optionId) => {
    try {
      await axios.post(`/reminders/polls/${pollId}/vote`, { optionId });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to vote');
    }
  };

  const handleClosePoll = async (pollId) => {
    try {
      await axios.patch(`/reminders/polls/${pollId}/close`);
      toast.success('Poll closed');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to close poll');
    }
  };

  const handleDeletePoll = async (pollId) => {
    if (!window.confirm('Are you sure you want to delete this poll?')) return;
    try {
      await axios.delete(`/reminders/polls/${pollId}`);
      toast.success('Poll deleted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete poll');
    }
  };

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await axios.get(`/reminders/${event._id}/tasks`);
      setTasks(res.data);
    } catch (error) {
      toast.error('Failed to load tasks');
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    try {
      await axios.post(`/reminders/${event._id}/tasks`, newTask);
      toast.success('Task created');
      setNewTask({ title: '', dueDate: '', assignees: [] });
      setShowTaskForm(false);
      fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create task');
    }
  };

  const handleToggleTask = async (taskId, currentStatus) => {
    try {
      await axios.patch(`/reminders/tasks/${taskId}`, { isCompleted: !currentStatus });
      fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await axios.delete(`/reminders/tasks/${taskId}`);
      toast.success('Task deleted');
      fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete task');
    }
  };

  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const res = await axios.get(`/reminders/${event._id}/members`);
      setMembers(res.data);
    } catch (error) {
      toast.error('Failed to load members');
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchJoinRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await axios.get(`/reminders/${event._id}/join-requests`);
      setJoinRequests(res.data);
    } catch (error) {
      toast.error('Failed to load join requests');
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleJoinRequest = async (requestId, action) => {
    try {
      await axios.patch(`/reminders/join-requests/${requestId}`, { action });
      toast.success(action === 'ACCEPT' ? 'Request approved' : 'Request rejected');
      fetchJoinRequests();
      if (action === 'ACCEPT') fetchMembers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process request');
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await axios.patch(`/reminders/${event._id}/members/${memberId}/role`, { role: newRole });
      toast.success('Role updated');
      fetchMembers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update role');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      await axios.delete(`/reminders/${event._id}/members/${memberId}`);
      toast.success('Member removed');
      fetchMembers();
      onUpdate(); // Refresh the main list if needed
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleLeaveTeam = async () => {
    if (!window.confirm('Are you sure you want to leave this team?')) return;
    try {
      await axios.delete(`/reminders/${event._id}/members/${user.id}`);
      toast.success('You left the team');
      onUpdate();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to leave team');
    }
  };

  const handleDeleteEvent = async () => {
    if (!window.confirm('Delete this team reminder? This will remove it for all members.')) return;
    try {
      await axios.delete(`/reminders/${event._id}`);
      toast.success('Reminder deleted');
      onUpdate();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete reminder');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-50 text-red-600 border-red-200';
      case 'Medium': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'Low': return 'bg-green-50 text-green-600 border-green-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutList },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'timeline', label: 'Timeline', icon: Activity },
    { id: 'polls', label: 'Polls', icon: BarChart },
    { id: 'location', label: 'Location', icon: MapPin },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex justify-end">
      {/* Slide-in Panel */}
      <div className="w-full md:w-[600px] lg:w-[800px] h-full bg-slate-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getPriorityColor(event.priority)}`}>
                {event.priority}
              </span>
              <span className="bg-primary-50 text-primary-600 border border-primary-100 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                {event.type}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 line-clamp-1">{event.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {!isOwner && event.type === 'team' && (
              <button 
                onClick={handleLeaveTeam} 
                className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
              >
                Leave
              </button>
            )}
            {isOwner && event.type === 'team' && (
              <button 
                onClick={handleDeleteEvent} 
                className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors border border-red-100 flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white border-b border-slate-200 px-2 flex overflow-x-auto hide-scrollbar flex-shrink-0">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Event Details</h3>
                {event.description && (
                  <p className="text-slate-600 mb-6 whitespace-pre-wrap">{event.description}</p>
                )}
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-700">
                    <Clock className="text-primary-500" size={20} />
                    <div>
                      <p className="text-sm font-medium">Scheduled Time</p>
                      <p className="text-sm text-slate-500">{new Date(event.dateTime).toLocaleString()}</p>
                    </div>
                  </div>

                  {event.recurrenceType && event.recurrenceType !== 'none' && (
                    <div className="flex items-center gap-3 text-slate-700">
                      <Repeat className="text-primary-500" size={20} />
                      <div>
                        <p className="text-sm font-medium">Recurrence</p>
                        <p className="text-sm text-slate-500 capitalize">Repeats {event.recurrenceType}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 text-slate-700">
                    <Users className="text-primary-500" size={20} />
                    <div>
                      <p className="text-sm font-medium">Members</p>
                      <p className="text-sm text-slate-500">
                        {event.sharedWith?.length > 0 
                          ? `${event.sharedWith.length + 1} participant(s)`
                          : 'Just you'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {event.type === 'team' && (
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col items-center text-center">
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">Share & Invite</h3>
                  <p className="text-sm text-slate-500 mb-4">Scan the QR code to instantly join this event.</p>
                  
                  <div className="bg-white p-3 rounded-xl border border-slate-200 inline-block mb-4 shadow-sm">
                    <QRCodeCanvas 
                      id="event-qrcode" 
                      value={`${window.location.origin}/join-reminder/${event._id}`} 
                      size={160} 
                      level={"H"}
                    />
                  </div>
                  
                  <button 
                    onClick={() => {
                      const canvas = document.getElementById('event-qrcode');
                      if (canvas) {
                        const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
                        let downloadLink = document.createElement('a');
                        downloadLink.href = pngUrl;
                        downloadLink.download = `event-${event._id}.png`;
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        document.body.removeChild(downloadLink);
                      }
                    }}
                    className="text-primary-600 hover:text-primary-700 font-medium bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-lg transition-colors"
                  >
                    Download QR Code
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MEMBERS TAB */}
          {activeTab === 'members' && (
            <div className="max-w-2xl mx-auto">
              {isAdmin && event.joinSettings === 'APPROVAL' && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Pending Requests</h3>
                  <div className="bg-amber-50 rounded-2xl border border-amber-200 overflow-hidden">
                    {loadingRequests ? (
                      <div className="p-4"><Skeleton type="list-item" /></div>
                    ) : joinRequests.length === 0 ? (
                      <div className="p-4 text-sm text-amber-700 text-center">No pending requests at the moment.</div>
                    ) : (
                      <div className="divide-y divide-amber-200/50">
                        {joinRequests.map(req => (
                          <div key={req._id} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-amber-200 flex-shrink-0 flex items-center justify-center overflow-hidden border border-amber-300">
                                {req.userId?.profileImage ? (
                                  <img src={req.userId.profileImage} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="font-bold text-amber-700">{req.userId?.name?.charAt(0) || '?'}</span>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{req.userId?.name}</p>
                                <p className="text-xs text-amber-700">{req.userId?.email}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleJoinRequest(req._id, 'ACCEPT')} className="text-sm bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
                                Accept
                              </button>
                              <button onClick={() => handleJoinRequest(req._id, 'REJECT')} className="text-sm bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-lg font-medium transition-colors">
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Event Members</h3>
                  <p className="text-sm text-slate-500">Manage participants and roles.</p>
                </div>
                {isAdmin && (
                  <button className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center gap-2 transition-colors">
                    <UserPlus size={16} />
                    Add Member
                  </button>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loadingMembers ? (
                  <div className="p-6"><Skeleton type="list-item" /></div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {members.map(member => (
                      <div key={member._id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-300">
                            {member.userId?.profileImage ? (
                              <img src={member.userId.profileImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-bold text-slate-500">{member.userId?.name?.charAt(0) || '?'}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 flex items-center gap-2">
                              {member.userId?.name}
                              {member.userId?._id === user.id && <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded font-bold">YOU</span>}
                            </p>
                            <p className="text-xs text-slate-500">{member.userId?.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
                            member.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                            member.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {member.role === 'owner' && <ShieldAlert size={14} />}
                            {member.role === 'admin' && <ShieldCheck size={14} />}
                            {member.role === 'member' && <UserIcon size={14} />}
                            <span className="uppercase tracking-wider">{member.role}</span>
                          </div>

                          {isOwner && member.userId?._id !== user.id && (
                            <div className="flex items-center gap-1 ml-2 border-l border-slate-200 pl-3">
                              {member.role === 'member' && (
                                <button onClick={() => handleRoleChange(member.userId._id, 'admin')} className="text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded font-medium transition-colors">
                                  Make Admin
                                </button>
                              )}
                              {member.role === 'admin' && (
                                <button onClick={() => handleRoleChange(member.userId._id, 'member')} className="text-xs text-slate-600 hover:bg-slate-100 px-2 py-1 rounded font-medium transition-colors">
                                  Make Member
                                </button>
                              )}
                              <button onClick={() => handleRemoveMember(member.userId._id)} className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded font-medium transition-colors">
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TASKS TAB */}
          {activeTab === 'tasks' && (
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Checklist & Tasks</h3>
                  <p className="text-sm text-slate-500">Track progress and assign responsibilities.</p>
                </div>
                {isAdmin && (
                  <button onClick={() => setShowTaskForm(!showTaskForm)} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center gap-2 transition-colors">
                    <Plus size={16} />
                    New Task
                  </button>
                )}
              </div>

              {/* Progress Bar */}
              {tasks.length > 0 && (
                <div className="mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700">Overall Progress</span>
                    <span className="text-sm font-bold text-primary-600">
                      {Math.round((tasks.filter(t => t.isCompleted).length / tasks.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${(tasks.filter(t => t.isCompleted).length / tasks.length) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Create Task Form */}
              {showTaskForm && isAdmin && (
                <form onSubmit={handleCreateTask} className="mb-6 bg-primary-50/50 p-5 rounded-2xl border border-primary-100 animate-in slide-in-from-top-2">
                  <div className="grid gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Task Title</label>
                      <input type="text" autoFocus required value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none" placeholder="What needs to be done?" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Due Date (Optional)</label>
                        <input type="date" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Assign To</label>
                        <select 
                          multiple 
                          value={newTask.assignees} 
                          onChange={e => {
                            const values = Array.from(e.target.selectedOptions, option => option.value);
                            setNewTask({...newTask, assignees: values});
                          }} 
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm"
                          size="3"
                        >
                          {members.map(m => (
                            <option key={m.userId._id} value={m.userId._id}>{m.userId.name}</option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <button type="button" onClick={() => setShowTaskForm(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                      <button type="submit" className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">Save Task</button>
                    </div>
                  </div>
                </form>
              )}

              {/* Task List */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loadingTasks ? (
                  <div className="p-6"><Skeleton type="list-item" /></div>
                ) : tasks.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center">
                    <CheckSquare size={40} className="text-slate-200 mb-3" />
                    <p className="text-slate-500 font-medium">No tasks added yet.</p>
                    <p className="text-sm text-slate-400 mt-1">Create a task to keep everyone organized.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {tasks.map(task => {
                      const isAssignee = task.assignees.some(a => a._id === user.id);
                      const canToggle = isAdmin || isAssignee;

                      return (
                        <div key={task._id} className={`p-4 flex items-start gap-4 transition-colors hover:bg-slate-50 ${task.isCompleted ? 'bg-slate-50/50' : ''}`}>
                          <input 
                            type="checkbox" 
                            checked={task.isCompleted}
                            onChange={() => canToggle && handleToggleTask(task._id, task.isCompleted)}
                            disabled={!canToggle}
                            className={`mt-1 w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 ${canToggle ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-medium ${task.isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{task.title}</h4>
                            <div className="flex flex-wrap items-center gap-3 mt-1.5">
                              {task.dueDate && (
                                <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                  <Calendar size={12} />
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              )}
                              {task.assignees.length > 0 && (
                                <div className="flex items-center gap-1">
                                  {task.assignees.map(assignee => (
                                    <div key={assignee._id} className="w-5 h-5 rounded-full bg-primary-100 border border-primary-200 flex items-center justify-center overflow-hidden" title={assignee.name}>
                                      {assignee.profileImage ? (
                                        <img src={assignee.profileImage} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="text-[9px] font-bold text-primary-700">{assignee.name.charAt(0)}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          {isAdmin && (
                            <button onClick={() => handleDeleteTask(task._id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CHAT TAB */}
          {activeTab === 'chat' && (
            <div className="max-w-3xl mx-auto h-[calc(100vh-140px)] md:h-[calc(100vh-200px)]">
              <ReminderComments reminder={event} />
            </div>
          )}

          {/* TIMELINE TAB */}
          {activeTab === 'timeline' && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-800">Activity Log</h3>
                <p className="text-sm text-slate-500">Track all changes and actions in this event.</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                {loadingLogs ? (
                  <Skeleton type="list-item" />
                ) : logs.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Activity size={40} className="mx-auto mb-3 text-slate-200" />
                    <p>No activity recorded yet.</p>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-slate-100 ml-3 space-y-8">
                    {logs.map((log, index) => {
                      let Icon = Activity;
                      let colorClass = "bg-slate-100 text-slate-500";
                      
                      if (log.actionType.includes('TASK')) {
                        Icon = CheckSquare;
                        colorClass = "bg-blue-100 text-blue-600";
                        if (log.actionType === 'TASK_COMPLETED') colorClass = "bg-green-100 text-green-600";
                      } else if (log.actionType.includes('MEMBER') || log.actionType.includes('ROLE')) {
                        Icon = Users;
                        colorClass = "bg-purple-100 text-purple-600";
                      } else if (log.actionType.includes('EVENT')) {
                        Icon = Settings;
                        colorClass = "bg-orange-100 text-orange-600";
                      }

                      return (
                        <div key={log._id} className="relative pl-6">
                          <div className={`absolute -left-[17px] top-1 w-8 h-8 rounded-full flex items-center justify-center border-4 border-white ${colorClass}`}>
                            <Icon size={14} />
                          </div>
                          
                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-slate-200 transition-colors">
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-sm font-medium text-slate-900">{log.description}</p>
                              <span className="text-[10px] text-slate-400 whitespace-nowrap ml-4">
                                {new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-2">
                              {log.user?.profileImage ? (
                                <img src={log.user.profileImage} alt="" className="w-4 h-4 rounded-full object-cover" />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center">
                                  <span className="text-[8px] font-bold text-slate-600">{log.user?.name?.charAt(0)}</span>
                                </div>
                              )}
                              <span className="text-xs text-slate-500">by {log.user?.name}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* POLLS TAB */}
          {activeTab === 'polls' && (
            <div className="max-w-2xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Team Polls</h3>
                  <p className="text-sm text-slate-500">Vote on decisions together.</p>
                </div>
                <button 
                  onClick={() => setShowPollForm(!showPollForm)} 
                  className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  {showPollForm ? <X size={16} /> : <Plus size={16} />}
                  {showPollForm ? 'Cancel' : 'New Poll'}
                </button>
              </div>

              {showPollForm && (
                <div className="bg-white rounded-2xl p-6 border border-primary-200 shadow-sm mb-6 animate-in slide-in-from-top-4">
                  <h4 className="font-semibold text-slate-800 mb-4">Create a New Poll</h4>
                  <form onSubmit={handleCreatePoll}>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Question</label>
                      <input 
                        type="text" 
                        value={newPoll.question} 
                        onChange={e => setNewPoll({...newPoll, question: e.target.value})} 
                        placeholder="e.g., What time should we meet?" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                        required
                      />
                    </div>
                    <div className="mb-4 space-y-3">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Options</label>
                      {newPoll.options.map((opt, i) => (
                        <div key={i} className="flex gap-2">
                          <input 
                            type="text" 
                            value={opt} 
                            onChange={e => {
                              const newOpts = [...newPoll.options];
                              newOpts[i] = e.target.value;
                              setNewPoll({...newPoll, options: newOpts});
                            }} 
                            placeholder={`Option ${i + 1}`} 
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                            required={i < 2} // First two are required
                          />
                          {i >= 2 && (
                            <button type="button" onClick={() => setNewPoll({...newPoll, options: newPoll.options.filter((_, idx) => idx !== i)})} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                              <X size={18} />
                            </button>
                          )}
                        </div>
                      ))}
                      {newPoll.options.length < 6 && (
                        <button type="button" onClick={() => setNewPoll({...newPoll, options: [...newPoll.options, '']})} className="text-sm text-primary-600 font-medium hover:text-primary-700 flex items-center gap-1 mt-2">
                          <Plus size={14} /> Add Option
                        </button>
                      )}
                    </div>
                    <div className="flex justify-end pt-2">
                      <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
                        Create Poll
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-6">
                {loadingPolls ? (
                  <Skeleton type="card" />
                ) : polls.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
                    <BarChart size={40} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500">No polls have been created yet.</p>
                  </div>
                ) : (
                  polls.map(poll => {
                    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
                    const userVotedFor = poll.options.find(o => o.votes.includes(user.id))?._id;
                    const isCreator = poll.createdBy?._id === user.id;

                    return (
                      <div key={poll._id} className={`bg-white rounded-2xl border p-6 transition-all ${poll.isClosed ? 'border-slate-200 bg-slate-50/50 opacity-80' : 'border-slate-200 shadow-sm hover:shadow-md'}`}>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-lg font-semibold text-slate-900">{poll.question}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-500">
                                Created by {poll.createdBy?.name} • {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                              </span>
                              {poll.isClosed && (
                                <span className="text-[10px] uppercase tracking-wider font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                                  Closed
                                </span>
                              )}
                            </div>
                          </div>
                          {(isAdmin || isCreator) && (
                            <div className="flex items-center gap-1">
                              {!poll.isClosed && (
                                <button onClick={() => handleClosePoll(poll._id)} className="text-xs font-medium text-slate-500 hover:text-amber-600 px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors">
                                  Close
                                </button>
                              )}
                              <button onClick={() => handleDeletePoll(poll._id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          {poll.options.map(opt => {
                            const voteCount = opt.votes.length;
                            const percentage = totalVotes === 0 ? 0 : Math.round((voteCount / totalVotes) * 100);
                            const isSelected = userVotedFor === opt._id;

                            return (
                              <button 
                                key={opt._id}
                                disabled={poll.isClosed}
                                onClick={() => handleVotePoll(poll._id, isSelected ? null : opt._id)}
                                className={`w-full relative overflow-hidden rounded-xl border text-left transition-all ${
                                  isSelected 
                                    ? 'border-primary-500 bg-primary-50/50' 
                                    : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
                                } ${poll.isClosed ? 'cursor-default pointer-events-none' : ''}`}
                              >
                                {/* Progress Bar Background */}
                                <div 
                                  className={`absolute top-0 left-0 bottom-0 transition-all duration-500 ease-out ${isSelected ? 'bg-primary-100/70' : 'bg-slate-100'}`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                                
                                {/* Content */}
                                <div className="relative z-10 flex justify-between items-center px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'border-primary-600 bg-primary-600' : 'border-slate-300'}`}>
                                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                                    </div>
                                    <span className={`font-medium ${isSelected ? 'text-primary-900' : 'text-slate-700'}`}>{opt.text}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {opt.votes.length > 0 && (
                                      <div className="flex -space-x-2 mr-2">
                                        {opt.votes.slice(0, 3).map((vId, i) => {
                                          const vMember = members.find(m => m.userId?._id === vId);
                                          return vMember?.userId?.profileImage ? (
                                            <img key={i} src={vMember.userId.profileImage} className="w-5 h-5 rounded-full border border-white" alt="" title={vMember.userId.name} />
                                          ) : (
                                            <div key={i} className="w-5 h-5 rounded-full border border-white bg-slate-200 flex items-center justify-center" title={vMember?.userId?.name}>
                                              <span className="text-[8px] font-bold text-slate-600">{vMember?.userId?.name?.charAt(0) || '?'}</span>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}
                                    <span className={`font-medium ${isSelected ? 'text-primary-700' : 'text-slate-500'}`}>{percentage}%</span>
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* LOCATION TAB */}
          {activeTab === 'location' && (
            <div className="max-w-3xl mx-auto h-[calc(100vh-180px)] md:h-[calc(100vh-240px)] flex flex-col">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-800">Event Location</h3>
                <p className="text-sm text-slate-500">Where this event is taking place.</p>
              </div>

              {!event.location ? (
                <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 border-dashed flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                    <MapPin size={24} className="text-slate-400" />
                  </div>
                  <h4 className="text-lg font-medium text-slate-700 mb-1">No Location Set</h4>
                  <p className="text-slate-500 max-w-sm">This event doesn't have a specific physical location attached to it.</p>
                </div>
              ) : (
                <div className="flex flex-col h-full gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center flex-shrink-0">
                        <MapPin size={20} className="text-primary-600" />
                      </div>
                      <p className="font-medium text-slate-800 truncate" title={event.location}>{event.location}</p>
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(event.location);
                        toast.success('Location copied to clipboard');
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                    >
                      Copy Address
                    </button>
                  </div>
                  
                  <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 relative min-h-[300px]">
                    <iframe 
                      width="100%" 
                      height="100%" 
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps?q=${encodeURIComponent(event.location)}&output=embed`}
                    ></iframe>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default EventDetails;
