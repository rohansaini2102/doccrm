import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      const response = await axios.get('http://localhost:5000/api/appointments', {
        params: {
          date: format(selectedDate, 'yyyy-MM-dd')
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // FIX: Access the appointments array from the response object
      if (response.data && response.data.success) {
        setAppointments(response.data.appointments || []);
      } else {
        console.error('Unexpected API response structure:', response.data);
        setAppointments([]);
        setError('Unexpected response from server');
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError('Failed to fetch appointments');
      setAppointments([]); // Ensure appointments is always an array
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await axios.patch(`http://localhost:5000/api/appointments/${id}`, { status }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      fetchAppointments();
    } catch (err) {
      console.error('Error updating appointment status:', err);
      setError('Failed to update appointment status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
        <input
          type="date"
          value={format(selectedDate, 'yyyy-MM-dd')}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          className="input-field"
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-4">Loading...</div>
      ) : !Array.isArray(appointments) ? (
        <div className="text-center py-4 text-red-500">
          Error: Invalid data format received from server
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          No appointments found for this date
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {appointments.map((appointment) => (
              <li key={appointment._id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 text-lg">
                            {appointment.patient?.name?.charAt(0) || '?'}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {appointment.patient?.name || 'Unknown Patient'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {appointment.date ? 
                            format(new Date(appointment.date), 'h:mm a') : 
                            'Time not set'
                          }
                        </div>
                        {appointment.patient?.email && (
                          <div className="text-xs text-gray-400">
                            {appointment.patient.email}
                          </div>
                        )}
                        {appointment.patient?.phone && (
                          <div className="text-xs text-gray-400">
                            {appointment.patient.phone}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          appointment.status
                        )}`}
                      >
                        {appointment.status}
                      </span>
                      <select
                        value={appointment.status}
                        onChange={(e) => handleStatusChange(appointment._id, e.target.value)}
                        className="input-field text-sm"
                      >
                        <option value="pending">Pending</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                  {appointment.message && (
                    <div className="mt-2 text-sm text-gray-600">
                      <strong>Message:</strong> {appointment.message}
                    </div>
                  )}
                  {appointment.notes && (
                    <div className="mt-1 text-sm text-gray-600">
                      <strong>Notes:</strong> {appointment.notes}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Appointments;