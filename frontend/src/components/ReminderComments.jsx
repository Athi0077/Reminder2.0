import { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { SocketContext } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import { Send, X } from 'lucide-react';
import toast from 'react-hot-toast';

const ReminderComments = ({ reminder, onClose }) => {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const { socket } = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchComments();
  }, [reminder._id]);

  useEffect(() => {
    if (socket) {
      const handleNewComment = (newComment) => {
        if (newComment.reminder === reminder._id) {
          setComments(prev => [...prev, newComment]);
        }
      };
      socket.on('new_comment', handleNewComment);
      
      return () => {
        socket.off('new_comment', handleNewComment);
      };
    }
  }, [socket, reminder._id]);

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchComments = async () => {
    try {
      const res = await axios.get(`/reminders/${reminder._id}/comments`);
      setComments(res.data);
    } catch (err) {
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      const res = await axios.post(`/reminders/${reminder._id}/comments`, { text });
      setComments(prev => [...prev, res.data]);
      setText('');
    } catch (err) {
      toast.error('Failed to send comment');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
      <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[60vh] md:max-h-full">
        {loading ? (
          <p className="text-center text-slate-400 text-sm">Loading...</p>
        ) : comments.length === 0 ? (
          <p className="text-center text-slate-400 text-sm italic py-8">No comments yet. Start the discussion!</p>
        ) : (
          comments.map((comment) => {
            const isMe = comment.user._id === user._id;
            return (
              <div key={comment._id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isMe && (
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex-shrink-0 flex items-center justify-center text-primary-700 font-bold text-xs">
                    {comment.user.name.charAt(0)}
                  </div>
                )}
                <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && <span className="text-[10px] text-slate-500 ml-1 mb-0.5">{comment.user.name}</span>}
                  <div className={`px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm shadow-sm'}`}>
                    {comment.text}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 px-1">{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white p-3 border-t border-slate-200">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-slate-100 border-transparent focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 rounded-full px-4 py-2 text-sm outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="bg-primary-600 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-primary-700 disabled:opacity-50 disabled:hover:bg-primary-600 transition-colors"
          >
            <Send size={16} className="-ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReminderComments;
