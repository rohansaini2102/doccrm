import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { PlusIcon } from '@heroicons/react/24/outline';

const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      const response = await axios.get('http://localhost:5000/api/patients', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // FIX: Access the patients array from the response object
      if (response.data && response.data.success) {
        setPatients(response.data.patients || []);
      } else {
        console.error('Unexpected API response structure:', response.data);
        setPatients([]);
        setError('Unexpected response from server');
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError('Failed to fetch patients');
      setPatients([]); // Ensure patients is always an array
    } finally {
      setLoading(false);
    }
  };

  // Safe filtering with array check
  const filteredPatients = Array.isArray(patients) ? patients.filter(patient =>
    patient.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Patients</h1>
        <Link
          to="/patients/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          Add Patient
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          {error}
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search patients by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2"
        />
      </div>

      {!Array.isArray(patients) ? (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          Error: Invalid data format received from server
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-500">
            {searchTerm ? 'No patients found matching your search.' : 'No patients found.'}
          </div>
          {!searchTerm && (
            <Link
              to="/patients/new"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Add Your First Patient
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredPatients.map((patient) => (
              <li key={patient._id}>
                <Link
                  to={`/patients/${patient._id}`}
                  className="block hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-lg">
                              {patient.fullName?.charAt(0) || '?'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-blue-600 truncate">
                            {patient.fullName || 'Unknown Name'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {patient.email || 'No email provided'}
                          </p>
                        </div>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex flex-col items-end">
                        <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {patient.age ? `${patient.age} years` : 'Age not specified'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {patient.gender || 'Gender not specified'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          📞 {patient.phone || 'No phone provided'}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <p className="truncate max-w-xs">
                          📍 {patient.address || 'No address provided'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center text-xs text-gray-400">
                      <p>
                        Patient since: {patient.onboardingDate ? new Date(patient.onboardingDate).toLocaleDateString() : 'Unknown'}
                      </p>
                      <span className="mx-2">•</span>
                      <p>
                        Visits: {patient.visits?.length || 0}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Show total count */}
      {filteredPatients.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          Showing {filteredPatients.length} of {patients.length} patients
          {searchTerm && ` matching "${searchTerm}"`}
        </div>
      )}
    </div>
  );
};

export default Patients;