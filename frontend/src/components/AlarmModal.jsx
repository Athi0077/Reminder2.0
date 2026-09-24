import { useEffect } from 'react';
import { Bell, BellOff, Clock } from 'lucide-react';
import alarmService from '../services/alarmService';

const AlarmModal = ({ reminder, onSnooze, onDismiss }) => {
  useEffect(() => {
    // Play sound on mount
    alarmService.play(reminder?.sound);

    // Stop sound on unmount
    return () => {
      alarmService.stop();
    };
  }, [reminder]);

  if (!reminder) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-500 border-2 border-primary-100 flex flex-col items-center text-center">
        
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6 animate-bounce shadow-inner">
          <Bell size={40} className="animate-pulse" />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Reminder Alert</h2>
        
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 w-full mb-8">
          <h3 className="font-semibold text-lg text-slate-900 mb-1">{reminder.title}</h3>
          <p className="text-slate-500 text-sm flex items-center justify-center gap-2">
            <Clock size={14} /> 
            {new Date(reminder.date).toLocaleString()}
          </p>
        </div>
        
        <div className="flex w-full gap-3">
          <button 
            onClick={() => onSnooze(reminder.reminderId, reminder.snoozeMinutes)}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium py-3 px-4 rounded-xl transition-colors"
          >
            Snooze {reminder.snoozeMinutes || 5}m
          </button>
          
          <button 
            onClick={() => onDismiss(reminder.reminderId)}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-xl shadow-md transition-colors"
          >
            Dismiss
          </button>
        </div>

      </div>
    </div>
  );
};

export default AlarmModal;
