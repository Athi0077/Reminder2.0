import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

const JoinReminder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Joining reminder...');

  useEffect(() => {
    const joinReminder = async () => {
      try {
        const res = await axios.post(`/reminders/${id}/join`);
        if (res.status === 202) {
          toast.success(res.data.message);
        } else if (res.data.message === 'Already a member') {
          toast('You are already a member of this reminder', { icon: 'ℹ️' });
        } else {
          toast.success('Successfully joined the reminder!');
        }
        navigate('/reminders', { replace: true });
      } catch (err) {
        console.error(err);
        toast.error(err.response?.data?.message || 'Failed to join reminder');
        navigate('/dashboard', { replace: true });
      }
    };

    joinReminder();
  }, [id, navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-[80vh]">
      <Loader2 className="animate-spin text-primary-600 mb-4" size={48} />
      <h2 className="text-xl font-semibold text-slate-800">{status}</h2>
      <p className="text-slate-500 mt-2">Please wait while we set things up...</p>
    </div>
  );
};

export default JoinReminder;
