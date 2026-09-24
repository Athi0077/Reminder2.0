import { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { SocketContext } from '../context/SocketContext';
import AlarmModal from './AlarmModal';
import toast from 'react-hot-toast';

const AlarmManager = () => {
  const [activeAlarms, setActiveAlarms] = useState([]);
  const { socket } = useContext(SocketContext);

  useEffect(() => {
    if (socket) {
      const handleTrigger = (payload) => {
        // Add to active alarms if not already present
        setActiveAlarms(prev => {
          if (prev.find(a => a.reminderId === payload.reminderId)) return prev;
          return [...prev, payload];
        });

        // Trigger system notification if permitted
        if (Notification.permission === 'granted') {
          new Notification('Reminder: ' + payload.title, {
            body: 'It is time for your reminder.',
            icon: '/vite.svg', // Assuming vite logo as placeholder
            tag: payload.reminderId
          });
        }
      };

      socket.on('REMINDER_TRIGGERED', handleTrigger);
      return () => {
        socket.off('REMINDER_TRIGGERED', handleTrigger);
      };
    }
  }, [socket]);

  const handleSnooze = async (id, minutes) => {
    try {
      await axios.post(`/reminders/${id}/snooze`, { snoozeMinutes: minutes });
      setActiveAlarms(prev => prev.filter(a => a.reminderId !== id));
      toast.success(`Snoozed for ${minutes} minutes`);
    } catch (err) {
      console.error('Failed to snooze', err);
      toast.error('Failed to snooze');
    }
  };

  const handleDismiss = async (id) => {
    try {
      await axios.post(`/reminders/${id}/dismiss`);
      setActiveAlarms(prev => prev.filter(a => a.reminderId !== id));
    } catch (err) {
      console.error('Failed to dismiss', err);
      toast.error('Failed to dismiss');
    }
  };

  if (activeAlarms.length === 0) return null;

  // Show the oldest active alarm
  const currentAlarm = activeAlarms[0];

  return (
    <AlarmModal 
      reminder={currentAlarm} 
      onSnooze={handleSnooze} 
      onDismiss={handleDismiss} 
    />
  );
};

export default AlarmManager;
