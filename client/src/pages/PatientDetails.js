import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [visitData, setVisitData] = useState({
    problem: '',
    diagnosis: '',
    prescription: {
      startDate: '',
      endDate: '',
      medicines: [],
      revisitRequired: false
    }
  });
  const [currentMedicine, setCurrentMedicine] = useState({
    medicineName: '',
    timings: {
      morning: false,
      afternoon: false,
      evening: false
    }
  });
  const [expandedVisit, setExpandedVisit] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(5);
  const [totalVisits, setTotalVisits] = useState(0);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    fetchPatient();
  }, [id, page]);

  const fetchPatient = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Validate ID before making request
      if (!id || id === 'undefined') {
        setError('Invalid patient ID');
        setLoading(false);
        return;
      }

      console.log('Fetching patient with ID:', id);
      
      const response = await axios.get(`${API_BASE_URL}/api/patients/${id}?page=${page}&limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('Patient details response:', response.data);

      // FIX: Handle structured API response
      if (response.data && response.data.success && response.data.patient) {
        setPatient(response.data.patient);
        setTotalVisits(response.data.patient.totalVisits || response.data.patient.visits?.length || 0);
      } else if (response.data && !response.data.success) {
        setError(response.data.message || 'Failed to fetch patient');
      } else {
        // Fallback for direct patient object response
        if (response.data && response.data._id) {
          setPatient(response.data);
          setTotalVisits(response.data.totalVisits || response.data.visits?.length || 0);
        } else {
          setError('Invalid response format from server');
        }
      }
    } catch (err) {
      console.error('Error fetching patient:', err);
      if (err.response?.status === 404) {
        setError('Patient not found');
      } else if (err.response?.status === 400) {
        setError(err.response.data?.message || 'Invalid patient ID');
      } else {
        setError('Failed to fetch patient details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVisitChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('prescription.')) {
      const field = name.split('.')[1];
      setVisitData(prev => ({
        ...prev,
        prescription: {
          ...prev.prescription,
          [field]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setVisitData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleMedicineChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('timings.')) {
      const timing = name.split('.')[1];
      setCurrentMedicine(prev => ({
        ...prev,
        timings: {
          ...prev.timings,
          [timing]: checked
        }
      }));
    } else {
      setCurrentMedicine(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const addMedicine = () => {
    if (currentMedicine.medicineName.trim()) {
      setVisitData(prev => ({
        ...prev,
        prescription: {
          ...prev.prescription,
          medicines: [...prev.prescription.medicines, {
            ...currentMedicine,
            medicineName: currentMedicine.medicineName.trim()
          }]
        }
      }));
      setCurrentMedicine({
        medicineName: '',
        timings: {
          morning: false,
          afternoon: false,
          evening: false
        }
      });
    }
  };

  const removeMedicine = (index) => {
    setVisitData(prev => ({
      ...prev,
      prescription: {
        ...prev.prescription,
        medicines: prev.prescription.medicines.filter((_, i) => i !== index)
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Submitting visit data:', visitData);
      
      const response = await axios.post(`${API_BASE_URL}/api/patients/${id}/visits`, visitData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('Visit creation response:', response.data);

      if (response.data && response.data.success) {
        showToast('Visit added successfully', 'success');
        setShowVisitForm(false);
        setVisitData({
          problem: '',
          diagnosis: '',
          prescription: {
            startDate: '',
            endDate: '',
            medicines: [],
            revisitRequired: false
          }
        });
        fetchPatient();
      } else {
        throw new Error(response.data?.message || 'Failed to add visit');
      }
    } catch (err) {
      console.error('Error adding visit:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to add visit record';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    }
  };

  // Toast helpers
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  // Collapsible card toggle
  const toggleVisit = (visitId) => {
    setExpandedVisit(expandedVisit === visitId ? null : visitId);
  };

  // Pagination
  const loadMore = () => {
    if (patient && patient.visits && patient.visits.length < totalVisits) {
      setPage(page + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
            <div className="mt-4">
              <button
                onClick={() => navigate('/patients')}
                className="btn-secondary mr-2"
              >
                Back to Patients
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn-primary"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-100 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Patient not found</h1>
            <button
              onClick={() => navigate('/patients')}
              className="btn-primary"
            >
              Back to Patients
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="flex items-center mb-2">
                <button
                  onClick={() => navigate('/patients')}
                  className="mr-4 text-gray-500 hover:text-gray-700"
                >
                  ← Back
                </button>
                <h1 className="text-2xl font-bold text-gray-900">{patient.fullName || 'Unknown Patient'}</h1>
              </div>
              <div className="text-gray-500 space-y-1">
                <p>{patient.age ? `${patient.age} years` : 'Age not specified'} • {patient.gender || 'Gender not specified'}</p>
                <p>📞 {patient.phone || 'No phone provided'}</p>
                <p>📧 {patient.email || 'No email provided'}</p>
                <p>📍 {patient.address || 'No address provided'}</p>
                <p className="text-sm">Patient since: {patient.onboardingDate ? new Date(patient.onboardingDate).toLocaleDateString() : 'Unknown'}</p>
              </div>
            </div>
            <button
              onClick={() => setShowVisitForm(true)}
              className="btn-primary"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              New Visit
            </button>
          </div>

          {toast.show && (
            <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-white ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
              {toast.message}
            </div>
          )}

          {showVisitForm && (
            <form onSubmit={handleSubmit} className="mb-8 bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-medium mb-4">New Visit Record</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Problem/Chief Complaint <span className="text-red-500">*</span></label>
                  <textarea
                    name="problem"
                    required
                    rows="3"
                    className="input-field mt-1"
                    value={visitData.problem}
                    onChange={handleVisitChange}
                    placeholder="Describe the patient's problem or chief complaint"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Diagnosis <span className="text-red-500">*</span></label>
                  <textarea
                    name="diagnosis"
                    required
                    rows="3"
                    className="input-field mt-1"
                    value={visitData.diagnosis}
                    onChange={handleVisitChange}
                    placeholder="Enter your diagnosis"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prescription Start Date</label>
                    <input
                      type="date"
                      name="prescription.startDate"
                      className="input-field mt-1"
                      value={visitData.prescription.startDate}
                      onChange={handleVisitChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prescription End Date</label>
                    <input
                      type="date"
                      name="prescription.endDate"
                      className="input-field mt-1"
                      value={visitData.prescription.endDate}
                      onChange={handleVisitChange}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Add Medicine</label>
                  <div className="mt-1 space-y-4">
                    <div className="flex space-x-4">
                      <input
                        type="text"
                        name="medicineName"
                        placeholder="Medicine name"
                        className="input-field flex-1"
                        value={currentMedicine.medicineName}
                        onChange={handleMedicineChange}
                      />
                      <button
                        type="button"
                        onClick={addMedicine}
                        className="btn-secondary"
                        disabled={!currentMedicine.medicineName.trim()}
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex items-center space-x-4">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          name="timings.morning"
                          className="rounded border-gray-300"
                          checked={currentMedicine.timings.morning}
                          onChange={handleMedicineChange}
                        />
                        <span className="ml-2">Morning</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          name="timings.afternoon"
                          className="rounded border-gray-300"
                          checked={currentMedicine.timings.afternoon}
                          onChange={handleMedicineChange}
                        />
                        <span className="ml-2">Afternoon</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          name="timings.evening"
                          className="rounded border-gray-300"
                          checked={currentMedicine.timings.evening}
                          onChange={handleMedicineChange}
                        />
                        <span className="ml-2">Evening</span>
                      </label>
                    </div>
                  </div>
                </div>

                {visitData.prescription.medicines.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700">Added Medicines</h3>
                    <ul className="mt-2 space-y-2">
                      {visitData.prescription.medicines.map((med, index) => (
                        <li key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                          <div>
                            <span className="font-medium">{med.medicineName}</span>
                            <div className="flex space-x-2 mt-1">
                              {med.timings.morning && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Morning</span>}
                              {med.timings.afternoon && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Afternoon</span>}
                              {med.timings.evening && <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Evening</span>}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMedicine(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="prescription.revisitRequired"
                    className="rounded border-gray-300"
                    checked={visitData.prescription.revisitRequired}
                    onChange={handleVisitChange}
                  />
                  <label className="ml-2 text-sm text-gray-700">Schedule follow-up appointment</label>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowVisitForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    Save Visit
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="space-y-4">
            <h2 className="text-lg font-medium">Visit History ({totalVisits} total)</h2>
            {!patient.visits || patient.visits.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No visits recorded yet.</p>
                <button
                  onClick={() => setShowVisitForm(true)}
                  className="mt-2 btn-primary"
                >
                  Add First Visit
                </button>
              </div>
            ) : (
              <>
                {patient.visits.map((visit, index) => {
                  const isLatest = index === 0;
                  return (
                    <div key={visit._id} className="bg-gray-50 rounded-lg mb-2">
                      <button
                        className="w-full text-left p-4 flex justify-between items-center focus:outline-none hover:bg-gray-100 transition-colors"
                        onClick={() => toggleVisit(visit._id)}
                      >
                        <div>
                          <span className="text-sm text-gray-500">
                            {new Date(visit.date).toLocaleString()}
                          </span>
                          <span className="ml-2 text-xs text-gray-400">#{visit._id.slice(-6)}</span>
                          <h3 className="text-lg font-medium mt-1">{visit.problem}</h3>
                        </div>
                        <div className="flex items-center space-x-2">
                          {visit.prescription?.revisitRequired && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Follow-up Required
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {visit.createdBy ? `Dr.` : ''}
                          </span>
                          <svg className={`w-5 h-5 ml-2 transform transition-transform ${expandedVisit === visit._id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>
                      {expandedVisit === visit._id && (
                        <div className="p-4 border-t border-gray-200">
                          <div className="mb-3">
                            <h4 className="font-semibold text-gray-900">Diagnosis</h4>
                            <p className="text-gray-700">{visit.diagnosis}</p>
                          </div>
                          {visit.prescription?.medicines && visit.prescription.medicines.length > 0 && (
                            <div className="mb-3">
                              <h4 className="font-semibold text-gray-900">Prescription</h4>
                              {(visit.prescription.startDate || visit.prescription.endDate) && (
                                <p className="text-sm text-gray-500 mb-2">
                                  {visit.prescription.startDate && `From: ${new Date(visit.prescription.startDate).toLocaleDateString()}`}
                                  {visit.prescription.endDate && ` To: ${new Date(visit.prescription.endDate).toLocaleDateString()}`}
                                </p>
                              )}
                              <ul className="space-y-2">
                                {visit.prescription.medicines.map((med, medIndex) => (
                                  <li key={medIndex} className="flex items-center justify-between bg-white p-3 rounded border">
                                    <span className="font-medium">{med.medicineName}</span>
                                    <div className="flex space-x-2">
                                      {med.timings?.morning && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Morning</span>}
                                      {med.timings?.afternoon && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Afternoon</span>}
                                      {med.timings?.evening && <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Evening</span>}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {patient.visits.length < totalVisits && (
                  <button className="btn-secondary w-full" onClick={loadMore}>
                    Load More Visits
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientDetails;