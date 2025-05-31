import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function NewPatient() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    age: '',
    gender: 'Male',
    phone: '',
    address: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      
      // Validate required fields
      if (!formData.fullName.trim() || !formData.age || !formData.phone.trim()) {
        throw new Error('Name, age, and phone are required');
      }

      console.log('Creating patient with data:', formData);
      
      const response = await axios.post(`${API_BASE_URL}/api/patients`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('Patient creation response:', response.data);

      // FIX: Handle structured API response
      if (response.data && response.data.success && response.data.patient) {
        console.log('Navigating to patient:', response.data.patient._id);
        navigate(`/patients/${response.data.patient._id}`);
      } else {
        // Fallback: try direct response
        if (response.data && response.data._id) {
          console.log('Fallback navigation to patient:', response.data._id);
          navigate(`/patients/${response.data._id}`);
        } else {
          throw new Error('Invalid response: No patient ID received');
        }
      }
    } catch (err) {
      console.error('Error creating patient:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white mx-8 md:mx-0 shadow rounded-3xl sm:p-10">
          <div className="max-w-md mx-auto">
            <div className="flex items-center space-x-5">
              <div className="block pl-2 font-semibold text-xl text-gray-700">
                <h2 className="leading-relaxed">New Patient</h2>
                <p className="text-sm text-gray-500 font-normal leading-relaxed">
                  Enter patient details below
                </p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="text-sm text-red-700">{error}</div>
                  </div>
                )}
                <div className="flex flex-col">
                  <label className="leading-loose">Full Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    className="input-field"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Enter patient's full name"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="leading-loose">Age <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    name="age"
                    required
                    min="0"
                    max="150"
                    className="input-field"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="Enter age"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="leading-loose">Gender <span className="text-red-500">*</span></label>
                  <select
                    name="gender"
                    required
                    className="input-field"
                    value={formData.gender}
                    onChange={handleChange}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="leading-loose">Phone <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    className="input-field"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="leading-loose">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="input-field"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter email address (optional)"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="leading-loose">Address <span className="text-red-500">*</span></label>
                  <textarea
                    name="address"
                    required
                    rows="3"
                    className="input-field"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter patient's address"
                  />
                </div>
              </div>
              <div className="pt-4 flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/patients')}
                  className="btn-secondary flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </div>
                  ) : (
                    'Create Patient'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewPatient;