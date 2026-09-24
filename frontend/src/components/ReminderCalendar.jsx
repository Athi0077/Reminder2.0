import { useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const ReminderCalendar = ({ reminders, onSelectEvent }) => {
  
  // Transform our MongoDB reminders into react-big-calendar events
  const events = useMemo(() => {
    return reminders.map(reminder => {
      const startDate = new Date(reminder.dateTime);
      // Give the event a visual 1-hour duration on the calendar
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); 
      
      return {
        id: reminder._id,
        title: reminder.title,
        start: startDate,
        end: endDate,
        resource: reminder,
      };
    });
  }, [reminders]);

  const eventStyleGetter = (event, start, end, isSelected) => {
    const reminder = event.resource;
    let backgroundColor = '#3b82f6'; // default blue
    let borderColor = '#2563eb';

    if (reminder.isCompleted) {
      backgroundColor = '#94a3b8'; // slate for completed
      borderColor = '#64748b';
    } else {
      switch (reminder.priority) {
        case 'High':
          backgroundColor = '#ef4444'; // red
          borderColor = '#dc2626';
          break;
        case 'Medium':
          backgroundColor = '#f59e0b'; // amber
          borderColor = '#d97706';
          break;
        case 'Low':
          backgroundColor = '#10b981'; // green
          borderColor = '#059669';
          break;
        default:
          break;
      }
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        opacity: reminder.isCompleted ? 0.6 : 1,
        color: 'white',
        border: '0px',
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: '6px',
        display: 'block',
        fontSize: '0.875rem',
        padding: '2px 6px',
      }
    };
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 h-[600px] shadow-sm animate-in fade-in zoom-in-95 duration-300">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={(event) => onSelectEvent(event.resource)}
        views={['month', 'week', 'day']}
        defaultView="month"
        popup
        tooltipAccessor={(e) => `${e.title}\n${e.resource.priority} Priority`}
      />
    </div>
  );
};

export default ReminderCalendar;
