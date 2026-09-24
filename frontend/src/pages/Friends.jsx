import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { UserPlus, MessageSquare, Check, X as XIcon, Search } from 'lucide-react';
import { SocketContext } from '../context/SocketContext';
import Skeleton from '../components/Skeleton';
import toast from 'react-hot-toast';

const Friends = () => {
  const [activeTab, setActiveTab] = useState('friends');
  const [friendsData, setFriendsData] = useState({ friends: [], received: [], sent: [] });
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { socket } = useContext(SocketContext);

  useEffect(() => {
    fetchFriends();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('friend_request_received', () => {
        fetchFriends(); // Refresh lists
      });
      socket.on('friend_request_accepted', () => {
        fetchFriends();
      });
      socket.on('friend_removed', () => {
        fetchFriends();
      });
    }
    return () => {
      if (socket) {
        socket.off('friend_request_received');
        socket.off('friend_request_accepted');
        socket.off('friend_removed');
      }
    }
  }, [socket]);

  const fetchFriends = async () => {
    try {
      const res = await axios.get('/friends');
      setFriendsData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery) {
        performSearch(searchQuery);
      } else {
        if (activeTab === 'search') setActiveTab('friends');
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const performSearch = async (query) => {
    try {
      const res = await axios.get(`/friends/search?q=${query}`);
      setSearchResults(res.data);
      setActiveTab('search');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery) performSearch(searchQuery);
  };

  const sendRequest = async (id) => {
    try {
      await axios.post(`/friends/request/${id}`);
      fetchFriends();
    } catch (err) {
      alert(err.response?.data?.message || 'Error sending request');
    }
  };

  const acceptRequest = async (id) => {
    try {
      await axios.post(`/friends/accept/${id}`);
      toast.success('Request accepted!');
      fetchFriends();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error accepting request');
    }
  };

  const rejectRequest = async (id) => {
    try {
      await axios.post(`/friends/reject/${id}`);
      fetchFriends();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error rejecting request');
    }
  };

  const removeFriend = async (id) => {
    if (!window.confirm('Remove friend?')) return;
    try {
      await axios.delete(`/friends/remove/${id}`);
      fetchFriends();
    } catch (err) {
      console.error(err);
    }
  };

  const renderUserCard = (user, actions) => (
    <div key={user._id} className="bg-white p-6 rounded-2xl border border-slate-200 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg">
          {user.name.charAt(0)}
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">{user.name}</h3>
          <p className="text-sm text-slate-500">{user.email}</p>
        </div>
      </div>
      <div className="mt-6 flex gap-2">
        {actions}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Friends</h1>
          <p className="text-slate-500 mt-1">Connect with others and share tasks.</p>
        </div>
        <form onSubmit={handleSearch} className="relative flex-1 sm:max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..." 
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          />
        </form>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-1">
        <button onClick={() => setActiveTab('friends')} className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'friends' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500 hover:text-slate-800'}`}>My Friends ({friendsData.friends.length})</button>
        <button onClick={() => setActiveTab('received')} className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'received' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500 hover:text-slate-800'}`}>Requests ({friendsData.received.length})</button>
        {activeTab === 'search' && <button className="px-4 py-2 font-medium text-sm text-primary-600 border-b-2 border-primary-600">Search Results</button>}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton type="card" />
          <Skeleton type="card" />
          <Skeleton type="card" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === 'friends' && friendsData.friends.length === 0 && <p className="col-span-full text-slate-500 text-center py-12 bg-white rounded-2xl border border-slate-200">No friends yet.</p>}
          {activeTab === 'friends' && friendsData.friends.map(friend => 
            renderUserCard(friend, (
              <>
                <button className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors flex justify-center items-center gap-2">
                  <MessageSquare size={16} /> Message
                </button>
                <button onClick={() => removeFriend(friend._id)} className="px-3 py-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                  <XIcon size={18} />
                </button>
              </>
            ))
          )}

          {activeTab === 'received' && friendsData.received.length === 0 && <p className="col-span-full text-slate-500 text-center py-12 bg-white rounded-2xl border border-slate-200">No pending requests.</p>}
          {activeTab === 'received' && friendsData.received.map(user => 
            renderUserCard(user, (
              <>
                <button onClick={() => acceptRequest(user._id)} className="flex-1 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors flex justify-center items-center gap-2">
                  <Check size={16} /> Accept
                </button>
                <button onClick={() => rejectRequest(user._id)} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex justify-center items-center gap-2">
                  <XIcon size={16} /> Reject
                </button>
              </>
            ))
          )}

          {activeTab === 'search' && searchResults.length === 0 && <p className="col-span-full text-slate-500 text-center py-12 bg-white rounded-2xl border border-slate-200">No users found.</p>}
          {activeTab === 'search' && searchResults.map(user => 
            renderUserCard(user, (
              <>
                {user.relationship === 'none' && (
                  <button onClick={() => {
                    sendRequest(user._id);
                    // Optimistic UI update
                    setSearchResults(prev => prev.map(u => u._id === user._id ? { ...u, relationship: 'pending_sent' } : u));
                  }} className="w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors flex justify-center items-center gap-2">
                    <UserPlus size={16} /> Add Friend
                  </button>
                )}
                {user.relationship === 'pending_sent' && (
                  <button disabled className="w-full py-2 bg-slate-100 text-slate-400 rounded-lg text-sm font-medium flex justify-center items-center gap-2 cursor-not-allowed">
                    <Check size={16} /> Request Sent
                  </button>
                )}
                {user.relationship === 'pending_received' && (
                  <button onClick={() => acceptRequest(user._id)} className="w-full py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors flex justify-center items-center gap-2">
                    <Check size={16} /> Accept Request
                  </button>
                )}
                {user.relationship === 'friends' && (
                  <button disabled className="w-full py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium flex justify-center items-center gap-2 cursor-default">
                    <Check size={16} /> Friends
                  </button>
                )}
              </>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Friends;
