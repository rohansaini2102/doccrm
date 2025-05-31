import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { BellIcon } from '@heroicons/react/24/outline';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { io } from 'socket.io-client';

function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [socket, setSocket] = useState(null);
  const { logout } = useAuth();

  useEffect(() => {
    fetchData();
    fetchNotifications();
    initializeSocket();

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const initializeSocket = () => {
    console.log('🔌 Initializing Socket.IO connection...');
    const newSocket = io('http://localhost:5000', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server');
      newSocket.emit('join_doctor_room');
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from Socket.IO server');
    });

    // Listen for new notifications
    newSocket.on('notification', (notification) => {
      console.log('🔔 New notification received:', notification);
      
      // Add to notifications list
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Play notification sound if available
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => console.log('No notification sound file found'));
      } catch (error) {
        console.log('Cannot play notification sound');
      }

      // Show browser notification if permission is granted
      if (Notification.permission === 'granted') {
        new Notification('New Appointment Request', {
          body: notification.message,
          icon: '/favicon.ico'
        });
      }
    });

    newSocket.on('notification_read', ({ notificationId }) => {
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    });

    newSocket.on('all_notifications_read', () => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    });

    setSocket(newSocket);
  };

  // Request notification permissions
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [patientsRes, appointmentsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/patients', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('http://localhost:5000/api/appointments/upcoming', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      console.log('Dashboard - Patients response:', patientsRes.data);
      console.log('Dashboard - Appointments response:', appointmentsRes.data);

      // Handle structured API responses
      if (patientsRes.data && patientsRes.data.success) {
        setPatients(patientsRes.data.patients || []);
      } else if (Array.isArray(patientsRes.data)) {
        setPatients(patientsRes.data);
      } else {
        console.error('Unexpected patients response structure:', patientsRes.data);
        setPatients([]);
      }

      if (appointmentsRes.data && appointmentsRes.data.success) {
        setAppointments(appointmentsRes.data.appointments || []);
      } else if (Array.isArray(appointmentsRes.data)) {
        setAppointments(appointmentsRes.data);
      } else {
        console.error('Unexpected appointments response structure:', appointmentsRes.data);
        setAppointments([]);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
      setPatients([]);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/notifications', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data && response.data.success) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchData();
      return;
    }

    try {
      const response = await axios.get(`http://localhost:5000/api/patients/search?query=${searchQuery}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      console.log('Search response:', response.data);

      if (response.data && response.data.success) {
        setPatients(response.data.patients || []);
      } else if (Array.isArray(response.data)) {
        setPatients(response.data);
      } else {
        console.error('Unexpected search response structure:', response.data);
        setPatients([]);
      }
    } catch (error) {
      console.error('Error searching patients:', error);
      setError('Failed to search patients');
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await axios.patch(`http://localhost:5000/api/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await axios.patch('http://localhost:5000/api/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const formatNotificationTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">Doctor's Clinic CRM</h1>
              </div>
            </div>
            <div className="flex items-center">
              <Link
                to="/patients"
                className="mr-4 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                All Patients
              </Link>
              <Link
                to="/appointments"
                className="mr-4 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Appointments
              </Link>
              <button
                onClick={logout}
                className="ml-4 btn-secondary"
              >
                Logout
              </button>
              
              {/* Notification Bell */}
              <div className="relative ml-4">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <BellIcon className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full px-2 py-1 text-xs font-bold min-w-[20px] h-5 flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllNotificationsAsRead}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      
                      {notifications.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No notifications</p>
                      ) : (
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.slice(0, 10).map((notification) => (
                            <div
                              key={notification._id}
                              className={`p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                                !notification.read ? 'bg-blue-50' : ''
                              }`}
                              onClick={() => {
                                if (!notification.read) {
                                  markNotificationAsRead(notification._id);
                                }
                              }}
                            >
                              <div className="flex items-start space-x-3">
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm ${!notification.read ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {formatNotificationTime(notification.createdAt)}
                                  </p>
                                </div>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Error display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2">
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {error}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Search and New Patient */}
              <div className="lg:col-span-2">
                <div className="bg-white shadow rounded-lg p-6">
                  <form onSubmit={handleSearch} className="flex space-x-4 mb-6">
                    <div className="flex-1">
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Search patients by name or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn-primary">
                      <MagnifyingGlassIcon className="h-5 w-5" />
                    </button>
                  </form>

                  <div className="flex space-x-4 mb-6">
                    <Link to="/patients/new" className="btn-primary flex-1 text-center">
                      New Patient
                    </Link>
                    <Link to="/patients" className="btn-secondary flex-1 text-center">
                      View All Patients
                    </Link>
                  </div>

                  <div className="mt-6">
                    <h2 className="text-lg font-medium text-gray-900">Recent Patients</h2>
                    <div className="mt-4 space-y-4">
                      {!Array.isArray(patients) ? (
                        <div className="text-red-500 text-sm">Error: Invalid patient data format</div>
                      ) : patients.length === 0 ? (
                        <div className="text-gray-500 text-center py-4">
                          {searchQuery ? 'No patients found matching your search.' : 'No patients found.'}
                        </div>
                      ) : (
                        patients.slice(0, 5).map((patient) => (
                          <Link
                            key={patient._id}
                            to={`/patients/${patient._id}`}
                            className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {patient.fullName || 'Unknown Name'}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {patient.phone || 'No phone'}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {patient.email || 'No email'}
                                </p>
                              </div>
                              <div className="text-sm text-gray-500">
                                <div>{patient.age ? `${patient.age} years` : 'Age not set'}</div>
                                <div className="text-xs">
                                  {patient.onboardingDate ? 
                                    new Date(patient.onboardingDate).toLocaleDateString() : 
                                    'Date unknown'
                                  }
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Upcoming Appointments */}
              <div className="lg:col-span-1">
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900">Upcoming Appointments</h2>
                    <Link to="/appointments">
                      <BellIcon className="h-6 w-6 text-gray-400 hover:text-gray-600" />
                    </Link>
                  </div>
                  <div className="space-y-4">
                    {!Array.isArray(appointments) ? (
                      <div className="text-red-500 text-sm">Error: Invalid appointment data format</div>
                    ) : appointments.length === 0 ? (
                      <div className="text-gray-500 text-center py-4">
                        No upcoming appointments
                      </div>
                    ) : (
                      appointments.map((appointment) => (
                        <div key={appointment._id} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {appointment.patient?.name || appointment.patient?.fullName || 'Unknown Patient'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {appointment.date ? 
                                  new Date(appointment.date).toLocaleDateString() : 
                                  'Date not set'
                                } 
                                {appointment.time && ` at ${appointment.time}`}
                              </p>
                              <p className="text-xs text-gray-400">
                                {appointment.patient?.phone || 'No phone'}
                              </p>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                              appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {appointment.status || 'Pending'}
                            </span>
                          </div>
                          {appointment.message && (
                            <p className="text-xs text-gray-500 mt-2 truncate">
                              {appointment.message}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  {appointments.length > 0 && (
                    <div className="mt-4">
                      <Link 
                        to="/appointments" 
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View all appointments →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Click outside to close notifications */}
      {showNotifications && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowNotifications(false)}
        ></div>
      )}
    </div>
  );
}

export default Dashboard;