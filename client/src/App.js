import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetails from './pages/PatientDetails';
import NewPatient from './pages/NewPatient';
import Appointments from './pages/Appointments';
import PrivateRoute from './components/PrivateRoute';
import BookAppointment from './pages/BookAppointment';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-100">
          <Navbar />
          <main className="py-10">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/patients"
                element={
                  <PrivateRoute>
                    <Patients />
                  </PrivateRoute>
                }
              />
              <Route
                path="/patients/new"
                element={
                  <PrivateRoute>
                    <NewPatient />
                  </PrivateRoute>
                }
              />
              <Route
                path="/patients/:id"
                element={
                  <PrivateRoute>
                    <PatientDetails />
                  </PrivateRoute>
                }
              />
              <Route
                path="/appointments"
                element={
                  <PrivateRoute>
                    <Appointments />
                  </PrivateRoute>
                }
              />
              <Route path="/book-appointment" element={<BookAppointment />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
    </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
