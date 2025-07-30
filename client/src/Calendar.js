import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './Calendar.css';
import AddEventModal from './AddEventModal';
import EventDetailsModal from './EventDetailsModal';
import EditEventModal from './EditEventModal';

const localizer = momentLocalizer(moment);
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const MyCalendar = () => {
  const [events, setEvents] = useState([]);
  const [date, setDate] = useState(new Date());
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEditEventModal, setShowEditEventModal] = useState(false);

  const fetchEvents = useCallback(async (currentDate) => {
    try {
      const token = localStorage.getItem('token');
      const startOfMonth = moment(currentDate).startOf('month').toISOString();
      const endOfMonth = moment(currentDate).endOf('month').toISOString();

      const response = await fetch(`${API_BASE_URL}/api/calendar/events?timeMin=${startOfMonth}&timeMax=${endOfMonth}`, {
        headers: {
          'x-auth-token': token,
        },
      });

      if (!response.ok) {
        throw new Error('캘린더 이벤트를 가져오는 데 실패했습니다.');
      }

      const data = await response.json();
      const formattedEvents = data.map(event => ({
        id: event.id,
        title: event.summary,
        start: new Date(event.start.dateTime || event.start.date),
        end: new Date(event.end.dateTime || event.end.date),
        allDay: !event.start.dateTime,
        description: event.description,
        etag: event.etag,
      }));
      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    }
  }, []);

  useEffect(() => {
    fetchEvents(date);
  }, [date, fetchEvents]);

  const handleNavigate = (newDate) => {
    setDate(newDate);
  };

  const handleRefresh = () => {
    fetchEvents(date);
  };

  const handleAddEvent = (newEvent) => {
    fetchEvents(date);
    setShowAddEventModal(false);
  };

  const handleDeleteEvent = async (eventToDelete) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/calendar/events/${eventToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': token,
        },
      });

      if (!response.ok) {
        throw new Error('일정 삭제에 실패했습니다.');
      }

      alert('일정이 성공적으로 삭제되었습니다.');
      setSelectedEvent(null);
      fetchEvents(date);
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('일정 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
  };

  const handleEditEvent = (eventToEdit) => {
    setSelectedEvent(eventToEdit);
    setShowEditEventModal(true);
  };

  const handleUpdateEvent = (updatedEvent) => {
    fetchEvents(date);
    setShowEditEventModal(false);
    setSelectedEvent(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button
          onClick={() => setShowAddEventModal(true)}
          style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc', background: '#f0f0f0', marginRight: '10px' }}
        >
          + 일정 추가
        </button>
      </div>
      <div style={{ height: 700 }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ margin: '50px' }}
          onNavigate={handleNavigate}
          date={date}
          onSelectEvent={handleSelectEvent}
        />
      </div>
      {showAddEventModal && (
        <AddEventModal
          onClose={() => setShowAddEventModal(false)}
          onAddEvent={handleAddEvent}
        />
      )}
      {selectedEvent && !showEditEventModal && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={handleDeleteEvent}
          onEdit={handleEditEvent}
        />
      )}
      {showEditEventModal && (
        <EditEventModal
          event={selectedEvent}
          onClose={() => setShowEditEventModal(false)}
          onUpdateEvent={handleUpdateEvent}
        />
      )}
    </div>
  );
};

export default MyCalendar;